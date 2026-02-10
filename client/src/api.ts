import { getDb, saveDb, resetDatabase } from "./db";

function getCurrentUserId(): number {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");
  return parseInt(token);
}

function nameToEmail(name: string): string {
  const slug = name.trim().toLowerCase().replace(/\s+/g, ".");
  const domain = slug === "zack.burgess" ? "hey.com" : "company.com";
  return `${slug}@${domain}`;
}

function queryOne<T>(sql: string, params: unknown[] = []): T | null {
  const db = getDb();
  const result = db.exec(sql, params as (string | number | null | Uint8Array)[]);
  if (!result.length || !result[0].values.length) return null;
  const row = result[0];
  const obj: Record<string, unknown> = {};
  row.columns.forEach((col: string, i: number) => {
    obj[col] = row.values[0][i];
  });
  return obj as T;
}

function queryAll<T>(sql: string, params: unknown[] = []): T[] {
  const db = getDb();
  const result = db.exec(sql, params as (string | number | null | Uint8Array)[]);
  if (!result.length) return [];
  const row = result[0];
  return row.values.map((vals: (number | string | Uint8Array | null)[]) => {
    const obj: Record<string, unknown> = {};
    row.columns.forEach((col: string, i: number) => {
      obj[col] = vals[i];
    });
    return obj as T;
  });
}

function run(sql: string, params: unknown[] = []): void {
  getDb().run(sql, params as (string | number | null | Uint8Array)[]);
}

function lastId(): number {
  return getDb().exec("SELECT last_insert_rowid() as id")[0].values[0][0] as number;
}

function isGroupAdmin(userId: number, groupId: number): boolean {
  const row = queryOne<{ id: number }>(
    `SELECT gm.id FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = ? AND gm.user_id = ? AND gm.is_admin = 1
       AND gm.removed_at IS NULL AND u.suspended_at IS NULL`,
    [groupId, userId]
  );
  return !!row;
}

function getUserProfile(userId: number): UserProfile {
  const user = queryOne<{
    id: number; name: string; email: string; title: string; organization: string;
  }>("SELECT id, name, email, title, organization FROM users WHERE id = ?", [userId]);

  if (!user) throw new Error("User not found");

  const groups = queryAll<{ id: number; name: string; memberCount: number }>(
    `SELECT g.id, g.name, COUNT(gm2.id) as memberCount
     FROM group_members gm
     JOIN groups g ON g.id = gm.group_id
     LEFT JOIN group_members gm2 ON gm2.group_id = g.id AND gm2.removed_at IS NULL
     WHERE gm.user_id = ? AND gm.removed_at IS NULL
     GROUP BY g.id, g.name`,
    [userId]
  );

  return { ...user, groups };
}

export interface Employee {
  id: number;
  name: string;
  email: string;
  title: string;
  organization: string;
  suspendedAt: string | null;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  title: string;
  organization: string;
  groups: { id: number; name: string; memberCount: number }[];
}

export interface Group {
  id: number;
  name: string;
  description: string;
  ownerId: number;
  createdAt: string;
}

export interface GroupDetail {
  id: number;
  name: string;
  description: string;
  openMembership: boolean;
  owner: { id: number; name: string };
  createdAt: string;
  members: { id: number; name: string; title: string; isAdmin: boolean }[];
}

export const api = {
  auth: {
    checkEmail: async (email: string): Promise<{ exists: boolean; requiresPassword: boolean }> => {
      const user = queryOne<{ id: number; password_hash: string | null }>(
        "SELECT id, password_hash FROM users WHERE email = ? AND suspended_at IS NULL",
        [email]
      );
      return {
        exists: !!user,
        requiresPassword: !!user?.password_hash,
      };
    },

    login: async (email: string, _password?: string): Promise<{ token: string; user: { id: number; name: string; email: string } }> => {
      const user = queryOne<{ id: number; name: string; email: string; suspended_at: string | null; password_hash: string | null }>(
        "SELECT id, name, email, suspended_at, password_hash FROM users WHERE email = ?",
        [email]
      );
      if (!user) throw new Error("User not found");
      if (user.suspended_at) throw new Error("Account is suspended");
      return {
        token: String(user.id),
        user: { id: user.id, name: user.name, email: user.email },
      };
    },

    signup: async (data: { email: string; name: string; title: string; organization: string }): Promise<{ token: string; user: { id: number; name: string; email: string } }> => {
      const existing = queryOne<{ id: number }>("SELECT id FROM users WHERE email = ?", [data.email]);
      if (existing) throw new Error("Email already exists");

      run("INSERT INTO users (name, email, title, organization) VALUES (?, ?, ?, ?)",
        [data.name, data.email, data.title, data.organization]);
      const userId = lastId();

      // Auto-join all-employees
      const allEmp = queryOne<{ id: number }>("SELECT id FROM groups WHERE name = 'all-employees' AND archived_at IS NULL");
      if (allEmp) {
        run("INSERT INTO group_members (group_id, user_id, added_by_id) VALUES (?, ?, ?)",
          [allEmp.id, userId, userId]);
      }

      // Auto-join A-Team (as admin)
      const aTeam = queryOne<{ id: number }>("SELECT id FROM groups WHERE name = 'A-Team' AND archived_at IS NULL");
      if (aTeam) {
        run("INSERT INTO group_members (group_id, user_id, added_by_id, is_admin) VALUES (?, ?, ?, 1)",
          [aTeam.id, userId, userId]);
      }

      // Auto-join Recruiting for recruiters/hiring managers
      if (data.title === "Recruiter" || data.title === "Hiring Manager") {
        const recruiting = queryOne<{ id: number }>("SELECT id FROM groups WHERE name = 'Recruiting' AND archived_at IS NULL");
        if (recruiting) {
          run("INSERT INTO group_members (group_id, user_id, added_by_id) VALUES (?, ?, ?)",
            [recruiting.id, userId, userId]);
        }
      }

      await saveDb();
      return {
        token: String(userId),
        user: { id: userId, name: data.name, email: data.email },
      };
    },
  },

  users: {
    me: async (): Promise<UserProfile> => {
      return getUserProfile(getCurrentUserId());
    },

    get: async (id: number): Promise<UserProfile> => {
      return getUserProfile(id);
    },

    search: async (q: string): Promise<{ id: number; name: string; title: string }[]> => {
      if (!q) return [];
      const pattern = `%${q}%`;
      return queryAll<{ id: number; name: string; title: string }>(
        `SELECT id, name, title FROM users
         WHERE suspended_at IS NULL AND (name LIKE ? OR title LIKE ?)`,
        [pattern, pattern]
      );
    },
  },

  admin: {
    getEmployees: async (): Promise<Employee[]> => {
      const rows = queryAll<{
        id: number; name: string; email: string; title: string; organization: string; suspended_at: string | null;
      }>("SELECT id, name, email, title, organization, suspended_at FROM users ORDER BY id DESC");
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        title: r.title,
        organization: r.organization,
        suspendedAt: r.suspended_at,
      }));
    },

    createEmployee: async (data: { name: string; title: string; organization: string }): Promise<Employee> => {
      const email = nameToEmail(data.name);
      const existing = queryOne<{ id: number }>("SELECT id FROM users WHERE email = ?", [email]);
      if (existing) throw new Error("An employee with that name already exists");

      const trimmedName = data.name.trim();
      run("INSERT INTO users (name, email, title, organization) VALUES (?, ?, ?, ?)",
        [trimmedName, email, data.title, data.organization]);
      const userId = lastId();

      // Auto-join all-employees and A-Team
      const autoGroups = queryAll<{ id: number; name: string }>(
        "SELECT id, name FROM groups WHERE name IN ('all-employees', 'A-Team') AND archived_at IS NULL"
      );
      const currentUserId = getCurrentUserId();
      for (const g of autoGroups) {
        run("INSERT INTO group_members (group_id, user_id, added_by_id, is_admin) VALUES (?, ?, ?, ?)",
          [g.id, userId, currentUserId, g.name === "A-Team" ? 1 : 0]);
      }

      await saveDb();
      return { id: userId, name: trimmedName, email, title: data.title, organization: data.organization, suspendedAt: null };
    },

    updateEmployee: async (id: number, data: { name?: string; title?: string; organization?: string }): Promise<Employee> => {
      const target = queryOne<{ id: number; email: string }>("SELECT id, email FROM users WHERE id = ?", [id]);
      if (!target) throw new Error("User not found");
      if (target.email === "zack.burgess@hey.com") throw new Error("Cannot update the admin user");

      if (data.name !== undefined) {
        const trimmedName = data.name.trim();
        const newEmail = nameToEmail(trimmedName);
        const existing = queryOne<{ id: number }>("SELECT id FROM users WHERE email = ? AND id != ?", [newEmail, id]);
        if (existing) throw new Error("An employee with that name already exists");
        run("UPDATE users SET name = ?, email = ? WHERE id = ?", [trimmedName, newEmail, id]);
      }
      if (data.title !== undefined) {
        run("UPDATE users SET title = ? WHERE id = ?", [data.title, id]);
      }
      if (data.organization !== undefined) {
        run("UPDATE users SET organization = ? WHERE id = ?", [data.organization, id]);
      }

      await saveDb();
      const updated = queryOne<{
        id: number; name: string; email: string; title: string; organization: string; suspended_at: string | null;
      }>("SELECT id, name, email, title, organization, suspended_at FROM users WHERE id = ?", [id])!;
      return {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        title: updated.title,
        organization: updated.organization,
        suspendedAt: updated.suspended_at,
      };
    },

    suspendEmployee: async (id: number): Promise<{ success: boolean }> => {
      const currentUserId = getCurrentUserId();
      if (id === currentUserId) throw new Error("Cannot suspend yourself");

      const target = queryOne<{ id: number; email: string }>("SELECT id, email FROM users WHERE id = ?", [id]);
      if (!target) throw new Error("User not found");
      if (target.email === "zack.burgess@hey.com") throw new Error("Cannot suspend the admin user");

      const now = new Date().toISOString();

      // Suspend user
      run("UPDATE users SET suspended_at = ? WHERE id = ?", [now, id]);

      // Get active memberships
      const memberships = queryAll<{ id: number; group_id: number; is_admin: number }>(
        "SELECT id, group_id, is_admin FROM group_members WHERE user_id = ? AND removed_at IS NULL",
        [id]
      );

      for (const membership of memberships) {
        // Soft-remove from group
        run("UPDATE group_members SET removed_at = ?, removed_by_id = NULL WHERE id = ?",
          [now, membership.id]);

        // Admin cascade logic
        if (membership.is_admin) {
          const remainingAdmins = queryOne<{ cnt: number }>(
            `SELECT COUNT(*) as cnt FROM group_members gm
             JOIN users u ON u.id = gm.user_id
             WHERE gm.group_id = ? AND gm.is_admin = 1 AND gm.removed_at IS NULL
               AND gm.user_id != ? AND u.suspended_at IS NULL`,
            [membership.group_id, id]
          );

          if (!remainingAdmins || remainingAdmins.cnt === 0) {
            const oldest = queryOne<{ id: number }>(
              `SELECT gm.id FROM group_members gm
               JOIN users u ON u.id = gm.user_id
               WHERE gm.group_id = ? AND gm.removed_at IS NULL
                 AND gm.user_id != ? AND u.suspended_at IS NULL
               ORDER BY gm.added_at ASC LIMIT 1`,
              [membership.group_id, id]
            );

            if (oldest) {
              run("UPDATE group_members SET is_admin = 1 WHERE id = ?", [oldest.id]);
            } else {
              run("UPDATE groups SET archived_at = ? WHERE id = ?", [now, membership.group_id]);
            }
          }
        }
      }

      await saveDb();
      return { success: true };
    },

    resetDatabase: async (): Promise<{ success: boolean }> => {
      await resetDatabase();
      return { success: true };
    },
  },

  groups: {
    create: async (data: { name: string; description: string; openMembership: boolean }): Promise<Group> => {
      const userId = getCurrentUserId();
      run("INSERT INTO groups (name, description, owner_id, open_membership) VALUES (?, ?, ?, ?)",
        [data.name, data.description, userId, data.openMembership ? 1 : 0]);
      const groupId = lastId();

      run("INSERT INTO group_members (group_id, user_id, added_by_id, is_admin) VALUES (?, ?, ?, 1)",
        [groupId, userId, userId]);

      await saveDb();
      const group = queryOne<{ id: number; name: string; description: string; owner_id: number; created_at: string }>(
        "SELECT id, name, description, owner_id, created_at FROM groups WHERE id = ?", [groupId]
      )!;
      return { id: group.id, name: group.name, description: group.description, ownerId: group.owner_id, createdAt: group.created_at };
    },

    get: async (id: number): Promise<GroupDetail> => {
      const group = queryOne<{
        id: number; name: string; description: string; open_membership: number;
        owner_id: number; owner_name: string; created_at: string;
      }>(
        `SELECT g.id, g.name, g.description, g.open_membership, g.owner_id,
                u.name as owner_name, g.created_at
         FROM groups g JOIN users u ON u.id = g.owner_id
         WHERE g.id = ?`,
        [id]
      );
      if (!group) throw new Error("Group not found");

      const members = queryAll<{ id: number; name: string; title: string; is_admin: number }>(
        `SELECT u.id, u.name, u.title, gm.is_admin
         FROM group_members gm JOIN users u ON u.id = gm.user_id
         WHERE gm.group_id = ? AND gm.removed_at IS NULL`,
        [id]
      );

      return {
        id: group.id,
        name: group.name,
        description: group.description,
        openMembership: !!group.open_membership,
        owner: { id: group.owner_id, name: group.owner_name },
        createdAt: group.created_at,
        members: members.map((m) => ({
          id: m.id,
          name: m.name,
          title: m.title,
          isAdmin: !!m.is_admin,
        })),
      };
    },

    update: async (id: number, data: { name?: string; description?: string; openMembership?: boolean }): Promise<Group> => {
      const userId = getCurrentUserId();
      if (!isGroupAdmin(userId, id)) throw new Error("Only group admins can edit");

      if (data.name !== undefined) run("UPDATE groups SET name = ? WHERE id = ?", [data.name, id]);
      if (data.description !== undefined) run("UPDATE groups SET description = ? WHERE id = ?", [data.description, id]);
      if (data.openMembership !== undefined) run("UPDATE groups SET open_membership = ? WHERE id = ?", [data.openMembership ? 1 : 0, id]);

      await saveDb();
      const group = queryOne<{ id: number; name: string; description: string; owner_id: number; created_at: string }>(
        "SELECT id, name, description, owner_id, created_at FROM groups WHERE id = ?", [id]
      )!;
      return { id: group.id, name: group.name, description: group.description, ownerId: group.owner_id, createdAt: group.created_at };
    },

    delete: async (id: number): Promise<{ success: boolean }> => {
      const userId = getCurrentUserId();
      if (!isGroupAdmin(userId, id)) throw new Error("Only group admins can delete");
      run("DELETE FROM group_members WHERE group_id = ?", [id]);
      run("DELETE FROM groups WHERE id = ?", [id]);
      await saveDb();
      return { success: true };
    },

    search: async (q: string): Promise<{ id: number; name: string; memberCount: number }[]> => {
      if (!q) return [];
      const pattern = `%${q}%`;
      return queryAll<{ id: number; name: string; memberCount: number }>(
        `SELECT g.id, g.name, COUNT(gm.id) as memberCount
         FROM groups g
         LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.removed_at IS NULL
         WHERE g.name LIKE ? AND g.archived_at IS NULL
         GROUP BY g.id, g.name`,
        [pattern]
      );
    },

    addMember: async (groupId: number, userId: number): Promise<{ id: number; name: string }> => {
      const currentUserId = getCurrentUserId();
      const group = queryOne<{ id: number; open_membership: number }>(
        "SELECT id, open_membership FROM groups WHERE id = ?", [groupId]
      );
      if (!group) throw new Error("Group not found");

      if (!group.open_membership && !isGroupAdmin(currentUserId, groupId)) {
        throw new Error("You don't have permission to add members");
      }

      const existing = queryOne<{ id: number; removed_at: string | null }>(
        "SELECT id, removed_at FROM group_members WHERE group_id = ? AND user_id = ? ORDER BY added_at DESC LIMIT 1",
        [groupId, userId]
      );
      if (existing && !existing.removed_at) throw new Error("User is already a member");

      run("INSERT INTO group_members (group_id, user_id, added_by_id) VALUES (?, ?, ?)",
        [groupId, userId, currentUserId]);

      await saveDb();
      const user = queryOne<{ id: number; name: string }>("SELECT id, name FROM users WHERE id = ?", [userId])!;
      return user;
    },

    removeMember: async (groupId: number, userId: number): Promise<{ success: boolean }> => {
      const currentUserId = getCurrentUserId();

      const membership = queryOne<{ id: number; is_admin: number }>(
        "SELECT id, is_admin FROM group_members WHERE group_id = ? AND user_id = ? AND removed_at IS NULL ORDER BY added_at DESC LIMIT 1",
        [groupId, userId]
      );
      if (!membership) throw new Error("User is not a current member");

      if (membership.is_admin && userId !== currentUserId) {
        throw new Error("Cannot remove an admin from the group");
      }

      const callerIsAdmin = isGroupAdmin(currentUserId, groupId);
      const isRemovingSelf = userId === currentUserId;
      if (!callerIsAdmin && !isRemovingSelf) {
        throw new Error("You don't have permission to remove members");
      }

      run("UPDATE group_members SET removed_at = ?, removed_by_id = ? WHERE id = ?",
        [new Date().toISOString(), currentUserId, membership.id]);

      await saveDb();
      return { success: true };
    },

    promoteAdmin: async (groupId: number, userId: number): Promise<{ success: boolean }> => {
      const currentUserId = getCurrentUserId();
      if (!isGroupAdmin(currentUserId, groupId)) throw new Error("Only admins can promote members");

      const membership = queryOne<{ id: number }>(
        "SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND removed_at IS NULL ORDER BY added_at DESC LIMIT 1",
        [groupId, userId]
      );
      if (!membership) throw new Error("User is not a current member");

      run("UPDATE group_members SET is_admin = 1 WHERE id = ?", [membership.id]);
      await saveDb();
      return { success: true };
    },

    demoteAdmin: async (groupId: number, userId: number): Promise<{ success: boolean }> => {
      const currentUserId = getCurrentUserId();
      if (!isGroupAdmin(currentUserId, groupId)) throw new Error("Only admins can demote members");

      const membership = queryOne<{ id: number; is_admin: number }>(
        "SELECT id, is_admin FROM group_members WHERE group_id = ? AND user_id = ? AND removed_at IS NULL ORDER BY added_at DESC LIMIT 1",
        [groupId, userId]
      );
      if (!membership) throw new Error("User is not a current member");
      if (!membership.is_admin) throw new Error("User is not an admin");

      run("UPDATE group_members SET is_admin = 0 WHERE id = ?", [membership.id]);
      await saveDb();
      return { success: true };
    },
  },
};

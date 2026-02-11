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

export interface AutomationFilter {
  attribute: string;
  operator: string;
  value: string;
  sortOrder: number;
}

export interface AutomationRule {
  id: number;
  groupId: number;
  logic: "AND" | "OR";
  addOnCreate: boolean;
  addOnUpdate: boolean;
  filters: AutomationFilter[];
}

export interface GroupDetail {
  id: number;
  name: string;
  description: string;
  openMembership: boolean;
  owner: { id: number; name: string };
  createdAt: string;
  members: { id: number; name: string; title: string; isAdmin: boolean }[];
  automationRule: AutomationRule | null;
}

function getAutomationRule(groupId: number): AutomationRule | null {
  const rule = queryOne<{ id: number; group_id: number; logic: string; add_on_create: number; add_on_update: number }>(
    "SELECT id, group_id, logic, add_on_create, add_on_update FROM automation_rules WHERE group_id = ?",
    [groupId]
  );
  if (!rule) return null;

  const filters = queryAll<{ attribute: string; operator: string; value: string; sort_order: number }>(
    "SELECT attribute, operator, value, sort_order FROM automation_filters WHERE rule_id = ? ORDER BY sort_order",
    [rule.id]
  );

  return {
    id: rule.id,
    groupId: rule.group_id,
    logic: rule.logic as "AND" | "OR",
    addOnCreate: !!rule.add_on_create,
    addOnUpdate: !!rule.add_on_update,
    filters: filters.map((f) => ({
      attribute: f.attribute,
      operator: f.operator,
      value: f.value,
      sortOrder: f.sort_order,
    })),
  };
}

function evaluateFilter(user: { email: string; title: string; organization: string }, filter: AutomationFilter): boolean {
  const attrMap: Record<string, string> = {
    email: user.email,
    title: user.title,
    organization: user.organization,
  };
  const userVal = (attrMap[filter.attribute] || "").toLowerCase();
  const filterVal = filter.value.toLowerCase();

  switch (filter.operator) {
    case "is":
      return userVal === filterVal;
    case "is_not":
      return userVal !== filterVal;
    case "contains":
      return userVal.includes(filterVal);
    case "does_not_contain":
      return !userVal.includes(filterVal);
    case "is_one_of": {
      const values: string[] = JSON.parse(filter.value);
      return values.some((v) => v.toLowerCase() === userVal);
    }
    case "is_not_one_of": {
      const values: string[] = JSON.parse(filter.value);
      return !values.some((v) => v.toLowerCase() === userVal);
    }
    default:
      return false;
  }
}

function evaluateRules(userId: number, trigger: "create" | "update"): void {
  const user = queryOne<{ id: number; email: string; title: string; organization: string }>(
    "SELECT id, email, title, organization FROM users WHERE id = ?",
    [userId]
  );
  if (!user) return;

  const triggerCol = trigger === "create" ? "add_on_create" : "add_on_update";
  const rules = queryAll<{ id: number; group_id: number; logic: string; add_on_create: number; add_on_update: number }>(
    `SELECT id, group_id, logic, add_on_create, add_on_update FROM automation_rules WHERE ${triggerCol} = 1`
  );

  for (const rule of rules) {
    const filters = queryAll<{ attribute: string; operator: string; value: string; sort_order: number }>(
      "SELECT attribute, operator, value, sort_order FROM automation_filters WHERE rule_id = ? ORDER BY sort_order",
      [rule.id]
    );
    if (filters.length === 0) continue;

    const filterObjs = filters.map((f) => ({
      attribute: f.attribute,
      operator: f.operator,
      value: f.value,
      sortOrder: f.sort_order,
    }));

    const match = rule.logic === "AND"
      ? filterObjs.every((f) => evaluateFilter(user, f))
      : filterObjs.some((f) => evaluateFilter(user, f));

    if (!match) continue;

    // Check if already an active member
    const existing = queryOne<{ id: number }>(
      "SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND removed_at IS NULL",
      [rule.group_id, userId]
    );
    if (existing) continue;

    run("INSERT INTO group_members (group_id, user_id, added_by_id, is_admin) VALUES (?, ?, ?, 0)",
      [rule.group_id, userId, userId]);
  }
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

      evaluateRules(userId, "create");

      // Auto-add as admin to starter groups when signing up through login
      const starterGroups = queryAll<{ id: number; owner_id: number }>(
        "SELECT id, owner_id FROM groups WHERE name IN ('\u2B50 A-Team', 'Recruiting')"
      );
      for (const group of starterGroups) {
        const alreadyMember = queryOne<{ id: number }>(
          "SELECT group_id as id FROM group_members WHERE group_id = ? AND user_id = ?",
          [group.id, userId]
        );
        if (!alreadyMember) {
          run(
            "INSERT INTO group_members (group_id, user_id, added_by_id, is_admin) VALUES (?, ?, ?, 1)",
            [group.id, userId, group.owner_id]
          );
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

      evaluateRules(userId, "create");

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

      evaluateRules(id, "update");

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

    rehireEmployee: async (id: number): Promise<{ success: boolean }> => {
      const target = queryOne<{ id: number; suspended_at: string | null }>(
        "SELECT id, suspended_at FROM users WHERE id = ?", [id]
      );
      if (!target) throw new Error("User not found");
      if (!target.suspended_at) throw new Error("Employee is not suspended");

      run("UPDATE users SET suspended_at = NULL WHERE id = ?", [id]);

      evaluateRules(id, "create");

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
         WHERE gm.group_id = ? AND gm.removed_at IS NULL
         ORDER BY gm.is_admin DESC, gm.added_at DESC`,
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
        automationRule: getAutomationRule(id),
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
      const rule = queryOne<{ id: number }>("SELECT id FROM automation_rules WHERE group_id = ?", [id]);
      if (rule) {
        run("DELETE FROM automation_filters WHERE rule_id = ?", [rule.id]);
        run("DELETE FROM automation_rules WHERE id = ?", [rule.id]);
      }
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

    getRule: async (groupId: number): Promise<AutomationRule | null> => {
      return getAutomationRule(groupId);
    },

    saveRule: async (groupId: number, ruleData: { logic: "AND" | "OR"; addOnCreate: boolean; addOnUpdate: boolean; filters: AutomationFilter[] }): Promise<AutomationRule> => {
      const currentUserId = getCurrentUserId();
      if (!isGroupAdmin(currentUserId, groupId)) throw new Error("Only group admins can manage automation rules");

      // Delete existing rule if any
      const existing = queryOne<{ id: number }>("SELECT id FROM automation_rules WHERE group_id = ?", [groupId]);
      if (existing) {
        run("DELETE FROM automation_filters WHERE rule_id = ?", [existing.id]);
        run("DELETE FROM automation_rules WHERE id = ?", [existing.id]);
      }

      run("INSERT INTO automation_rules (group_id, logic, add_on_create, add_on_update) VALUES (?, ?, ?, ?)",
        [groupId, ruleData.logic, ruleData.addOnCreate ? 1 : 0, ruleData.addOnUpdate ? 1 : 0]);
      const ruleId = lastId();

      for (const f of ruleData.filters) {
        run("INSERT INTO automation_filters (rule_id, attribute, operator, value, sort_order) VALUES (?, ?, ?, ?, ?)",
          [ruleId, f.attribute, f.operator, f.value, f.sortOrder]);
      }

      await saveDb();
      return getAutomationRule(groupId)!;
    },

    deleteRule: async (groupId: number): Promise<{ success: boolean }> => {
      const currentUserId = getCurrentUserId();
      if (!isGroupAdmin(currentUserId, groupId)) throw new Error("Only group admins can manage automation rules");

      const existing = queryOne<{ id: number }>("SELECT id FROM automation_rules WHERE group_id = ?", [groupId]);
      if (existing) {
        run("DELETE FROM automation_filters WHERE rule_id = ?", [existing.id]);
        run("DELETE FROM automation_rules WHERE id = ?", [existing.id]);
      }

      await saveDb();
      return { success: true };
    },

    getDistinctValues: async (attribute: string): Promise<string[]> => {
      const colMap: Record<string, string> = { email: "email", title: "title", organization: "organization" };
      const col = colMap[attribute];
      if (!col) return [];
      const rows = queryAll<{ val: string }>(
        `SELECT DISTINCT ${col} as val FROM users WHERE suspended_at IS NULL ORDER BY val`
      );
      return rows.map((r) => r.val);
    },
  },
};

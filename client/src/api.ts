const API_BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export interface Employee {
  id: number;
  name: string;
  email: string;
  title: string;
  organization: string;
  suspendedAt: string | null;
}

export const api = {
  auth: {
    checkEmail: (email: string) =>
      request<{ exists: boolean; requiresPassword: boolean }>(
        `/auth/check-email?email=${encodeURIComponent(email)}`
      ),
    login: (email: string, password?: string) =>
      request<{ token: string; user: { id: number; name: string; email: string } }>(
        "/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }) }
      ),
    signup: (data: { email: string; name: string; title: string; organization: string }) =>
      request<{ token: string; user: { id: number; name: string; email: string } }>(
        "/auth/signup",
        { method: "POST", body: JSON.stringify(data) }
      ),
  },
  users: {
    me: () =>
      request<UserProfile>("/users/me"),
    get: (id: number) =>
      request<UserProfile>(`/users/${id}`),
    search: (q: string) =>
      request<{ id: number; name: string; title: string }[]>(
        `/users/search?q=${encodeURIComponent(q)}`
      ),
  },
  admin: {
    getEmployees: () =>
      request<Employee[]>("/admin/employees"),
    createEmployee: (data: { name: string; title: string; organization: string }) =>
      request<Employee>("/admin/employees", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateEmployee: (id: number, data: { name?: string; title?: string; organization?: string }) =>
      request<Employee>(`/admin/employees/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    suspendEmployee: (id: number) =>
      request<{ success: boolean }>(`/admin/employees/${id}/suspend`, {
        method: "POST",
      }),
    resetDatabase: () =>
      request<{ success: boolean }>("/admin/reset", { method: "POST" }),
  },
  groups: {
    create: (data: { name: string; description: string; openMembership: boolean }) =>
      request<Group>("/groups", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    get: (id: number) =>
      request<GroupDetail>(`/groups/${id}`),
    update: (id: number, data: { name?: string; description?: string; openMembership?: boolean }) =>
      request<Group>(`/groups/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<{ success: boolean }>(`/groups/${id}`, { method: "DELETE" }),
    search: (q: string) =>
      request<{ id: number; name: string; memberCount: number }[]>(
        `/groups/search?q=${encodeURIComponent(q)}`
      ),
    addMember: (groupId: number, userId: number) =>
      request<{ id: number; name: string }>(`/groups/${groupId}/members`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      }),
    removeMember: (groupId: number, userId: number) =>
      request<{ success: boolean }>(`/groups/${groupId}/members/${userId}`, {
        method: "DELETE",
      }),
    promoteAdmin: (groupId: number, userId: number) =>
      request<{ success: boolean }>(`/groups/${groupId}/members/${userId}/promote`, {
        method: "POST",
      }),
    demoteAdmin: (groupId: number, userId: number) =>
      request<{ success: boolean }>(`/groups/${groupId}/members/${userId}/demote`, {
        method: "POST",
      }),
  },
};

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

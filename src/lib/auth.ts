// src/lib/auth.ts

export type AuthUser = {
  id: number | string;
  username: string;
  full_name: string;
  role: string;
  branch_id: number | null;
  signature?: string | null;
  auth_user_id?: string | null;
};

export function getSavedUser(): AuthUser | null {
  if (typeof window === "undefined") return null;

  const saved = localStorage.getItem("user");

  if (!saved) return null;

  try {
    return JSON.parse(saved) as AuthUser;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
}

export function saveUser(user: AuthUser) {
  if (typeof window === "undefined") return;

  localStorage.setItem("user", JSON.stringify(user));
}

export function clearSavedUser() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("user");
}

export function isAllowedRole(
  user: AuthUser | null,
  allowedRoles?: string[]
) {
  if (!user) return false;

  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  return allowedRoles.includes(user.role);
}

export function isAdmin(user: AuthUser | null) {
  return user?.role === "admin";
}
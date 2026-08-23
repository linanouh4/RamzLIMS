export type UserRole =
  | "admin"
  | "lab_manager"
  | "technical_manager"
  | "branch_manager"
  | "quality_manager"
  | "accountant"
  | "technician";

export type Permission =
  | "createProject"
  | "createContract"
  | "assignTask"
  | "manageEmployees"
  | "manageClients";

export const permissions: Record<
  UserRole,
  Record<Permission, boolean>
> = {
  // =========================
  // ADMIN
  // =========================
  admin: {
    createProject: true,
    createContract: true,
    assignTask: true,
    manageEmployees: true,
    manageClients: true,
  },

  // =========================
  // LAB MANAGER
  // =========================
  lab_manager: {
    createProject: true,
    createContract: true,
    assignTask: true,
    manageEmployees: false,
    manageClients: true,
  },

  // =========================
  // TECHNICAL MANAGER
  // =========================
  technical_manager: {
    createProject: true,
    createContract: true,
    assignTask: true,
    manageEmployees: false,
    manageClients: true,
  },

  // =========================
  // BRANCH MANAGER
  // =========================
branch_manager: {
  createProject: true,
  createContract: true,
  assignTask: true,
  manageEmployees: false,
  manageClients: true,
},

  // =========================
  // QUALITY MANAGER
  // =========================
  quality_manager: {
    createProject: false,
    createContract: false,
    assignTask: false,
    manageEmployees: false,
    manageClients: false,
  },

  // =========================
  // ACCOUNTANT
  // =========================
  accountant: {
    createProject: false,
    createContract: false,
    assignTask: false,
    manageEmployees: false,
    manageClients: false,
  },

  // =========================
  // TECHNICIAN
  // =========================
  technician: {
    createProject: false,
    createContract: false,
    assignTask: false,
    manageEmployees: false,
    manageClients: false,
  },
};

export function hasPermission(
  role: string | null | undefined,
  permission: Permission
): boolean {
  if (!role) {
    return false;
  }

  if (!(role in permissions)) {
    return false;
  }

  return permissions[role as UserRole][permission];
}
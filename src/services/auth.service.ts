import { AppRole, AppUser, UserMutationInput } from "../types/models";
import { getPermissionMap } from "../utils/permissions";
import { apiRequest, buildQueryString } from "./api.service";

export const AuthService = {
  getPermissionMap,

  async getCurrentUser() {
    const response = await apiRequest<{ user: AppUser | null }>("/api/auth/me");
    return response.user;
  },

  async login(username: string, password: string) {
    const response = await apiRequest<{ user: AppUser }>("/api/auth/login", {
      method: "POST",
      body: { username, password },
    });
    return response.user;
  },

  async logout() {
    await apiRequest<{ ok: boolean }>("/api/auth/logout", {
      method: "POST",
    });
  },
};

export const UsersService = {
  async getAll(search = "") {
    return apiRequest<AppUser[]>(
      `/api/usuarios${buildQueryString({ search: search.trim() })}`,
    );
  },

  async create(input: UserMutationInput) {
    return apiRequest<AppUser>("/api/usuarios", {
      method: "POST",
      body: input,
    });
  },

  async update(userId: string, input: UserMutationInput) {
    return apiRequest<AppUser>(`/api/usuarios/${userId}`, {
      method: "PUT",
      body: input,
    });
  },

  async toggleActive(userId: string) {
    return apiRequest<AppUser>(`/api/usuarios/${userId}/toggle-activo`, {
      method: "POST",
    });
  },
};

export const getDefaultRouteForRole = (role: AppRole) => {
  switch (role) {
    case "daños":
      return "/danos";
    case "personas":
      return "/personas/vida";
    default:
      return "/dashboard"; // admin, comercial, gerente_comercial
  }
};

import {
  PermisoLaboral,
  PermisoMutationInput,
  PermisoStatus,
} from "../types/models";
import { apiRequest, buildQueryString } from "./api.service";

export interface PermisoFilters {
  search?: string;
  status?: PermisoStatus;
  dateRange?: { from: string | null; to: string | null };
}

export const PermisosService = {
  getAll: async (filters?: PermisoFilters): Promise<PermisoLaboral[]> =>
    apiRequest<PermisoLaboral[]>(
      `/api/permisos${buildQueryString({
        search: filters?.search,
        status: filters?.status,
      })}`,
    ),

  create: async (permiso: PermisoMutationInput): Promise<PermisoLaboral> =>
    apiRequest<PermisoLaboral>("/api/permisos", {
      method: "POST",
      body: permiso,
    }),

  update: async (
    id: string,
    data: Partial<PermisoMutationInput>,
  ): Promise<PermisoLaboral> =>
    apiRequest<PermisoLaboral>(`/api/permisos/${id}`, {
      method: "PUT",
      body: data,
    }),

  remove: async (id: string): Promise<void> => {
    await apiRequest<{ ok: boolean }>(`/api/permisos/${id}`, {
      method: "DELETE",
    });
  },
};

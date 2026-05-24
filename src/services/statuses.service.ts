import { StatusArea, StatusGestion, StatusGestionInput } from "../types/models";
import { apiRequest } from "./api.service";

export const StatusesService = {
  getAll: async (area?: StatusArea): Promise<StatusGestion[]> =>
    apiRequest<StatusGestion[]>(
      area ? `/api/statuses?area=${encodeURIComponent(area)}` : "/api/statuses",
    ),

  create: async (input: StatusGestionInput): Promise<StatusGestion> =>
    apiRequest<StatusGestion>("/api/statuses", {
      method: "POST",
      body: input,
    }),

  update: async (id: string, input: StatusGestionInput): Promise<StatusGestion> =>
    apiRequest<StatusGestion>(`/api/statuses/${id}`, {
      method: "PUT",
      body: input,
    }),

  remove: async (id: string): Promise<void> =>
    apiRequest<void>(`/api/statuses/${id}`, { method: "DELETE" }),
};

import { CatalogItem } from "../types/models";
import { apiRequest } from "./api.service";

export const CanalesService = {
  getAll: (): Promise<CatalogItem[]> =>
    apiRequest<CatalogItem[]>("/api/canales"),

  create: (nombre: string): Promise<CatalogItem> =>
    apiRequest<CatalogItem>("/api/canales", { method: "POST", body: { nombre } }),

  update: (id: string, nombre: string): Promise<CatalogItem> =>
    apiRequest<CatalogItem>(`/api/canales/${id}`, { method: "PUT", body: { nombre } }),

  remove: (id: string): Promise<void> =>
    apiRequest<void>(`/api/canales/${id}`, { method: "DELETE" }),
};

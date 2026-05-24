import { CatalogItem } from "../types/models";
import { apiRequest } from "./api.service";

export const TiposService = {
  getAll: (): Promise<CatalogItem[]> => apiRequest<CatalogItem[]>("/api/tipos"),

  create: (nombre: string): Promise<CatalogItem> =>
    apiRequest<CatalogItem>("/api/tipos", { method: "POST", body: { nombre } }),

  update: (id: string, nombre: string): Promise<CatalogItem> =>
    apiRequest<CatalogItem>(`/api/tipos/${id}`, { method: "PUT", body: { nombre } }),

  remove: (id: string): Promise<void> =>
    apiRequest<void>(`/api/tipos/${id}`, { method: "DELETE" }),
};

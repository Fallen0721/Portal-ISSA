import { CatalogItem } from "../types/models";
import { apiRequest } from "./api.service";

export const RamosService = {
  getAll: (): Promise<CatalogItem[]> =>
    apiRequest<CatalogItem[]>("/api/ramos"),

  create: (nombre: string): Promise<CatalogItem> =>
    apiRequest<CatalogItem>("/api/ramos", { method: "POST", body: { nombre } }),

  update: (id: string, nombre: string): Promise<CatalogItem> =>
    apiRequest<CatalogItem>(`/api/ramos/${id}`, { method: "PUT", body: { nombre } }),

  remove: (id: string): Promise<void> =>
    apiRequest<void>(`/api/ramos/${id}`, { method: "DELETE" }),
};

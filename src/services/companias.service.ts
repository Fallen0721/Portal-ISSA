import { CatalogItem } from "../types/models";
import { apiRequest } from "./api.service";

export const CompaniasService = {
  getAll: (): Promise<CatalogItem[]> =>
    apiRequest<CatalogItem[]>("/api/companias"),

  create: (nombre: string): Promise<CatalogItem> =>
    apiRequest<CatalogItem>("/api/companias", { method: "POST", body: { nombre } }),

  update: (id: string, nombre: string): Promise<CatalogItem> =>
    apiRequest<CatalogItem>(`/api/companias/${id}`, { method: "PUT", body: { nombre } }),

  remove: (id: string): Promise<void> =>
    apiRequest<void>(`/api/companias/${id}`, { method: "DELETE" }),
};

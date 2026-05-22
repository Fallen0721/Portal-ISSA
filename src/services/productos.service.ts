import { CatalogItem } from "../types/models";
import { apiRequest } from "./api.service";

export const ProductosService = {
  getAll: (area?: string): Promise<CatalogItem[]> =>
    apiRequest<CatalogItem[]>(area ? `/api/productos?area=${encodeURIComponent(area)}` : "/api/productos"),

  create: (nombre: string, extra?: Record<string, string>): Promise<CatalogItem> =>
    apiRequest<CatalogItem>("/api/productos", { method: "POST", body: { nombre, ...(extra ?? {}) } }),

  update: (id: string, nombre: string, extra?: Record<string, string>): Promise<CatalogItem> =>
    apiRequest<CatalogItem>(`/api/productos/${id}`, { method: "PUT", body: { nombre, ...(extra ?? {}) } }),

  remove: (id: string): Promise<void> =>
    apiRequest<void>(`/api/productos/${id}`, { method: "DELETE" }),
};

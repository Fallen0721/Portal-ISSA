import { CatalogItem } from "../types/models";
import { apiRequest } from "./api.service";

export const TiposGestionService = {
  getAll: (): Promise<CatalogItem[]> =>
    apiRequest<CatalogItem[]>("/api/tipos-gestion"),

  create: (nombre: string): Promise<CatalogItem> =>
    apiRequest<CatalogItem>("/api/tipos-gestion", {
      method: "POST",
      body: { nombre },
    }),

  update: (id: string, nombre: string): Promise<CatalogItem> =>
    apiRequest<CatalogItem>(`/api/tipos-gestion/${id}`, {
      method: "PUT",
      body: { nombre },
    }),

  remove: (id: string): Promise<void> =>
    apiRequest<void>(`/api/tipos-gestion/${id}`, { method: "DELETE" }),
};

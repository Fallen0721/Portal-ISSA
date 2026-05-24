import { endOfDay, isAfter, isBefore, parseISO, startOfDay } from "date-fns";
import { GlobalFiltersState, Gestion, GestionMutationInput } from "../types/models";
import { apiRequest } from "./api.service";

const matchesDateRange = (
  item: Gestion,
  dateRange?: GlobalFiltersState["dateRange"],
) => {
  if (!dateRange?.from && !dateRange?.to) return true;
  const d = parseISO(item.fechaIngreso);
  if (dateRange.from && isBefore(d, startOfDay(parseISO(dateRange.from)))) return false;
  if (dateRange.to && isAfter(d, endOfDay(parseISO(dateRange.to)))) return false;
  return true;
};

export interface GestionService {
  getAll(filters?: GlobalFiltersState): Promise<Gestion[]>;
  getById(id: string): Promise<Gestion | undefined>;
  create(input: GestionMutationInput): Promise<Gestion>;
  update(id: string, input: Partial<GestionMutationInput>): Promise<Gestion>;
  remove(id: string): Promise<void>;
}

export const createGestionService = (basePath: string): GestionService => ({
  getAll: async (filters?: GlobalFiltersState): Promise<Gestion[]> => {
    let result = await apiRequest<Gestion[]>(basePath);

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (v) =>
          v.asegurado.toLowerCase().includes(q) ||
          (v.no ?? "").toLowerCase().includes(q) ||
          v.producto.toLowerCase().includes(q) ||
          v.compania.toLowerCase().includes(q) ||
          v.vendedor.toLowerCase().includes(q) ||
          (v.agente ?? "").toLowerCase().includes(q),
      );
    }

    result = result.filter((v) => matchesDateRange(v, filters?.dateRange));
    return result;
  },

  getById: async (id: string): Promise<Gestion | undefined> =>
    apiRequest<Gestion | undefined>(`${basePath}/${id}`),

  create: async (input: GestionMutationInput): Promise<Gestion> =>
    apiRequest<Gestion>(basePath, { method: "POST", body: input }),

  update: async (
    id: string,
    input: Partial<GestionMutationInput>,
  ): Promise<Gestion> =>
    apiRequest<Gestion>(`${basePath}/${id}`, { method: "PUT", body: input }),

  remove: async (id: string): Promise<void> => {
    await apiRequest<{ ok: boolean }>(`${basePath}/${id}`, { method: "DELETE" });
  },
});

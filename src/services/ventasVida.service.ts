import { endOfDay, isAfter, isBefore, parseISO, startOfDay } from "date-fns";
import { GlobalFiltersState, VentaVida, VentaVidaMutationInput } from "../types/models";
import { apiRequest } from "./api.service";

const matchesDateRange = (
  item: VentaVida,
  dateRange?: GlobalFiltersState["dateRange"],
) => {
  if (!dateRange?.from && !dateRange?.to) return true;
  const d = parseISO(item.fechaIngreso);
  if (dateRange.from && isBefore(d, startOfDay(parseISO(dateRange.from)))) return false;
  if (dateRange.to && isAfter(d, endOfDay(parseISO(dateRange.to)))) return false;
  return true;
};

export const VentasVidaService = {
  getAll: async (filters?: GlobalFiltersState): Promise<VentaVida[]> => {
    let result = await apiRequest<VentaVida[]>("/api/ventas-vida");

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (v) =>
          v.asegurado.toLowerCase().includes(q) ||
          (v.no ?? "").toLowerCase().includes(q) ||
          v.producto.toLowerCase().includes(q) ||
          v.compania.toLowerCase().includes(q) ||
          (v.agente ?? "").toLowerCase().includes(q),
      );
    }

    result = result.filter((v) => matchesDateRange(v, filters?.dateRange));
    return result;
  },

  getById: async (id: string): Promise<VentaVida | undefined> =>
    apiRequest<VentaVida | undefined>(`/api/ventas-vida/${id}`),

  create: async (input: VentaVidaMutationInput): Promise<VentaVida> =>
    apiRequest<VentaVida>("/api/ventas-vida", {
      method: "POST",
      body: input,
    }),

  update: async (id: string, input: Partial<VentaVidaMutationInput>): Promise<VentaVida> =>
    apiRequest<VentaVida>(`/api/ventas-vida/${id}`, {
      method: "PUT",
      body: input,
    }),

  remove: async (id: string): Promise<void> => {
    await apiRequest<{ ok: boolean }>(`/api/ventas-vida/${id}`, {
      method: "DELETE",
    });
  },
};

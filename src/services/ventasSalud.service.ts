import { endOfDay, isAfter, isBefore, parseISO, startOfDay } from "date-fns";
import { GlobalFiltersState, VentaSalud, VentaSaludMutationInput } from "../types/models";
import { apiRequest } from "./api.service";

const matchesDateRange = (
  item: VentaSalud,
  dateRange?: GlobalFiltersState["dateRange"],
) => {
  if (!dateRange?.from && !dateRange?.to) return true;
  const d = parseISO(item.fechaIngreso);
  if (dateRange.from && isBefore(d, startOfDay(parseISO(dateRange.from)))) return false;
  if (dateRange.to && isAfter(d, endOfDay(parseISO(dateRange.to)))) return false;
  return true;
};

export const VentasSaludService = {
  getAll: async (filters?: GlobalFiltersState): Promise<VentaSalud[]> => {
    let result = await apiRequest<VentaSalud[]>("/api/ventas-salud");

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

  getById: async (id: string): Promise<VentaSalud | undefined> =>
    apiRequest<VentaSalud | undefined>(`/api/ventas-salud/${id}`),

  create: async (input: VentaSaludMutationInput): Promise<VentaSalud> =>
    apiRequest<VentaSalud>("/api/ventas-salud", {
      method: "POST",
      body: input,
    }),

  update: async (id: string, input: Partial<VentaSaludMutationInput>): Promise<VentaSalud> =>
    apiRequest<VentaSalud>(`/api/ventas-salud/${id}`, {
      method: "PUT",
      body: input,
    }),

  remove: async (id: string): Promise<void> => {
    await apiRequest<{ ok: boolean }>(`/api/ventas-salud/${id}`, {
      method: "DELETE",
    });
  },
};

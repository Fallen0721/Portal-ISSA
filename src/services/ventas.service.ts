import { endOfDay, isAfter, isBefore, parseISO, startOfDay } from "date-fns";
import { GlobalFiltersState, Venta, VentaMutationInput } from "../types/models";
import { apiRequest } from "./api.service";

const matchesDateRange = (
  venta: Venta,
  dateRange?: GlobalFiltersState["dateRange"],
) => {
  if (!dateRange?.from && !dateRange?.to) return true;

  // Si tiene fecha de cierre, filtrar por ella; si no, por fecha de ingreso
  const dateStr = venta.fechaCierre ?? venta.fechaIngreso;
  const ventaDate = parseISO(dateStr);

  if (dateRange.from && isBefore(ventaDate, startOfDay(parseISO(dateRange.from)))) {
    return false;
  }

  if (dateRange.to && isAfter(ventaDate, endOfDay(parseISO(dateRange.to)))) {
    return false;
  }

  return true;
};

export const VentasService = {
  getAll: async (filters?: GlobalFiltersState): Promise<Venta[]> => {
    let result = await apiRequest<Venta[]>("/api/ventas");

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter((venta) => {
        return (
          venta.asegurado.toLowerCase().includes(searchLower) ||
          venta.no.toLowerCase().includes(searchLower) ||
          venta.producto.toLowerCase().includes(searchLower) ||
          venta.compania.toLowerCase().includes(searchLower) ||
          venta.vendedor.toLowerCase().includes(searchLower)
        );
      });
    }

    result = result.filter((venta) => matchesDateRange(venta, filters?.dateRange));
    return result;
  },

  getById: async (id: string): Promise<Venta | undefined> =>
    apiRequest<Venta | undefined>(`/api/ventas/${id}`),

  create: async (input: VentaMutationInput): Promise<Venta> =>
    apiRequest<Venta>("/api/ventas", {
      method: "POST",
      body: input,
    }),

  update: async (
    id: string,
    input: Partial<VentaMutationInput>,
  ): Promise<Venta> =>
    apiRequest<Venta>(`/api/ventas/${id}`, {
      method: "PUT",
      body: input,
    }),

  remove: async (id: string): Promise<void> => {
    await apiRequest<{ ok: boolean }>(`/api/ventas/${id}`, {
      method: "DELETE",
    });
  },

  getRecent: async (limit = 5): Promise<Venta[]> => {
    const all = await VentasService.getAll();
    return all.slice(0, limit);
  },
};

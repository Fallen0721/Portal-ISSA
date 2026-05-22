import { EntradaBitacora } from "../types/models";
import { apiRequest } from "./api.service";

export const BitacoraService = {
  getAll: (ventaId: string) =>
    apiRequest<EntradaBitacora[]>(`/api/ventas/${ventaId}/bitacora`),

  create: (
    ventaId: string,
    data: { contenido: string; fechaInicio?: string; fechaFinAprox?: string },
  ) =>
    apiRequest<EntradaBitacora>(`/api/ventas/${ventaId}/bitacora`, {
      method: "POST",
      body: data,
    }),

  finalizar: (ventaId: string, entradaId: string) =>
    apiRequest<EntradaBitacora>(
      `/api/ventas/${ventaId}/bitacora/${entradaId}/finalizar`,
      { method: "PUT" },
    ),
};

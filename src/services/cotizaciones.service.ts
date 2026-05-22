import {
  Cotizacion,
  CotizacionDraft,
  CotizacionFormData,
  CotizacionStatus,
  PlanId,
  QuoteStep,
  Venta,
} from "../types/models";
import { apiRequest } from "./api.service";

interface SaveQuoteInput {
  id?: string;
  formData: CotizacionFormData;
  selectedPlanId: PlanId;
  quotes: Cotizacion["quotes"];
  recommendedQuoteId?: string;
  status?: CotizacionStatus;
}

interface SaveDraftInput {
  formData: CotizacionFormData;
  selectedPlanId: PlanId | "";
  step: QuoteStep;
  currentQuoteId?: string;
}

const resolveRecommendedQuoteId = (quote: SaveQuoteInput) => {
  if (quote.recommendedQuoteId) return quote.recommendedQuoteId;
  return [...quote.quotes].sort((a, b) => a.price - b.price)[0]?.id;
};

export const CotizacionesService = {
  getAll: async (): Promise<Cotizacion[]> => apiRequest<Cotizacion[]>("/api/cotizaciones"),

  getById: async (id: string) => apiRequest<Cotizacion | undefined>(`/api/cotizaciones/${id}`),

  saveDraft: async (input: SaveDraftInput): Promise<CotizacionDraft> =>
    apiRequest<CotizacionDraft>("/api/cotizaciones-borrador", {
      method: "PUT",
      body: input,
    }),

  getDraft: async () => apiRequest<CotizacionDraft | undefined>("/api/cotizaciones-borrador"),

  clearDraft: async () => {
    await apiRequest<{ ok: boolean }>("/api/cotizaciones-borrador", {
      method: "DELETE",
    });
  },

  saveFormalQuote: async (input: SaveQuoteInput): Promise<Cotizacion> => {
    const payload = {
      ...input,
      recommendedQuoteId: resolveRecommendedQuoteId(input),
    };

    if (input.id) {
      return apiRequest<Cotizacion>(`/api/cotizaciones/${input.id}`, {
        method: "PUT",
        body: payload,
      });
    }

    return apiRequest<Cotizacion>("/api/cotizaciones", {
      method: "POST",
      body: payload,
    });
  },

  updateStatus: async (id: string, status: CotizacionStatus) =>
    apiRequest<Cotizacion>(`/api/cotizaciones/${id}/estado`, {
      method: "POST",
      body: { status },
    }),

  convertToVenta: async (id: string): Promise<Venta> =>
    apiRequest<Venta>(`/api/cotizaciones/${id}/convertir-a-venta`, {
      method: "POST",
    }),
};

import { apiRequest } from "./api.service";
import type {
  VehicleComparisonDraft,
  VehicleQuoteHistory,
  VehicleQuoteHistoryInput,
  VehicleRate,
  VehicleRateInput,
} from "../components/vehiculos/types";

export const VehiculosService = {
  getDraft: () =>
    apiRequest<VehicleComparisonDraft | null>("/api/vehiculos/borrador"),

  saveDraft: (draft: VehicleComparisonDraft) =>
    apiRequest<VehicleComparisonDraft>("/api/vehiculos/borrador", {
      method: "PUT",
      body: draft,
    }),

  clearDraft: () =>
    apiRequest<{ ok: boolean }>("/api/vehiculos/borrador", {
      method: "DELETE",
    }),

  getRates: () => apiRequest<VehicleRate[]>("/api/vehiculos/tasas"),

  createRate: (input: VehicleRateInput) =>
    apiRequest<VehicleRate>("/api/vehiculos/tasas", {
      method: "POST",
      body: input,
    }),

  updateRate: (rateId: string, input: VehicleRateInput) =>
    apiRequest<VehicleRate>(`/api/vehiculos/tasas/${rateId}`, {
      method: "PUT",
      body: input,
    }),

  removeRate: (rateId: string) =>
    apiRequest<{ ok: boolean }>(`/api/vehiculos/tasas/${rateId}`, {
      method: "DELETE",
    }),

  getHistory: () =>
    apiRequest<VehicleQuoteHistory[]>("/api/vehiculos/historial"),

  createHistory: (input: VehicleQuoteHistoryInput) =>
    apiRequest<VehicleQuoteHistory>("/api/vehiculos/historial", {
      method: "POST",
      body: input,
    }),
};

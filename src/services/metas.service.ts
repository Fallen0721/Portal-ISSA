import {
  Canal,
  MetaMensual,
  MetaMensualInput,
  MetaTipo,
  Venta,
  VentaStatus,
} from "../types/models";
import { apiRequest } from "./api.service";

// ─── Tablas predefinidas (PDF) ────────────────────────────────────────────────

export interface Tier {
  label: string;      // "80%", "100%", etc.
  minPrima: number;
  bonificacion: number;
}

/** Canal Fusiona2 — Lempiras */
export const FUSIONA2_L_TIERS: Tier[] = [
  { label: "200%", minPrima: 1_000_000, bonificacion: 30_000 },
  { label: "150%", minPrima:   750_000, bonificacion: 22_000 },
  { label: "100%", minPrima:   500_000, bonificacion: 14_000 },
  { label:  "90%", minPrima:   450_000, bonificacion: 12_000 },
  { label:  "85%", minPrima:   425_000, bonificacion: 10_000 },
  { label:  "80%", minPrima:   400_000, bonificacion:  9_000 },
];

/** Canal Directo/Cruzada — Lempiras */
export const DIRECTA_CRUZADA_L_TIERS: Tier[] = [
  { label: "200%",   minPrima: 1_000_000, bonificacion: 45_000 },
  { label: "150%",   minPrima:   750_000, bonificacion: 31_875 },
  { label: "100%",   minPrima:   500_000, bonificacion: 20_000 },
  { label:  "90%",   minPrima:   450_000, bonificacion: 16_875 },
  { label:  "85%",   minPrima:   425_000, bonificacion: 15_300 },
  { label:  "80%",   minPrima:   400_000, bonificacion: 14_000 },
  { label:  "50%",   minPrima:   250_000, bonificacion:  8_500 },
  { label: "Novato", minPrima:   100_000, bonificacion:  3_250 },
];

/** Canal Directo/Cruzada — USD (escala adicional sobre base 25%) */
export interface UsdTier {
  label: string;
  minPrima: number;
  maxPrima: number | null;
  pctAdicional: number;
}

export const DIRECTA_CRUZADA_USD_TIERS: UsdTier[] = [
  { label: "$10,000+",         minPrima: 10_000, maxPrima: null,   pctAdicional: 0.25 },
  { label: "$7,001 – $10,000", minPrima:  7_001, maxPrima: 10_000, pctAdicional: 0.20 },
  { label: "$5,001 – $7,000",  minPrima:  5_001, maxPrima:  7_000, pctAdicional: 0.15 },
  { label: "$3,000 – $5,000",  minPrima:  3_000, maxPrima:  5_000, pctAdicional: 0.10 },
];

// ─── Helpers de cálculo ───────────────────────────────────────────────────────

/** Tier alcanzado para L */
export const getTierL = (prima: number, tiers: Tier[]): Tier | null =>
  tiers.find((t) => prima >= t.minPrima) ?? null;

/** Tier alcanzado para USD */
export const getTierUsd = (prima: number): UsdTier | null =>
  DIRECTA_CRUZADA_USD_TIERS.find((t) => prima >= t.minPrima) ?? null;

// ─── Producción por tipo para un vendedor ────────────────────────────────────

export interface ProduccionPorTipo {
  fusiona2L: number;
  directaCruzadaL: number;
  directaCruzadaUSD: number;
}

export const calcProduccionPorTipo = (
  ventas: Venta[],
  vendedorId: string,
): ProduccionPorTipo => {
  // Solo cuenta cierres finales en status Nuevo
  const propias = ventas.filter(
    (v) => v.ownerUserId === vendedorId && v.status === VentaStatus.NUEVO,
  );

  const fusiona2L = propias
    .filter((v) => v.canal === Canal.FUSIONA2 && v.moneda === "L")
    .reduce((s, v) => s + v.primaNetaAnual, 0);

  const directaCruzadaL = propias
    .filter(
      (v) =>
        (v.canal === Canal.VENTA_DIRECTA || v.canal === Canal.VENTA_CRUZADA) &&
        v.moneda === "L",
    )
    .reduce((s, v) => s + v.primaNetaAnual, 0);

  const directaCruzadaUSD = propias
    .filter(
      (v) =>
        (v.canal === Canal.VENTA_DIRECTA || v.canal === Canal.VENTA_CRUZADA) &&
        v.moneda === "$",
    )
    .reduce((s, v) => s + v.primaNetaAnual, 0);

  return { fusiona2L, directaCruzadaL, directaCruzadaUSD };
};

/** Producción relevante según el tipo de meta */
export const prodForTipo = (
  prod: ProduccionPorTipo,
  tipo: MetaTipo,
): number => {
  if (tipo === "fusiona2_l") return prod.fusiona2L;
  if (tipo === "directa_cruzada_l") return prod.directaCruzadaL;
  return prod.directaCruzadaUSD;
};

// ─── Service ─────────────────────────────────────────────────────────────────

export const MetasService = {
  getAll: async (): Promise<MetaMensual[]> =>
    apiRequest<MetaMensual[]>("/api/metas"),

  /** Todas las metas del mes actual para un vendedor (una por tipo asignado) */
  getAllForVendorCurrentMonth: async (
    vendedorId: string,
  ): Promise<MetaMensual[]> => {
    return apiRequest<MetaMensual[]>(
      `/api/metas/vendedor/${vendedorId}/mes-actual`,
    );
  },

  /** Crear asignación (vendedorId + mes + año + tipo es única) */
  assign: async (input: MetaMensualInput): Promise<MetaMensual> =>
    apiRequest<MetaMensual>("/api/metas", {
      method: "POST",
      body: input,
    }),

  /** Eliminar una asignación */
  remove: async (id: string): Promise<void> => {
    await apiRequest<{ ok: boolean }>(`/api/metas/${id}`, {
      method: "DELETE",
    });
  },
};

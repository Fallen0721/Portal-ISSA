export type VehicleComparisonMode = "individual" | "colectivo";

export type VehicleOrigin = "agencia" | "importado";

export type VehicleCompanyId =
  | "ficohsa"
  | "davivienda"
  | "mapfre"
  | "crefisa"
  | "continental";

export type VehicleTypeId =
  | "turismo"
  | "camioneta"
  | "pickup"
  | "microbus"
  | "panel"
  | "camion"
  | "cabezal"
  | "motocicleta"
  | "blindado"
  | "transporte_publico"
  | "camion_carga_pesada";

export interface VehicleEntry {
  id: string;
  origin: VehicleOrigin | "";
  brand: string;
  type: VehicleTypeId | "";
  model: string;
  year: string;
  insuredValue: string;
}

export interface VehicleFieldErrors {
  origin?: string;
  brand?: string;
  type?: string;
  model?: string;
  year?: string;
  insuredValue?: string;
}

export interface VehicleQuoteBreakdown {
  id: string;
  name: string;
  grossPremium: number | null;
  discount: number;
  netPremium: number | null;
  tax: number | null;
  occupants: number;
  emission: number | null;
  total: number | null;
  supported: boolean;
  unavailableReason?: string;
}

export type CoverageValue = string | number;

export interface CoverageRow {
  label: string;
  ficohsa: CoverageValue;
  davivienda: CoverageValue;
}

export interface VehicleComparisonDraft {
  mode: VehicleComparisonMode;
  customerName: string;
  vehicles: VehicleEntry[];
}

export interface VehicleRate {
  id: string;
  companyId: VehicleCompanyId;
  mode: VehicleComparisonMode;
  vehicleType: VehicleTypeId;
  origin?: VehicleOrigin | null;
  insuredValueMin?: number | null;
  insuredValueMax?: number | null;
  rate: number;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleRateInput {
  companyId: VehicleCompanyId;
  mode: VehicleComparisonMode;
  vehicleType: VehicleTypeId;
  origin?: VehicleOrigin | null;
  insuredValueMin?: number | null;
  insuredValueMax?: number | null;
  rate: number;
}

export interface VehicleQuoteHistory {
  id: string;
  ownerUserId: string;
  createdByName: string;
  createdByEmail: string;
  customerName: string;
  mode: VehicleComparisonMode;
  vehicles: VehicleEntry[];
  quotes: VehicleQuoteBreakdown[];
  totalInsuredValue: number;
  createdAt: string;
}

export interface VehicleQuoteHistoryInput {
  mode: VehicleComparisonMode;
  customerName: string;
  vehicles: VehicleEntry[];
  quotes: VehicleQuoteBreakdown[];
  totalInsuredValue: number;
}

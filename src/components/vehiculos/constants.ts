import {
  CoverageRow,
  VehicleCompanyId,
  VehicleComparisonMode,
  VehicleOrigin,
  VehicleTypeId,
} from "./types";

export const MODE_OPTIONS: { value: VehicleComparisonMode; label: string; description: string }[] = [
  {
    value: "individual",
    label: "Individual",
    description: "Cotiza un solo vehiculo con detalle completo y comparativo inmediato.",
  },
  {
    value: "colectivo",
    label: "Colectivo",
    description: "Arma una flota y suma tantos vehiculos como necesites.",
  },
];

export const VEHICLE_ORIGIN_OPTIONS: { value: VehicleOrigin; label: string }[] = [
  { value: "agencia", label: "Agencia" },
  { value: "importado", label: "Importado" },
];

export const VEHICLE_TYPE_OPTIONS: { value: VehicleTypeId; label: string }[] = [
  { value: "turismo", label: "Turismo" },
  { value: "camioneta", label: "Camioneta" },
  { value: "pickup", label: "Pick-up" },
  { value: "microbus", label: "Microbus" },
  { value: "panel", label: "Panel" },
  { value: "camion", label: "Camion" },
  { value: "cabezal", label: "Cabezal" },
  { value: "motocicleta", label: "Motocicleta" },
  { value: "blindado", label: "Blindado" },
  { value: "transporte_publico", label: "Transporte publico" },
  { value: "camion_carga_pesada", label: "Camion carga pesada" },
];

export const VEHICLE_TYPE_LABELS: Record<VehicleTypeId, string> = {
  turismo: "Turismo",
  camioneta: "Camioneta",
  pickup: "Pick-up",
  microbus: "Microbus",
  panel: "Panel",
  camion: "Camion",
  cabezal: "Cabezal",
  motocicleta: "Motocicleta",
  blindado: "Blindado",
  transporte_publico: "Transporte publico",
  camion_carga_pesada: "Camion carga pesada",
};

export const VEHICLE_ORIGIN_LABELS: Record<VehicleOrigin, string> = {
  agencia: "Agencia",
  importado: "Importado",
};

export const VEHICLE_COMPANY_OPTIONS: {
  value: VehicleCompanyId;
  label: string;
}[] = [
  { value: "ficohsa", label: "Ficohsa" },
  { value: "davivienda", label: "Davivienda" },
  { value: "mapfre", label: "Mapfre" },
  { value: "crefisa", label: "Crefisa" },
  { value: "continental", label: "Continental" },
];

export const VEHICLE_COMPANY_LABELS: Record<VehicleCompanyId, string> = {
  ficohsa: "Ficohsa",
  davivienda: "Davivienda",
  mapfre: "Mapfre",
  crefisa: "Crefisa",
  continental: "Continental",
};

export const VEHICLE_PROVIDER_CONFIGS: Record<
  VehicleCompanyId,
  {
    name: string;
    discountRate: number;
    individualEmission: number;
    collectiveEmission: number;
  }
> = {
  ficohsa: {
    name: "Ficohsa",
    discountRate: 0.04,
    individualEmission: 350,
    collectiveEmission: 0,
  },
  davivienda: {
    name: "Davivienda",
    discountRate: 0,
    individualEmission: 500,
    collectiveEmission: 0,
  },
  mapfre: {
    name: "Mapfre",
    discountRate: 0,
    individualEmission: 500,
    collectiveEmission: 0,
  },
  crefisa: {
    name: "Crefisa",
    discountRate: 0,
    individualEmission: 500,
    collectiveEmission: 0,
  },
  continental: {
    name: "Continental",
    discountRate: 0,
    individualEmission: 500,
    collectiveEmission: 0,
  },
};

export const COLLECTIVE_COVERAGES: CoverageRow[] = [
  {
    label: "Responsabilidad civil daños a terceros en bienes",
    ficohsa: 1000000,
    davivienda: 800000,
  },
  {
    label: "Responsabilidad civil daños a terceros en personas",
    ficohsa: 1000000,
    davivienda: 800000,
  },
  {
    label: "Gastos medicos por ocupantes",
    ficohsa: 200000,
    davivienda: 150000,
  },
  {
    label: "Seguro de ocupantes por muerte accidental",
    ficohsa: 400000,
    davivienda: 400000,
  },
  {
    label: "Seguro de ocupantes por incapacidad permanente",
    ficohsa: 400000,
    davivienda: 400000,
  },
];

export const INDIVIDUAL_BASE_COVERAGES: CoverageRow[] = [
  {
    label: "Responsabilidad civil daños a terceros en bienes",
    ficohsa: 1000000,
    davivienda: 1000000,
  },
  {
    label: "Responsabilidad civil daños a terceros en personas",
    ficohsa: 1000000,
    davivienda: 1000000,
  },
  {
    label: "Gastos medicos por ocupantes",
    ficohsa: 200000,
    davivienda: 200000,
  },
  {
    label: "Seguro de ocupantes por muerte accidental",
    ficohsa: 400000,
    davivienda: 400000,
  },
  {
    label: "Seguro de ocupantes por incapacidad permanente",
    ficohsa: 400000,
    davivienda: 400000,
  },
];

export const INDIVIDUAL_SPECIAL_COVERAGES: CoverageRow[] = [
  { label: "Excesos de velocidad", ficohsa: "Amparada", davivienda: "Amparada" },
  { label: "Altos", ficohsa: "Amparada", davivienda: "Amparada" },
  { label: "Semaforos en rojo", ficohsa: "Amparada", davivienda: "Amparada" },
  { label: "Contravia", ficohsa: "Excluido", davivienda: "Excluida" },
  { label: "Linea continua", ficohsa: "Excluido", davivienda: "Excluida" },
  { label: "Licencias vencidas", ficohsa: "90 dias", davivienda: "180 dias" },
  {
    label: "No guardar la distancia minima entre vehiculos",
    ficohsa: "Amparada",
    davivienda: "Amparada",
  },
  {
    label: "Mayoria y minoria de edad gratuita sin reportar",
    ficohsa: "Amparada",
    davivienda: "Amparada",
  },
  { label: "RC cruzada", ficohsa: "Amparada", davivienda: "Amparada" },
  {
    label: "Dano malicioso hasta L 25,000.00",
    ficohsa: "Amparada",
    davivienda: "Amparada",
  },
  { label: "Proyectiles", ficohsa: "Amparada", davivienda: "Amparada" },
  { label: "Caidas de arboles", ficohsa: "Amparada", davivienda: "Amparada" },
  {
    label: "Restitucion de suma asegurada sin prima adicional",
    ficohsa: "Amparada",
    davivienda: "Amparada",
  },
];

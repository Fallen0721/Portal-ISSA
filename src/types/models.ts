export type AppRole = "admin" | "comercial" | "daños" | "personas" | "gerente_comercial";

export const APP_ROLES: AppRole[] = ["admin", "comercial", "daños", "personas", "gerente_comercial"];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  comercial: "Comercial",
  daños: "Daños",
  personas: "Personas",
  gerente_comercial: "Gerente Comercial",
};

export interface AppUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: AppRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  userId: string;
  role: AppRole;
  loginAt: string;
}

export interface CrudPermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface PermissionMap {
  dashboard: boolean;
  ventas: CrudPermission;
  cotizador_viaje: {
    view: boolean;
    create: boolean;
    edit: boolean;
    convert: boolean;
  };
  cotizador_vehiculo: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  permisos: CrudPermission;
  usuarios: CrudPermission;
  metas: { view: boolean; create: boolean; edit: boolean };
}

export interface CatalogItem {
  id: string;
  nombre: string;
  area?: string | null;
  createdAt: string;
}

export type StatusGestionTipo = "prospecto" | "venta";

export interface StatusGestion {
  id: string;
  tipo: StatusGestionTipo;
  nombre: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatusGestionInput {
  tipo: StatusGestionTipo;
  nombre: string;
}

export enum VentaStatus {
  PRIMER_CONTACTO_REALIZADO = "Primer contacto realizado",
  NO_CONTACTADO = "No contactado",
  NO_INTERESADO = "No interesado",
  CITA_PROGRAMADA = "Cita programada",
  COTIZACION_ENVIADA = "Cotización enviada",
  SEGUIMIENTO_COTIZACION = "Seguimiento de cotización",
  AJUSTES_COTIZACION = "Ajustes de cotización",
  INTERESADO_PENDIENTE_DECISION = "Interesado - pendiente decisión",
  NO_TOMADO_POR_CLIENTE = "No tomado por el cliente",
  SOLICITUD_EN_LLENADO = "Solicitud en llenado",
  DOCUMENTOS_PENDIENTES = "Documentos pendientes",
  EN_REVISION_INTERNA = "En revisión interna",
  INGRESADO_A_COMPANIA = "Ingresado a compañía",
  REQUERIMIENTOS_ADICIONALES = "Requerimientos adicionales (exámenes/documentos)",
  APROBADO_POR_COMPANIA = "Aprobado por la compañía",
  PAGO_PENDIENTE = "Pago pendiente",
  POLIZA_EMITIDA = "Póliza emitida",
  POLIZA_ENTREGADA = "Póliza entregada",
  NUEVO = "Nuevo",
  TRAMITE_CANCELADO_POR_COMPANIA = "Trámite cancelado por la compañía",
}

export type VentaStatusGroupKey =
  | "prospeccion"
  | "gestion_comercial"
  | "decision_cliente"
  | "proceso_emision"
  | "proceso_aseguradora"
  | "cierre"
  | "perdida";

export interface VentaStatusGroup {
  key: VentaStatusGroupKey;
  label: string;
  badgeClassName: string;
  statuses: string[];
}

export const VENTA_STATUS_GROUPS: VentaStatusGroup[] = [
  {
    key: "prospeccion",
    label: "Prospección",
    badgeClassName: "bg-yellow-100 text-yellow-800",
    statuses: [
      VentaStatus.PRIMER_CONTACTO_REALIZADO,
      VentaStatus.NO_CONTACTADO,
    ],
  },
  {
    key: "gestion_comercial",
    label: "Gestión comercial",
    badgeClassName: "bg-blue-100 text-blue-800",
    statuses: [
      VentaStatus.CITA_PROGRAMADA,
      VentaStatus.COTIZACION_ENVIADA,
      VentaStatus.SEGUIMIENTO_COTIZACION,
      VentaStatus.AJUSTES_COTIZACION,
    ],
  },
  {
    key: "decision_cliente",
    label: "Decisión del cliente",
    badgeClassName: "bg-violet-100 text-violet-800",
    statuses: [
      VentaStatus.INTERESADO_PENDIENTE_DECISION,
    ],
  },
  {
    key: "proceso_emision",
    label: "Proceso de emisión",
    badgeClassName: "bg-emerald-100 text-emerald-800",
    statuses: [
      VentaStatus.SOLICITUD_EN_LLENADO,
      VentaStatus.DOCUMENTOS_PENDIENTES,
      VentaStatus.EN_REVISION_INTERNA,
      VentaStatus.INGRESADO_A_COMPANIA,
    ],
  },
  {
    key: "proceso_aseguradora",
    label: "Proceso aseguradora",
    badgeClassName: "bg-orange-100 text-orange-800",
    statuses: [
      VentaStatus.REQUERIMIENTOS_ADICIONALES,
      VentaStatus.APROBADO_POR_COMPANIA,
      VentaStatus.PAGO_PENDIENTE,
    ],
  },
  {
    key: "cierre",
    label: "Cierre",
    badgeClassName: "bg-amber-100 text-amber-900",
    statuses: [
      VentaStatus.POLIZA_EMITIDA,
      VentaStatus.POLIZA_ENTREGADA,
      VentaStatus.NUEVO,
    ],
  },
  {
    key: "perdida",
    label: "Pérdida / cancelación",
    badgeClassName: "bg-rose-100 text-rose-800",
    statuses: [
      VentaStatus.NO_INTERESADO,
      VentaStatus.NO_TOMADO_POR_CLIENTE,
      VentaStatus.TRAMITE_CANCELADO_POR_COMPANIA,
    ],
  },
];

export const VENTA_STATUS_GROUP_BY_STATUS = Object.freeze(
  VENTA_STATUS_GROUPS.reduce<Record<string, VentaStatusGroup>>(
    (accumulator, group) => {
      group.statuses.forEach((status) => {
        accumulator[status] = group;
      });
      return accumulator;
    },
    {} as Record<string, VentaStatusGroup>,
  ),
);

export const VENTA_PERDIDA_STATUSES: string[] = [
  VentaStatus.NO_INTERESADO,
  VentaStatus.NO_TOMADO_POR_CLIENTE,
  VentaStatus.TRAMITE_CANCELADO_POR_COMPANIA,
];

export const VENTA_PRE_CIERRE_STATUSES: string[] = [
  VentaStatus.POLIZA_EMITIDA,
  VentaStatus.POLIZA_ENTREGADA,
];

export const VENTA_CIERRE_TOTAL_STATUSES: string[] = [VentaStatus.NUEVO];

export const VENTA_ACTIVE_PIPELINE_STATUSES: string[] = Object.values(
  VentaStatus,
).filter(
  (status) =>
    !VENTA_PERDIDA_STATUSES.includes(status) &&
    !VENTA_CIERRE_TOTAL_STATUSES.includes(status),
);

export enum Canal {
  VENTA_DIRECTA = "VENTA DIRECTA",
  REFERIDOS = "REFERIDOS",
  REDES_SOCIALES = "REDES SOCIALES",
  VENTA_CRUZADA = "VENTA CRUZADA",
  FUSIONA2 = "Fusiona2",
}

export type CurrencyCode = "L" | "$";
export type RecordSource = "manual" | "cotizacion";
export type CompensationPlan =
  | "none"
  | "fusiona2_lempiras_estandar"
  | "vida_universal_directa_cruzada_usd";

export const COMPENSATION_PLAN_LABELS: Record<CompensationPlan, string> = {
  none: "Sin plan",
  fusiona2_lempiras_estandar: "Fusiona2 estándar (L)",
  vida_universal_directa_cruzada_usd: "Vida Universal Directa/Cruzada (USD)",
};

export interface Venta {
  id: string;
  no: string;
  fechaIngreso: string;
  fechaVigencia?: string | null;
  fechaCierre?: string | null;
  diasProceso: number;
  asegurado: string;
  tipo: string;
  producto: string;
  compania: string;
  status: string;
  moneda: CurrencyCode;
  sumaAsegurada: number;
  primaNetaAnual: number;
  canal: Canal;
  alianza?: string;
  vendedor: string;
  ownerUserId: string;
  observaciones?: string;
  source?: RecordSource;
  cotizacionId?: string;
  compensationPlan?: CompensationPlan;
  primaBasicaCompensable?: number | null;
}

export interface VentaMutationInput
  extends Omit<Venta, "id" | "ownerUserId" | "vendedor"> {
  ownerUserId?: string;
  vendedor?: string;
}

export interface EntradaBitacora {
  id: string;
  ventaId: string;
  usuarioId: string | null;
  nombreUsuario: string | null;
  tipo: "estado" | "actividad";
  contenido: string;
  datosExtra?: { de?: string; a?: string; tipoEstado?: "prospecto" | "venta" | null } | null;
  fechaInicio: string | null;
  fechaFinAprox: string | null;
  finalizada: boolean;
  finalizadaEn: string | null;
  creadoEn: string;
}

export enum PermisoTipo {
  PERMISO = "PERMISO",
  VACACIONES = "VACACIONES",
  INCAPACIDAD = "INCAPACIDAD",
  OTRO = "OTRO",
}

export enum PermisoStatus {
  SOLICITADO = "SOLICITADO",
  APROBADO = "APROBADO",
  RECHAZADO = "RECHAZADO",
  CANCELADO = "CANCELADO",
}

export interface PermisoLaboral {
  id: string;
  empleado: string;
  departamento?: string;
  tipo: PermisoTipo;
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  motivo: string;
  status: PermisoStatus;
  observaciones?: string;
  creadoEn: string;
  ownerUserId?: string;
}

export type PermisoMutationInput = Omit<PermisoLaboral, "id" | "creadoEn">;

export interface DateRange {
  from: string | null;
  to: string | null;
}

export interface GlobalFiltersState {
  search: string;
  dateRange: DateRange;
}

export type QuoteStep = 1 | 2 | 3;
export type PlanId = "estudiantil" | "empresarial" | "personal";
export type TravelerType = "adulto" | "nino";
export type InsuranceProvider = "VUMI" | "BMI" | "RedBridge";
export type CotizacionStatus =
  | "borrador"
  | "cotizada"
  | "en_seguimiento"
  | "convertida"
  | "descartada";

export interface Traveler {
  id: number;
  type: TravelerType;
}

export interface CotizacionFormData {
  quoteDate: string;
  fullName: string;
  birthDate: string;
  email: string;
  departureDate: string;
  returnDate: string;
  destination: string;
  phone: string;
  travelersCount: number;
  travelers: Traveler[];
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  dailyRate: number;
  shortDescription: string;
  benefits: string[];
}

export interface InsuranceOption {
  id: string;
  provider: InsuranceProvider;
  productName: string;
  coverageMedical: number;
  coverageBaggage: number;
  coverageCancellation: number;
  deductible: number;
  factor: number;
  highlight?: string;
  benefits: string[];
}

export interface ComputedQuote extends InsuranceOption {
  price: number;
  previousPrice: number;
  savings: number;
}

export interface Cotizacion {
  id: string;
  ownerUserId: string;
  status: CotizacionStatus;
  formData: CotizacionFormData;
  selectedPlanId: PlanId;
  quotes: ComputedQuote[];
  recommendedQuoteId?: string;
  createdAt: string;
  updatedAt: string;
  convertedVentaId?: string;
}

export interface CotizacionDraft {
  ownerUserId: string;
  step: QuoteStep;
  formData: CotizacionFormData;
  selectedPlanId: PlanId | "";
  updatedAt: string;
  currentQuoteId?: string;
}

export interface ClienteLite {
  id: string;
  email: string;
  phone: string;
  name: string;
  lastActivityAt: string;
  quoteIds: string[];
  ventaIds: string[];
}

export interface UserMutationInput {
  username: string;
  name: string;
  email: string;
  role: AppRole;
  password?: string;
  isActive: boolean;
}

export type MetaTipo =
  | "fusiona2_l"
  | "directa_cruzada_l"
  | "directa_cruzada_usd";

export const META_TIPO_LABELS: Record<MetaTipo, string> = {
  fusiona2_l: "Canal Fusiona2 (Lempiras)",
  directa_cruzada_l: "Canal Directo/Cruzada (Lempiras)",
  directa_cruzada_usd: "Canal Directo/Cruzada (USD)",
};

export const ALL_META_TIPOS: MetaTipo[] = [
  "fusiona2_l",
  "directa_cruzada_l",
  "directa_cruzada_usd",
];

export interface MetaMensual {
  id: string;
  vendedorId: string;
  mes: number;
  año: number;
  tipo: MetaTipo;
  manualPercentage?: number | null;
  manualValue?: number | null;
}

export enum VentaVidaStatus {
  INGRESADA = "Ingresada",
  APROBADA = "Aprobada",
  NUEVA = "Nueva",
  TCC = "TCC",
  NT = "NT",
  ASIGNACION = "Asignacion",
}

export enum CanalVida {
  FUSIONA2 = "Fusiona2",
  VENTA_CRUZADA = "Venta Cruzada",
  VENTA_DIRECTA = "Venta Directa",
  REDES_SOCIALES = "Redes Sociales",
  AGENTE_EXTERNO = "Agente Externo",
  REFERIDO = "Referido",
  OFICINA_ISSA = "Oficina / Issa",
}

export const COMPANIAS_VIDA = [
  "PALIG",
  "DAVIVIENDA",
  "MAPFRE",
  "FICOHSA",
  "LAFISE",
  "ATLANTIDA",
  "SEGUROS DEL PAIS",
  "CONTINENTAL",
  "CREFISA",
] as const;

export interface VentaVida {
  id: string;
  no: string | null;
  fechaIngreso: string;
  fechaVigencia?: string | null;
  asegurado: string;
  tipo: string;
  producto: string;
  ramo?: string;
  compania: string;
  status: string;
  moneda: CurrencyCode;
  sumaAsegurada: number;
  primaPlaneada: number;
  primaBasica?: number | null;
  creadoPor: string;
  agente?: string | null;
  alianza?: string | null;
  oficialNegocios?: string;
  canal: string;
  ownerUserId: string;
  observaciones?: string;
}

export interface VentaVidaMutationInput extends Omit<VentaVida, "id" | "ownerUserId" | "creadoPor"> {
  ownerUserId?: string;
}

export const COMPANIAS_SALUD = [
  "PALIG",
  "MAPFRE",
  "LAFISE",
  "DAVIVIENDA",
  "ATLANTIDA",
  "CREFISA",
  "FICOHSA",
  "SEGUROS DEL PAIS",
  "CONTINENTAL",
] as const;

export interface VentaSalud {
  id: string;
  no: string | null;
  fechaIngreso: string;
  fechaVigencia?: string | null;
  asegurado: string;
  tipo: string;
  producto: string;
  ramo?: string;
  compania: string;
  status: string;
  moneda: CurrencyCode;
  sumaAsegurada: number;
  primaPlaneada: number;
  primaBasica?: number | null;
  creadoPor: string;
  agente?: string | null;
  alianza?: string | null;
  oficialNegocios?: string;
  canal: string;
  ownerUserId: string;
  observaciones?: string;
}

export interface VentaSaludMutationInput extends Omit<VentaSalud, "id" | "ownerUserId" | "creadoPor"> {
  ownerUserId?: string;
}

export interface MetaMensualInput {
  vendedorId: string;
  mes: number;
  año: number;
  tipo: MetaTipo;
  manualPercentage?: number | null;
  manualValue?: number | null;
}

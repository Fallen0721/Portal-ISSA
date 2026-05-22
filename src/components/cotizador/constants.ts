import countries from "i18n-iso-countries";
import countriesEs from "i18n-iso-countries/langs/es.json";
import {
  CotizacionStatus,
  PlanDefinition,
  TravelerType,
} from "../../types/models";

countries.registerLocale(countriesEs);

export const COUNTRY_OPTIONS = Object.entries(
  countries.getNames("es", { select: "official" }),
)
  .map(([, name]) => ({ value: name, label: name }))
  .sort((a, b) => a.label.localeCompare(b.label, "es"));

export const PLAN_OPTIONS: PlanDefinition[] = [
  {
    id: "estudiantil",
    name: "Plan Estudiantil",
    dailyRate: 4.9,
    shortDescription:
      "Pensado para estudios, intercambios y programas academicos.",
    benefits: [
      "Cobertura medica internacional",
      "Asistencia por perdida de equipaje",
      "Telemedicina 24/7",
      "Cobertura para actividades academicas",
    ],
  },
  {
    id: "empresarial",
    name: "Plan Empresarial",
    dailyRate: 7.6,
    shortDescription:
      "Diseñado para viajes corporativos con mayor nivel de respaldo.",
    benefits: [
      "Cobertura medica alta prioridad",
      "Asistencia legal y ejecutiva",
      "Cobertura por retraso de viaje",
      "Repatriacion y acompanamiento",
    ],
  },
  {
    id: "personal",
    name: "Plan Personal",
    dailyRate: 6.2,
    shortDescription:
      "Plan flexible para turismo, vacaciones y viajes familiares.",
    benefits: [
      "Asistencia medica por emergencia",
      "Cobertura de medicamentos urgentes",
      "Compensacion por equipaje demorado",
      "Asistencia medica por accidentes",
    ],
  },
];

export const INSURANCE_OPTIONS = [
  {
    id: "vumi-global-protect",
    provider: "VUMI",
    productName: "Global Protect",
    coverageMedical: 75000,
    coverageBaggage: 2000,
    coverageCancellation: 2500,
    deductible: 0,
    factor: 1.05,
    highlight: "Balanceado",
    benefits: [
      "Asistencia medica integral",
      "Telemedicina",
      "Traslado medico de emergencia",
    ],
  },
  {
    id: "bmi-travel-plus",
    provider: "BMI",
    productName: "Travel Plus",
    coverageMedical: 100000,
    coverageBaggage: 2500,
    coverageCancellation: 3500,
    deductible: 0,
    factor: 1.2,
    highlight: "Recomendado",
    benefits: [
      "Cobertura medica ampliada",
      "Cobertura de cancelacion",
      "Asistencia 24/7",
    ],
  },
  {
    id: "redbridge-smart",
    provider: "RedBridge",
    productName: "Smart Trip",
    coverageMedical: 60000,
    coverageBaggage: 1500,
    coverageCancellation: 2000,
    deductible: 50,
    factor: 0.95,
    benefits: [
      "Precio competitivo",
      "Cobertura basica de viaje",
      "Asistencia por equipaje",
    ],
  },
  {
    id: "redbridge-premium",
    provider: "RedBridge",
    productName: "Premium Trip",
    coverageMedical: 150000,
    coverageBaggage: 3500,
    coverageCancellation: 5000,
    deductible: 0,
    factor: 1.45,
    highlight: "Cobertura Maxima",
    benefits: [
      "Cobertura medica superior",
      "Asistencia VIP",
      "Compensacion extendida",
    ],
  },
] as const;

export const travelerTypeLabel: Record<TravelerType, string> = {
  adulto: "Adulto",
  nino: "Niño",
};

export const statusConfig: Record<
  CotizacionStatus,
  { label: string; className: string }
> = {
  borrador: {
    label: "Borrador",
    className: "bg-slate-100 text-slate-700",
  },
  cotizada: {
    label: "Cotizada",
    className: "bg-primary/10 text-primary",
  },
  en_seguimiento: {
    label: "En seguimiento",
    className: "bg-amber-100 text-amber-700",
  },
  convertida: {
    label: "Convertida",
    className: "bg-emerald-100 text-emerald-700",
  },
  descartada: {
    label: "Descartada",
    className: "bg-rose-100 text-rose-700",
  },
};

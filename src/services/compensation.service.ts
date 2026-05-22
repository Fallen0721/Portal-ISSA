import {
  endOfDay,
  isSameDay,
  isSameMonth,
  isSameWeek,
  isSameYear,
  parseISO,
} from "date-fns";
import { Venta, VENTA_CIERRE_TOTAL_STATUSES } from "../types/models";

export type DashboardDateFilter = "hoy" | "semana" | "mes" | "anual";
export interface CompensationTier {
  threshold: number;
  rate: number;
}
export type VendorLempiraScheme = "directa_cruzada" | "fusiona2" | "mixed";

export interface VendorCompensationSnapshot {
  ownerUserId: string;
  vendedor: string;
  usdEligibleSales: number;
  usdBase: number;
  usdBaseBonus: number;
  usdAdditionalBonus: number;
  usdBonus: number;
  lempiraEligibleSales: number;
  lempiraProduction: number;
  lempiraRate: number;
  lempiraBonus: number;
  lempiraScheme: VendorLempiraScheme;
}

export interface CompensationSnapshot {
  vendors: VendorCompensationSnapshot[];
  totals: VendorCompensationSnapshot;
}

export const USD_PROGRESS_TIERS: CompensationTier[] = [
  { threshold: 3000, rate: 0.1 },
  { threshold: 5000, rate: 0.15 },
  { threshold: 7000, rate: 0.2 },
  { threshold: 10000, rate: 0.25 },
];
export const DIRECT_CROSS_LEMPIRA_TIERS: CompensationTier[] = [
  { threshold: 250000, rate: 0.034 },
  { threshold: 400000, rate: 0.035 },
  { threshold: 425000, rate: 0.036 },
  { threshold: 450000, rate: 0.0375 },
  { threshold: 500000, rate: 0.04 },
  { threshold: 750000, rate: 0.0425 },
  { threshold: 1000000, rate: 0.045 },
];
export const FUSIONA2_LEMPIRA_TIERS: CompensationTier[] = [
  { threshold: 400000, rate: 0.0225 },
  { threshold: 425000, rate: 0.0235 },
  { threshold: 450000, rate: 0.0267 },
  { threshold: 500000, rate: 0.028 },
  { threshold: 750000, rate: 0.0293 },
  { threshold: 1000000, rate: 0.03 },
];

const createEmptySnapshot = (
  ownerUserId = "total",
  vendedor = "Total",
): VendorCompensationSnapshot => ({
  ownerUserId,
  vendedor,
  usdEligibleSales: 0,
  usdBase: 0,
  usdBaseBonus: 0,
  usdAdditionalBonus: 0,
  usdBonus: 0,
  lempiraEligibleSales: 0,
  lempiraProduction: 0,
  lempiraRate: 0,
  lempiraBonus: 0,
  lempiraScheme: ownerUserId === "total" ? "mixed" : "directa_cruzada",
});

const safeParseDate = (value: string) => {
  try {
    return parseISO(value);
  } catch {
    return null;
  }
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const isDollarCurrency = (value: string) => {
  const normalized = normalizeText(value);
  return (
    value === "$" ||
    normalized === "usd" ||
    normalized === "dolares" ||
    normalized === "dolares usd" ||
    normalized === "dolar"
  );
};

const isLempiraCurrency = (value: string) => {
  const normalized = normalizeText(value);
  return value === "L" || normalized === "lempiras" || normalized === "l";
};

const isDirectOrCrossChannel = (canal: string) => {
  const normalized = normalizeText(canal);
  return normalized === "venta directa" || normalized === "venta cruzada";
};

const isFusiona2Channel = (canal: string) => {
  const normalized = normalizeText(canal);
  return normalized === "fusiona2" || normalized === "fusionados";
};

const isEligibleNewSale = (venta: Venta) =>
  normalizeText(venta.tipo) === "nueva" &&
  VENTA_CIERRE_TOTAL_STATUSES.includes(venta.status);

const isUsdCompensationEligible = (venta: Venta) =>
  isEligibleNewSale(venta) &&
  isDollarCurrency(venta.moneda) &&
  isDirectOrCrossChannel(venta.canal);

export const getVendorLempiraScheme = (
  _ownerUserId: string,
): VendorLempiraScheme => {
  return "directa_cruzada";
};

export const getLempiraTiersForScheme = (scheme: VendorLempiraScheme) => {
  if (scheme === "fusiona2") {
    return FUSIONA2_LEMPIRA_TIERS;
  }

  return DIRECT_CROSS_LEMPIRA_TIERS;
};

const isLempiraCompensationEligible = (
  venta: Venta,
  scheme: VendorLempiraScheme,
) => {
  if (!isEligibleNewSale(venta) || !isLempiraCurrency(venta.moneda)) {
    return false;
  }

  if (scheme === "fusiona2") {
    return isFusiona2Channel(venta.canal);
  }

  return isDirectOrCrossChannel(venta.canal);
};

const getRelevantDate = (venta: Venta) =>
  venta.fechaCierre ?? venta.fechaIngreso;

const isWithinVisibleRange = (
  venta: Venta,
  filter: DashboardDateFilter,
  now: Date,
) => {
  const date = safeParseDate(getRelevantDate(venta));
  if (!date || date.getTime() > now.getTime()) return false;

  switch (filter) {
    case "hoy":
      return isSameDay(date, now);
    case "semana":
      return isSameWeek(date, now, { weekStartsOn: 1 });
    case "mes":
      return isSameMonth(date, now) && isSameYear(date, now);
    case "anual":
      return isSameYear(date, now);
    default:
      return false;
  }
};

const getUsdAdditionalRate = (base: number) => {
  if (base >= 10000) return 0.25;
  if (base > 7000) return 0.2;
  if (base > 5000) return 0.15;
  if (base >= 3000) return 0.1;
  return 0;
};

const getTierRate = (value: number, tiers: CompensationTier[]) =>
  getCurrentTier(value, tiers)?.rate ?? 0;

export const getCurrentTier = (
  value: number,
  tiers: CompensationTier[],
): CompensationTier | null => {
  let currentTier: CompensationTier | null = null;

  for (const tier of tiers) {
    if (value >= tier.threshold) {
      currentTier = tier;
    }
  }

  return currentTier;
};

export const getNextTier = (
  value: number,
  tiers: CompensationTier[],
): CompensationTier | null => {
  for (const tier of tiers) {
    if (value < tier.threshold) {
      return tier;
    }
  }

  return null;
};

const getMonthKey = (fechaIngreso: string) => {
  const date = safeParseDate(fechaIngreso);
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const calculateUsdSnapshot = (
  ventas: Venta[],
  filter: DashboardDateFilter,
  now: Date,
) => {
  const eligibleVentas = ventas.filter(
    (venta) =>
      isUsdCompensationEligible(venta) &&
      isWithinVisibleRange(venta, filter, now),
  );

  return eligibleVentas.reduce(
    (summary, venta) => {
      const base = venta.primaBasicaCompensable ?? venta.primaNetaAnual;
      const additionalRate = getUsdAdditionalRate(base);
      const baseBonus = base * 0.25;
      const additionalBonus = base * additionalRate;

      summary.usdEligibleSales += 1;
      summary.usdBase += base;
      summary.usdBaseBonus += baseBonus;
      summary.usdAdditionalBonus += additionalBonus;
      summary.usdBonus += baseBonus + additionalBonus;
      return summary;
    },
    createEmptySnapshot(),
  );
};

const calculateLempiraSnapshot = (
  ventas: Venta[],
  filter: DashboardDateFilter,
  now: Date,
  scheme: VendorLempiraScheme,
) => {
  const tiers = getLempiraTiersForScheme(scheme);
  const eligibleVentas = ventas.filter((venta) => {
    if (!isLempiraCompensationEligible(venta, scheme)) return false;
    return isWithinVisibleRange(venta, filter, now);
  });

  if (filter !== "anual") {
    const production = eligibleVentas.reduce(
      (sum, venta) => sum + venta.primaNetaAnual,
      0,
    );
    const rate = getTierRate(production, tiers);

    return {
      lempiraEligibleSales: eligibleVentas.length,
      lempiraProduction: production,
      lempiraRate: rate,
      lempiraBonus: production * rate,
    };
  }

  const monthlyGroups = eligibleVentas.reduce<Record<string, Venta[]>>(
    (groups, venta) => {
      const key = getMonthKey(getRelevantDate(venta));
      if (!key) return groups;

      if (!groups[key]) groups[key] = [];
      groups[key].push(venta);
      return groups;
    },
    {},
  );

  const production = eligibleVentas.reduce(
    (sum, venta) => sum + venta.primaNetaAnual,
    0,
  );
  const bonus = Object.values(monthlyGroups).reduce((sum, monthVentas) => {
    const monthProduction = monthVentas.reduce(
      (monthSum, venta) => monthSum + venta.primaNetaAnual,
      0,
    );
    return sum + monthProduction * getTierRate(monthProduction, tiers);
  }, 0);

  return {
    lempiraEligibleSales: eligibleVentas.length,
    lempiraProduction: production,
    lempiraRate: production > 0 ? bonus / production : 0,
    lempiraBonus: bonus,
  };
};

const createVendorSnapshot = (
  ownerUserId: string,
  vendedor: string,
  ventas: Venta[],
  filter: DashboardDateFilter,
  now: Date,
): VendorCompensationSnapshot => {
  const lempiraScheme = getVendorLempiraScheme(ownerUserId);
  const usdSnapshot = calculateUsdSnapshot(ventas, filter, now);
  const lempiraSnapshot = calculateLempiraSnapshot(
    ventas,
    filter,
    now,
    lempiraScheme,
  );

  return {
    ownerUserId,
    vendedor,
    usdEligibleSales: usdSnapshot.usdEligibleSales,
    usdBase: usdSnapshot.usdBase,
    usdBaseBonus: usdSnapshot.usdBaseBonus,
    usdAdditionalBonus: usdSnapshot.usdAdditionalBonus,
    usdBonus: usdSnapshot.usdBonus,
    lempiraEligibleSales: lempiraSnapshot.lempiraEligibleSales,
    lempiraProduction: lempiraSnapshot.lempiraProduction,
    lempiraRate: lempiraSnapshot.lempiraRate,
    lempiraBonus: lempiraSnapshot.lempiraBonus,
    lempiraScheme,
  };
};

export const CompensationService = {
  getSnapshot(
    ventas: Venta[],
    filter: DashboardDateFilter,
    now = endOfDay(new Date()),
  ): CompensationSnapshot {
    const vendorMap = new Map<string, string>();

    ventas.forEach((venta) => {
      if (!venta.ownerUserId || !venta.vendedor) return;
      vendorMap.set(venta.ownerUserId, venta.vendedor);
    });

    const vendors = Array.from(vendorMap.entries())
      .map(([ownerUserId, vendedor]) =>
        createVendorSnapshot(
          ownerUserId,
          vendedor,
          ventas.filter((venta) => venta.ownerUserId === ownerUserId),
          filter,
          now,
        ),
      )
      .sort((a, b) => a.vendedor.localeCompare(b.vendedor));

    const totals = vendors.reduce((summary, vendor) => {
      summary.usdEligibleSales += vendor.usdEligibleSales;
      summary.usdBase += vendor.usdBase;
      summary.usdBaseBonus += vendor.usdBaseBonus;
      summary.usdAdditionalBonus += vendor.usdAdditionalBonus;
      summary.usdBonus += vendor.usdBonus;
      summary.lempiraEligibleSales += vendor.lempiraEligibleSales;
      summary.lempiraProduction += vendor.lempiraProduction;
      summary.lempiraBonus += vendor.lempiraBonus;
      return summary;
    }, createEmptySnapshot());

    totals.lempiraRate =
      totals.lempiraProduction > 0
        ? totals.lempiraBonus / totals.lempiraProduction
        : 0;
    totals.lempiraScheme = "mixed";

    return { vendors, totals };
  },
};

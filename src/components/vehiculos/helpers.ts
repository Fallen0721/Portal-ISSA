import {
  VEHICLE_COMPANY_OPTIONS,
  VEHICLE_PROVIDER_CONFIGS,
  VEHICLE_TYPE_LABELS,
} from "./constants";
import {
  VehicleCompanyId,
  VehicleComparisonMode,
  VehicleEntry,
  VehicleQuoteBreakdown,
  VehicleRate,
  VehicleTypeId,
} from "./types";

interface ProviderConfig {
  id: VehicleCompanyId;
  name: string;
  discountRate: number;
  individualEmission: number;
  collectiveEmission: number;
}

const PROVIDERS: ProviderConfig[] = VEHICLE_COMPANY_OPTIONS.map(({ value }) => ({
  id: value,
  ...VEHICLE_PROVIDER_CONFIGS[value],
}));

const createLocalId = (prefix: string) => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const roundCurrency = (value: number) => Number(value.toFixed(2));

export const parseInsuredValue = (value: string) => {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
};

const hasNumericValue = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined;

const matchesInsuredValueRange = (rate: VehicleRate, insuredValue: number) => {
  if (hasNumericValue(rate.insuredValueMin) && insuredValue < rate.insuredValueMin) {
    return false;
  }

  if (hasNumericValue(rate.insuredValueMax) && insuredValue > rate.insuredValueMax) {
    return false;
  }

  return true;
};

const getSpecificityScore = (rate: VehicleRate) => {
  const hasRange =
    hasNumericValue(rate.insuredValueMin) || hasNumericValue(rate.insuredValueMax);
  const rangeSpan = hasRange
    ? (rate.insuredValueMax ?? Number.MAX_SAFE_INTEGER) - (rate.insuredValueMin ?? 0)
    : Number.MAX_SAFE_INTEGER;

  return {
    score: (rate.origin ? 100 : 0) + (hasRange ? 10 : 0),
    rangeSpan,
  };
};

const resolveVehicleRate = (
  companyId: VehicleCompanyId,
  mode: VehicleComparisonMode,
  vehicle: VehicleEntry,
  rates: VehicleRate[],
) => {
  if (!vehicle.type) return null;

  const insuredValue = parseInsuredValue(vehicle.insuredValue);
  const candidates = rates
    .filter(
      (rate) =>
        rate.companyId === companyId &&
        rate.mode === mode &&
        rate.vehicleType === vehicle.type &&
        (!rate.origin || rate.origin === vehicle.origin) &&
        matchesInsuredValueRange(rate, insuredValue),
    )
    .sort((left, right) => {
      const leftSpecificity = getSpecificityScore(left);
      const rightSpecificity = getSpecificityScore(right);

      if (leftSpecificity.score !== rightSpecificity.score) {
        return rightSpecificity.score - leftSpecificity.score;
      }

      if (leftSpecificity.rangeSpan !== rightSpecificity.rangeSpan) {
        return leftSpecificity.rangeSpan - rightSpecificity.rangeSpan;
      }

      return (right.insuredValueMin ?? 0) - (left.insuredValueMin ?? 0);
    });

  return candidates[0]?.rate ?? null;
};

export const createEmptyVehicle = (): VehicleEntry => ({
  id: createLocalId("veh"),
  origin: "",
  brand: "",
  type: "",
  model: "",
  year: "",
  insuredValue: "",
});

export const getVehiclesForMode = (
  mode: VehicleComparisonMode,
  vehicles: VehicleEntry[],
) => {
  const safeVehicles = vehicles.length > 0 ? vehicles : [createEmptyVehicle()];
  return mode === "individual" ? safeVehicles.slice(0, 1) : safeVehicles;
};

export const getVehicleTypeLabel = (type: VehicleTypeId | "") =>
  type ? VEHICLE_TYPE_LABELS[type] : "Sin tipo";

export const getConfiguredVehicleProviders = (
  mode: VehicleComparisonMode,
  rates: VehicleRate[],
) => {
  const configuredCompanies = new Set(
    rates.filter((rate) => rate.mode === mode).map((rate) => rate.companyId),
  );

  return PROVIDERS.filter((provider) => configuredCompanies.has(provider.id));
};

export const calculatePortfolioInsuredValue = (vehicles: VehicleEntry[]) =>
  roundCurrency(
    vehicles.reduce(
      (total, vehicle) => total + parseInsuredValue(vehicle.insuredValue),
      0,
    ),
  );

export const buildVehicleComparison = (
  mode: VehicleComparisonMode,
  vehicles: VehicleEntry[],
  rates: VehicleRate[],
) => {
  const scopedVehicles = getVehiclesForMode(mode, vehicles);
  const quotes: VehicleQuoteBreakdown[] = getConfiguredVehicleProviders(
    mode,
    rates,
  ).map((provider) => {
    const unsupportedVehicles = scopedVehicles.filter((vehicle) => {
      const rate = resolveVehicleRate(provider.id, mode, vehicle, rates);
      return rate === null;
    });

    if (unsupportedVehicles.length > 0) {
      const unsupportedTypes = Array.from(
        new Set(
          unsupportedVehicles.map((vehicle) => getVehicleTypeLabel(vehicle.type)),
        ),
      );

      return {
        id: provider.id,
        name: provider.name,
        grossPremium: null,
        discount: 0,
        netPremium: null,
        tax: null,
        occupants: 0,
        emission: null,
        total: null,
        supported: false,
        unavailableReason: `No disponible para: ${unsupportedTypes.join(", ")}`,
      };
    }

    const grossPremium = roundCurrency(
      scopedVehicles.reduce((total, vehicle) => {
        const rate = resolveVehicleRate(provider.id, mode, vehicle, rates);
        return total + parseInsuredValue(vehicle.insuredValue) * (rate ?? 0);
      }, 0),
    );
    const discount =
      mode === "individual"
        ? roundCurrency(grossPremium * provider.discountRate)
        : 0;
    const netPremium = roundCurrency(grossPremium - discount);
    const tax = roundCurrency(netPremium * 0.15);
    const emission =
      mode === "individual" ? provider.individualEmission : provider.collectiveEmission;
    const total = roundCurrency(netPremium + tax + emission);

    return {
      id: provider.id,
      name: provider.name,
      grossPremium,
      discount,
      netPremium,
      tax,
      occupants: 0,
      emission,
      total,
      supported: true,
    };
  });

  const supportedQuotes = quotes.filter(
    (quote): quote is VehicleQuoteBreakdown & { total: number } =>
      quote.supported && quote.total !== null,
  );
  const bestQuote = [...supportedQuotes].sort((a, b) => a.total - b.total)[0];

  return {
    quotes,
    bestQuoteId: bestQuote?.id,
  };
};

import {
  addDays,
  differenceInCalendarDays,
  differenceInYears,
  format,
  isValid,
  parseISO,
} from "date-fns";
import { AsYouType } from "libphonenumber-js";
import {
  ComputedQuote,
  CotizacionFormData,
  PlanId,
  TravelerType,
} from "../../types/models";
import { PLAN_OPTIONS } from "./constants";

export const formatInputDate = (date: Date) => format(date, "yyyy-MM-dd");

export const createDefaultFormData = (): CotizacionFormData => {
  const quoteDate = formatInputDate(new Date());
  const departureDate = formatInputDate(addDays(new Date(), 5));

  return {
    quoteDate,
    fullName: "",
    birthDate: "",
    email: "",
    departureDate,
    returnDate: departureDate,
    destination: "",
    phone: "",
    travelersCount: 1,
    travelers: [{ id: 1, type: "adulto" }],
  };
};

export const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const formatInternationalPhone = (value: string) => {
  const cleanedValue = value.replace(/[^\d+]/g, "");
  const normalizedValue = cleanedValue.startsWith("+")
    ? `+${cleanedValue.slice(1).replace(/\+/g, "")}`
    : cleanedValue.replace(/\+/g, "");

  if (!normalizedValue) return "";
  return new AsYouType().input(normalizedValue);
};

export const calculateAge = (birthDate: string): number | null => {
  if (!birthDate) return null;
  const parsedBirthDate = parseISO(birthDate);
  if (!isValid(parsedBirthDate)) return null;

  const age = differenceInYears(new Date(), parsedBirthDate);
  return age >= 0 ? age : null;
};

export const calculateTripDays = (formData: CotizacionFormData) => {
  if (!formData.departureDate || !formData.returnDate) return 0;

  const departure = parseISO(formData.departureDate);
  const returning = parseISO(formData.returnDate);
  if (!isValid(departure) || !isValid(returning) || returning < departure) {
    return 0;
  }

  return differenceInCalendarDays(returning, departure) + 1;
};

export const formatUSD = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);

export const getRecommendedQuoteId = (quotes: ComputedQuote[]) =>
  [...quotes].sort((a, b) => a.price - b.price)[0]?.id;

export const getTravelerCounts = (formData: CotizacionFormData) => ({
  adultCount: formData.travelers.filter((traveler) => traveler.type === "adulto")
    .length,
  childCount: formData.travelers.filter((traveler) => traveler.type === "nino")
    .length,
});

export const hasDraftContent = (
  formData: CotizacionFormData,
  selectedPlanId: PlanId | "",
  currentQuoteId?: string,
) => {
  return Boolean(
    selectedPlanId ||
      currentQuoteId ||
      formData.fullName ||
      formData.email ||
      formData.birthDate ||
      formData.destination ||
      formData.phone,
  );
};

export const getPlanById = (planId: PlanId) =>
  PLAN_OPTIONS.find((plan) => plan.id === planId);

export const getMainTravelerType = (age: number | null): TravelerType =>
  age !== null && age < 18 ? "nino" : "adulto";

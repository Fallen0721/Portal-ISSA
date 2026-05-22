import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  FileDown,
  RefreshCcw,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { addDays, parseISO } from "date-fns";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import {
  ComputedQuote,
  Cotizacion,
  CotizacionFormData,
  CotizacionStatus,
  PlanId,
  QuoteStep,
  TravelerType,
} from "../../types/models";
import { CotizacionesService } from "../../services/cotizaciones.service";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { InputField, SelectField } from "./FormFields";
import {
  COUNTRY_OPTIONS,
  INSURANCE_OPTIONS,
  PLAN_OPTIONS,
  statusConfig,
  travelerTypeLabel,
} from "../cotizador/constants";
import {
  calculateAge,
  calculateTripDays,
  createDefaultFormData,
  formatInputDate,
  formatInternationalPhone,
  formatUSD,
  getMainTravelerType,
  getPlanById,
  getRecommendedQuoteId,
  getTravelerCounts,
  hasDraftContent,
  normalizeText,
} from "../cotizador/helpers";
import { generateQuotePdf } from "../cotizador/pdf";
import { HistoryItem } from "../cotizador/HistoryItem";

type ErrorField =
  | "selectedPlan"
  | "fullName"
  | "birthDate"
  | "email"
  | "phone"
  | "destination"
  | "departureDate"
  | "returnDate";

interface CotizadorModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  mode?: "modal" | "page";
}

export const CotizadorModule = ({
  isOpen = true,
  onClose,
  mode = "modal",
}: CotizadorModalProps) => {
  const isModal = mode === "modal";
  const destinationRef = useRef<HTMLDivElement | null>(null);
  const { user, permissions } = useAuth();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<"builder" | "history">("builder");
  const [step, setStep] = useState<QuoteStep>(1);
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId | "">("");
  const [formData, setFormData] = useState<CotizacionFormData>(createDefaultFormData);
  const [errors, setErrors] = useState<Partial<Record<ErrorField, string>>>({});
  const [isDestinationOpen, setIsDestinationOpen] = useState(false);
  const [history, setHistory] = useState<Cotizacion[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [currentQuoteId, setCurrentQuoteId] = useState<string>();
  const [currentQuoteStatus, setCurrentQuoteStatus] =
    useState<CotizacionStatus | null>(null);

  const selectedPlan = useMemo(
    () => (selectedPlanId ? getPlanById(selectedPlanId) : undefined),
    [selectedPlanId],
  );
  const age = useMemo(() => calculateAge(formData.birthDate), [formData.birthDate]);
  const tripDays = useMemo(() => calculateTripDays(formData), [formData]);
  const { adultCount, childCount } = useMemo(
    () => getTravelerCounts(formData),
    [formData],
  );
  const minDepartureDate = useMemo(
    () => formatInputDate(addDays(parseISO(formData.quoteDate), 5)),
    [formData.quoteDate],
  );
  const filteredCountries = useMemo(() => {
    const query = normalizeText(formData.destination);
    if (!query) return COUNTRY_OPTIONS.slice(0, 90);
    return COUNTRY_OPTIONS.filter((country) =>
      normalizeText(country.label).includes(query),
    ).slice(0, 90);
  }, [formData.destination]);
  const computedQuotes: ComputedQuote[] = useMemo(() => {
    if (!selectedPlan) return [];
    const effectiveDays = Math.max(tripDays, 1);
    const ageFactor = age === null ? 1 : age >= 65 ? 1.35 : age < 18 ? 0.9 : 1;
    const travelersWeight = formData.travelers.reduce(
      (total, traveler) => total + (traveler.type === "adulto" ? 1 : 0.8),
      0,
    );
    return INSURANCE_OPTIONS.map((option) => {
      const base =
        selectedPlan.dailyRate * effectiveDays * ageFactor * travelersWeight * option.factor;
      const price = Number(base.toFixed(2));
      return {
        ...option,
        benefits: [...option.benefits],
        price,
        previousPrice: Number((price * 1.38).toFixed(2)),
        savings: Number((price * 0.38).toFixed(2)),
      };
    });
  }, [selectedPlan, tripDays, age, formData.travelers]);

  const resetCotizador = () => {
    setStep(1);
    setSelectedPlanId("");
    setFormData(createDefaultFormData());
    setErrors({});
    setCurrentQuoteId(undefined);
    setCurrentQuoteStatus(null);
    setIsDestinationOpen(false);
  };

  const setField = <K extends keyof CotizacionFormData>(
    field: K,
    value: CotizacionFormData[K],
  ) => setFormData((current) => ({ ...current, [field]: value }));

  const updateTravelerType = (index: number, type: TravelerType) => {
    setFormData((current) => ({
      ...current,
      travelers: current.travelers.map((traveler, travelerIndex) =>
        travelerIndex === index ? { ...traveler, type } : traveler,
      ),
    }));
  };

  const loadHistory = async () => {
    if (!permissions?.cotizador_viaje.view || isModal) return;
    setLoadingHistory(true);
    try {
      const items = await CotizacionesService.getAll();
      setHistory(items);
    } catch (error) {
      toast(error instanceof Error ? error.message : "No se pudo cargar el historial", "error");
    } finally {
      setLoadingHistory(false);
    }
  };

  const applyQuote = (quote: Cotizacion) => {
    setFormData(quote.formData);
    setSelectedPlanId(quote.selectedPlanId);
    setStep(3);
    setCurrentQuoteId(quote.id);
    setCurrentQuoteStatus(quote.status);
    setActiveView("builder");
  };

  useEffect(() => {
    if (!isModal || !isOpen) return;
    resetCotizador();
  }, [isModal, isOpen]);

  useEffect(() => {
    if (!isModal || !isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isModal, isOpen]);

  useEffect(() => {
    if (!isModal && user) {
      void (async () => {
        const [draft, items] = await Promise.all([
          CotizacionesService.getDraft(),
          CotizacionesService.getAll(),
        ]);
        setHistory(items);
        if (
          draft &&
          hasDraftContent(draft.formData, draft.selectedPlanId, draft.currentQuoteId)
        ) {
          setFormData(draft.formData);
          setSelectedPlanId(draft.selectedPlanId);
          setStep(draft.step);
          setCurrentQuoteId(draft.currentQuoteId);
          setCurrentQuoteStatus(
            items.find((item) => item.id === draft.currentQuoteId)?.status ?? null,
          );
        }
      })().catch(() => undefined);
    }
  }, [isModal, user?.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!destinationRef.current) return;
      if (destinationRef.current.contains(event.target as Node)) return;
      setIsDestinationOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isModal || !permissions?.cotizador_viaje.view || !user) return;
    const timer = window.setTimeout(() => {
      if (!hasDraftContent(formData, selectedPlanId, currentQuoteId)) {
        void CotizacionesService.clearDraft();
        return;
      }
      void CotizacionesService.saveDraft({
        formData,
        selectedPlanId,
        step,
        currentQuoteId,
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [formData, selectedPlanId, step, currentQuoteId, isModal, permissions?.cotizador_viaje.view, user?.id]);

  useEffect(() => {
    setFormData((current) => {
      const next = { ...current };
      if (next.departureDate < minDepartureDate) next.departureDate = minDepartureDate;
      if (next.returnDate < next.departureDate) next.returnDate = next.departureDate;
      if (next.travelers.length !== next.travelersCount) {
        next.travelers = Array.from({ length: next.travelersCount }, (_, index) =>
          next.travelers[index] ?? { id: index + 1, type: "adulto" as TravelerType },
        );
      }
      if (age !== null && next.travelers[0]) {
        next.travelers[0] = { ...next.travelers[0], type: getMainTravelerType(age) };
      }
      return next;
    });
  }, [minDepartureDate, age, formData.travelersCount]);

  const validateStepTwo = () => {
    const nextErrors: Partial<Record<ErrorField, string>> = {};
    if (!formData.fullName.trim()) nextErrors.fullName = "Ingresa el nombre completo";
    if (!formData.birthDate) nextErrors.birthDate = "Selecciona la fecha de nacimiento";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      nextErrors.email = "Ingresa un correo valido";
    }
    if (!formData.phone.trim()) {
      nextErrors.phone = "Ingresa el numero de telefono";
    } else {
      const phone = formData.phone.replace(/[^\d+]/g, "");
      if (phone.startsWith("+")) {
        const parsed = parsePhoneNumberFromString(phone);
        if (!parsed || !parsed.isPossible()) {
          nextErrors.phone = "Ingresa un numero internacional valido";
        }
      }
    }
    if (
      !COUNTRY_OPTIONS.some(
        (country) =>
          normalizeText(country.label) === normalizeText(formData.destination),
      )
    ) {
      nextErrors.destination = "Selecciona un pais valido de la lista";
    }
    if (!formData.departureDate || formData.departureDate < minDepartureDate) {
      nextErrors.departureDate = "La ida debe ser al menos 5 dias después";
    }
    if (!formData.returnDate || formData.returnDate < formData.departureDate) {
      nextErrors.returnDate = "La fecha de regreso debe ser posterior o igual";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveQuote = async (status?: CotizacionStatus) => {
    if (!selectedPlan || computedQuotes.length === 0) return null;
    const quote = await CotizacionesService.saveFormalQuote({
      id: currentQuoteId,
      formData,
      selectedPlanId: selectedPlan.id,
      quotes: computedQuotes,
      recommendedQuoteId: getRecommendedQuoteId(computedQuotes),
      status,
    });
    setCurrentQuoteId(quote.id);
    setCurrentQuoteStatus(quote.status);
    await loadHistory();
    return quote;
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!selectedPlanId) {
        setErrors({ selectedPlan: "Selecciona un plan para continuar" });
        return;
      }
      setErrors({});
      setStep(2);
      return;
    }
    if (!validateStepTwo()) return;
    try {
      await saveQuote(currentQuoteStatus ?? "cotizada");
      setStep(3);
      toast("Cotización guardada", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "No se pudo guardar", "error");
    }
  };

  const handleDownload = (quote?: Cotizacion) => {
    const targetForm = quote?.formData ?? formData;
    const targetPlan = quote ? getPlanById(quote.selectedPlanId) : selectedPlan;
    const targetQuotes = quote?.quotes ?? computedQuotes;
    if (!targetPlan || targetQuotes.length === 0) return;
    generateQuotePdf({ formData: targetForm, selectedPlan: targetPlan, quotes: targetQuotes });
  };

  const handleStatusAction = async (
    status: CotizacionStatus,
    quote?: Cotizacion,
  ) => {
    try {
      const targetId = quote?.id ?? currentQuoteId ?? (await saveQuote("cotizada"))?.id;
      if (!targetId) return;
      if (status === "convertida") {
        await CotizacionesService.convertToVenta(targetId);
        setCurrentQuoteStatus("convertida");
        setActiveView(isModal ? "builder" : "history");
      } else {
        const updated = await CotizacionesService.updateStatus(targetId, status);
        if (targetId === currentQuoteId) setCurrentQuoteStatus(updated.status);
      }
      await loadHistory();
      toast("Estado actualizado", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "No se pudo actualizar", "error");
    }
  };

  if (isModal && !isOpen) return null;

  return (
    <div className={clsx(isModal ? "fixed inset-0 z-50 p-4 md:p-8" : "w-full")}>
      {isModal && <div className="absolute inset-0 bg-slate-900/60" onClick={onClose} />}
      <div className="relative mx-auto flex w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Cotizador CRM</h2>
            <p className="text-sm text-slate-500">Cotiza, guarda, reabre y convierte.</p>
          </div>
          {isModal ? (
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
              <X size={20} />
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveView("builder")}
                className={clsx("rounded-full px-4 py-2 text-sm font-medium", activeView === "builder" ? "bg-primary text-white" : "bg-slate-100 text-slate-600")}
              >
                Nueva cotización
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveView("history");
                  void loadHistory();
                }}
                className={clsx("rounded-full px-4 py-2 text-sm font-medium", activeView === "history" ? "bg-primary text-white" : "bg-slate-100 text-slate-600")}
              >
                <span className="inline-flex items-center gap-2"><ClipboardList size={14} />Historial</span>
              </button>
            </div>
          )}
        </div>

        {activeView === "history" && !isModal ? (
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {loadingHistory ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">Cargando historial...</div>
            ) : history.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">No hay cotizaciones guardadas todavía.</div>
            ) : (
              history.map((quote) => (
                <HistoryItem
                  key={quote.id}
                  quote={quote}
                  onOpen={applyQuote}
                  onDownload={handleDownload}
                  onMarkFollowUp={(item) => void handleStatusAction("en_seguimiento", item)}
                  onConvert={(item) => void handleStatusAction("convertida", item)}
                  onDiscard={(item) => void handleStatusAction("descartada", item)}
                />
              ))
            )}
          </div>
        ) : (
          <>
            <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {["Plan", "Viaje", "Resultados"].map((label, index) => (
                  <div key={label} className={clsx("rounded-xl border px-4 py-3", step > index ? "border-primary/30 bg-primary/10" : "border-slate-200 bg-white")}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Paso {index + 1}
                    </p>
                    <p className="text-sm font-medium text-slate-700">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {step === 1 && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {PLAN_OPTIONS.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => {
                        setSelectedPlanId(plan.id);
                        setErrors((current) => ({ ...current, selectedPlan: undefined }));
                      }}
                      className={clsx("rounded-2xl border p-5 text-left", selectedPlanId === plan.id ? "border-primary bg-primary/5" : "border-slate-200")}
                    >
                      <p className="text-lg font-bold text-slate-800">{plan.name}</p>
                      <p className="mt-1 text-sm text-slate-600">{plan.shortDescription}</p>
                      <p className="mt-4 text-2xl font-extrabold text-primary">{formatUSD(plan.dailyRate)}</p>
                    </button>
                  ))}
                  {errors.selectedPlan && <p className="text-sm font-medium text-red-600">{errors.selectedPlan}</p>}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InputField label="Nombre completo" value={formData.fullName} onChange={(e) => setField("fullName", e.target.value)} error={errors.fullName} required />
                    <InputField label="Correo" type="email" value={formData.email} onChange={(e) => setField("email", e.target.value)} error={errors.email} required />
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <InputField label="Nacimiento" type="date" value={formData.birthDate} onChange={(e) => setField("birthDate", e.target.value)} error={errors.birthDate} required />
                    <InputField label="Telefono" value={formData.phone} onChange={(e) => setField("phone", formatInternationalPhone(e.target.value))} error={errors.phone} required />
                    <div className="relative" ref={destinationRef}>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Destino</label>
                      <input className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900" value={formData.destination} onFocus={() => setIsDestinationOpen(true)} onChange={(e) => { setField("destination", e.target.value); setErrors((current) => ({ ...current, destination: undefined })); setIsDestinationOpen(true); }} />
                      {isDestinationOpen && (
                        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
                          <ul className="max-h-56 overflow-y-auto py-1">
                            {filteredCountries.map((country) => (
                              <li key={country.value}>
                                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setField("destination", country.label); setErrors((current) => ({ ...current, destination: undefined })); setIsDestinationOpen(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
                                  {country.label}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {errors.destination && <p className="mt-1 text-xs text-red-500">{errors.destination}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <InputField label="Fecha ida" type="date" min={minDepartureDate} value={formData.departureDate} onChange={(e) => setField("departureDate", e.target.value)} error={errors.departureDate} required />
                    <InputField label="Fecha regreso" type="date" min={formData.departureDate} value={formData.returnDate} onChange={(e) => setField("returnDate", e.target.value)} error={errors.returnDate} required />
                    <InputField label="Dias" type="number" value={tripDays} readOnly />
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-slate-700">
                      <p className="text-xs uppercase tracking-wide text-primary">Edad calculada</p>
                      <p className="mt-1 text-xl font-bold text-primary">{age !== null ? `${age} años` : "--"}</p>
                      <p>{legalAge(age)}</p>
                    </div>
                    <SelectField label="Cantidad de personas" value={String(formData.travelersCount)} onChange={(e) => setField("travelersCount", Math.max(1, Number(e.target.value) || 1))} options={Array.from({ length: 10 }, (_, index) => ({ value: String(index + 1), label: `${index + 1} persona${index === 0 ? "" : "s"}` }))} />
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <p>Adultos: <span className="font-semibold">{adultCount}</span></p>
                      <p>Niños: <span className="font-semibold">{childCount}</span></p>
                    </div>
                  </div>
                  <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                    {formData.travelers.map((traveler, index) => {
                      const isMain = index === 0;
                      const mainType = getMainTravelerType(age);
                      return (
                        <div key={traveler.id} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 md:grid-cols-3">
                          <p className="self-center text-sm font-medium text-slate-700">Persona {index + 1} {isMain ? "(Titular)" : ""}</p>
                          <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value={isMain ? mainType : traveler.type} onChange={(e) => updateTravelerType(index, e.target.value as TravelerType)} disabled={isMain}>
                            <option value="adulto">{travelerTypeLabel.adulto}</option>
                            <option value="nino">{travelerTypeLabel.nino}</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 3 && selectedPlan && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div>
                      <p className="text-lg font-semibold text-primary">{selectedPlan.name}</p>
                      <p className="text-sm text-slate-600">{formData.fullName} | {tripDays} dias | {formData.destination}</p>
                    </div>
                    {currentQuoteStatus && (
                      <span className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold", statusConfig[currentQuoteStatus].className)}>
                        {statusConfig[currentQuoteStatus].label}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
                    {computedQuotes.map((quote) => (
                      <article key={quote.id} className={clsx("rounded-2xl border p-4", quote.id === getRecommendedQuoteId(computedQuotes) ? "border-rose-400 bg-white shadow-lg" : "border-slate-200 bg-slate-50")}>
                        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{quote.provider}</p>
                        <h4 className="mt-1 text-xl font-bold text-slate-900">{quote.productName}</h4>
                        <p className="mt-4 text-3xl font-black text-primary">{formatUSD(quote.price)}</p>
                        <p className="text-sm text-emerald-700">Ahorro: {formatUSD(quote.savings)}</p>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {step > 1 ? (
                  <button type="button" onClick={() => setStep((current) => (current - 1) as QuoteStep)} className="btn btn-secondary inline-flex items-center gap-2">
                    <ArrowLeft size={16} /> Regresar
                  </button>
                ) : isModal ? (
                  <button type="button" onClick={onClose} className="btn btn-secondary">Cerrar</button>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {step === 3 ? (
                  <>
                    <button type="button" onClick={() => void saveQuote(currentQuoteStatus ?? "cotizada")} className="btn btn-secondary inline-flex items-center gap-2"><Save size={16} /> Guardar</button>
                    {currentQuoteStatus !== "en_seguimiento" &&
                      currentQuoteStatus !== "convertida" &&
                      currentQuoteStatus !== "descartada" && (
                        <button type="button" onClick={() => void handleStatusAction("en_seguimiento")} className="btn btn-secondary inline-flex items-center gap-2"><RefreshCcw size={16} /> Seguimiento</button>
                      )}
                    {currentQuoteStatus !== "convertida" &&
                      currentQuoteStatus !== "descartada" && (
                        <button type="button" onClick={() => void handleStatusAction("descartada")} className="btn btn-secondary inline-flex items-center gap-2 text-rose-600"><Trash2 size={16} /> Descartar</button>
                      )}
                    {currentQuoteStatus !== "convertida" &&
                      currentQuoteStatus !== "descartada" && (
                        <button type="button" onClick={() => void handleStatusAction("convertida")} className="btn btn-primary inline-flex items-center gap-2"><Send size={16} /> Convertir a Venta</button>
                      )}
                    <button type="button" onClick={() => handleDownload()} className="btn btn-primary inline-flex items-center gap-2"><FileDown size={16} /> Descargar PDF</button>
                  </>
                ) : (
                  <button type="button" onClick={() => void handleNext()} className="btn btn-primary inline-flex items-center gap-2">
                    Continuar <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const legalAge = (age: number | null) =>
  age === null ? "Completa la fecha de nacimiento" : age >= 18 ? "Mayor de edad" : "Menor de edad";

export const CotizadorModal = CotizadorModule;

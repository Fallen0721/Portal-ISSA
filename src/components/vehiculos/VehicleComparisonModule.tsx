import { useEffect, useState } from "react";
import { FileDown, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { InputField, SelectField } from "../forms/FormFields";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { formatCurrency, formatNumber } from "../../utils/format";
import {
  COLLECTIVE_COVERAGES,
  INDIVIDUAL_BASE_COVERAGES,
  INDIVIDUAL_SPECIAL_COVERAGES,
  MODE_OPTIONS,
  VEHICLE_COMPANY_LABELS,
  VEHICLE_ORIGIN_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
} from "./constants";
import {
  buildVehicleComparison,
  calculatePortfolioInsuredValue,
  createEmptyVehicle,
  getConfiguredVehicleProviders,
  getVehiclesForMode,
} from "./helpers";
import { generateVehicleComparisonPdf } from "./pdf";
import {
  CoverageRow,
  CoverageValue,
  VehicleComparisonMode,
  VehicleEntry,
  VehicleFieldErrors,
  VehicleQuoteHistory,
  VehicleRate,
} from "./types";
import { VehiculosService } from "../../services/vehiculos.service";

interface ComparisonErrors {
  customerName?: string;
  vehicles: Record<string, VehicleFieldErrors>;
}

const createEmptyErrors = (): ComparisonErrors => ({
  vehicles: {},
});

const createInitialState = () => {
  return {
    mode: "individual" as VehicleComparisonMode,
    customerName: "",
    vehicles: [createEmptyVehicle()],
  };
};

const currentYear = new Date().getFullYear();

interface VehicleComparisonModuleProps {
  rates: VehicleRate[];
  ratesLoading: boolean;
  onHistoryChanged?: () => Promise<void> | void;
}

export const VehicleComparisonModule = ({
  rates,
  ratesLoading,
  onHistoryChanged,
}: VehicleComparisonModuleProps) => {
  const [initialState] = useState(createInitialState);
  const { user } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<VehicleComparisonMode>(initialState.mode);
  const [customerName, setCustomerName] = useState(initialState.customerName);
  const [vehicles, setVehicles] = useState<VehicleEntry[]>(
    initialState.vehicles,
  );
  const [errors, setErrors] = useState<ComparisonErrors>(createEmptyErrors);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [savedHistoryRecord, setSavedHistoryRecord] =
    useState<VehicleQuoteHistory | null>(null);

  const scopedVehicles = getVehiclesForMode(mode, vehicles);
  const configuredProviders = getConfiguredVehicleProviders(mode, rates);
  const comparison = hasGenerated
    ? buildVehicleComparison(mode, scopedVehicles, rates)
    : { quotes: [], bestQuoteId: undefined as string | undefined };
  const totalInsuredValue = calculatePortfolioInsuredValue(scopedVehicles);
  const baseCoverages =
    mode === "individual" ? INDIVIDUAL_BASE_COVERAGES : COLLECTIVE_COVERAGES;

  useEffect(() => {
    void (async () => {
      const draft = await VehiculosService.getDraft().catch(() => null);
      if (draft) {
        setMode(draft.mode);
        setCustomerName(draft.customerName);
        setVehicles(getVehiclesForMode(draft.mode, draft.vehicles));
      }
      setDraftLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;
    void VehiculosService.saveDraft({
      mode,
      customerName,
      vehicles: getVehiclesForMode(mode, vehicles),
    }).catch(() => undefined);
  }, [customerName, draftLoaded, mode, vehicles]);

  useEffect(() => {
    setSavedHistoryRecord(null);
  }, [customerName, mode, rates, vehicles]);

  const setVehicleField = <K extends keyof VehicleEntry>(
    vehicleId: string,
    field: K,
    value: VehicleEntry[K],
  ) => {
    setVehicles((currentVehicles) =>
      currentVehicles.map((vehicle) =>
        vehicle.id === vehicleId ? { ...vehicle, [field]: value } : vehicle,
      ),
    );
    setErrors((currentErrors) => ({
      ...currentErrors,
      vehicles: {
        ...currentErrors.vehicles,
        [vehicleId]: {
          ...currentErrors.vehicles[vehicleId],
          [field]: undefined,
        },
      },
    }));
  };

  const handleModeChange = (nextMode: VehicleComparisonMode) => {
    setMode(nextMode);
    setVehicles((currentVehicles) =>
      getVehiclesForMode(nextMode, currentVehicles),
    );
    setErrors(createEmptyErrors());
    setHasGenerated(false);
  };

  const handleAddVehicle = () => {
    setVehicles((currentVehicles) => [
      ...currentVehicles,
      createEmptyVehicle(),
    ]);
    setHasGenerated(false);
  };

  const handleRemoveVehicle = (vehicleId: string) => {
    setVehicles((currentVehicles) => {
      const nextVehicles = currentVehicles.filter(
        (vehicle) => vehicle.id !== vehicleId,
      );
      return nextVehicles.length > 0 ? nextVehicles : [createEmptyVehicle()];
    });
    setErrors((currentErrors) => {
      const { [vehicleId]: _ignored, ...rest } = currentErrors.vehicles;
      return { ...currentErrors, vehicles: rest };
    });
    setHasGenerated(false);
  };

  const resetForm = () => {
    setMode("individual");
    setCustomerName("");
    setVehicles([createEmptyVehicle()]);
    setErrors(createEmptyErrors());
    setHasGenerated(false);
    void VehiculosService.clearDraft().catch(() => undefined);
  };

  const validateForm = () => {
    const nextErrors = createEmptyErrors();

    if (!customerName.trim()) {
      nextErrors.customerName =
        mode === "individual"
          ? "Ingresa el nombre del asegurado"
          : "Ingresa el cliente o empresa";
    }

    scopedVehicles.forEach((vehicle) => {
      const vehicleErrors: VehicleFieldErrors = {};
      const insuredValue = Number(vehicle.insuredValue);
      const year = Number(vehicle.year);

      if (!vehicle.origin) vehicleErrors.origin = "Selecciona el origen";
      if (!vehicle.brand.trim()) vehicleErrors.brand = "Ingresa la marca";
      if (!vehicle.type) vehicleErrors.type = "Selecciona el tipo";
      if (!vehicle.model.trim()) vehicleErrors.model = "Ingresa el modelo";
      if (!vehicle.year.trim()) {
        vehicleErrors.year = "Ingresa el año";
      } else if (
        !Number.isInteger(year) ||
        year < 1950 ||
        year > currentYear + 1
      ) {
        vehicleErrors.year = "Ingresa un año valido";
      }
      if (!vehicle.insuredValue.trim()) {
        vehicleErrors.insuredValue = "Ingresa el valor asegurado";
      } else if (!Number.isFinite(insuredValue) || insuredValue <= 0) {
        vehicleErrors.insuredValue = "Ingresa un monto valido";
      }

      if (Object.keys(vehicleErrors).length > 0) {
        nextErrors.vehicles[vehicle.id] = vehicleErrors;
      }
    });

    setErrors(nextErrors);
    return (
      !nextErrors.customerName && Object.keys(nextErrors.vehicles).length === 0
    );
  };

  const buildComparisonSnapshot = () => {
    const nextVehicles = getVehiclesForMode(mode, vehicles);
    const nextComparison = buildVehicleComparison(mode, nextVehicles, rates);
    const nextTotalInsuredValue = calculatePortfolioInsuredValue(nextVehicles);

    return {
      vehicles: nextVehicles,
      comparison: nextComparison,
      totalInsuredValue: nextTotalInsuredValue,
    };
  };

  const persistCurrentComparisonHistory = async (snapshot: {
    vehicles: VehicleEntry[];
    comparison: ReturnType<typeof buildVehicleComparison>;
    totalInsuredValue: number;
  }) => {
    if (savedHistoryRecord) {
      return savedHistoryRecord;
    }

    try {
      const createdRecord = await VehiculosService.createHistory({
        mode,
        customerName: customerName.trim(),
        vehicles: snapshot.vehicles,
        quotes: snapshot.comparison.quotes,
        totalInsuredValue: snapshot.totalInsuredValue,
      });
      setSavedHistoryRecord(createdRecord);
      await onHistoryChanged?.();
      return createdRecord;
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el historial de la cotización",
        "error",
      );
      return null;
    }
  };

  const generateComparison = async () => {
    if (ratesLoading) {
      toast("Espera a que carguen las tasas configuradas", "error");
      return;
    }

    if (configuredProviders.length === 0) {
      toast("No hay tasas configuradas para esta modalidad", "error");
      return;
    }

    if (!validateForm()) {
      toast(
        "Completa la informacion requerida para generar el cuadro",
        "error",
      );
      return;
    }

    const snapshot = buildComparisonSnapshot();
    setHasGenerated(true);
    await persistCurrentComparisonHistory(snapshot);
    toast("Cuadro comparativo generado", "success");
  };

  const downloadComparisonPdf = async () => {
    if (ratesLoading) {
      toast("Espera a que carguen las tasas configuradas", "error");
      return;
    }

    if (configuredProviders.length === 0) {
      toast("No hay tasas configuradas para esta modalidad", "error");
      return;
    }

    if (!validateForm()) {
      toast(
        "Completa la informacion requerida antes de descargar el PDF",
        "error",
      );
      return;
    }

    const snapshot = buildComparisonSnapshot();
    const historyRecord = await persistCurrentComparisonHistory(snapshot);

    generateVehicleComparisonPdf({
      mode,
      customerName: customerName.trim(),
      vehicles: snapshot.vehicles,
      quotes: snapshot.comparison.quotes,
      totalInsuredValue: snapshot.totalInsuredValue,
      baseCoverages:
        mode === "individual"
          ? INDIVIDUAL_BASE_COVERAGES
          : COLLECTIVE_COVERAGES,
      specialCoverages:
        mode === "individual" ? INDIVIDUAL_SPECIAL_COVERAGES : undefined,
      generatedByName: historyRecord?.createdByName ?? user?.name,
      generatedByEmail: historyRecord?.createdByEmail ?? user?.email,
      generatedAt: historyRecord?.createdAt,
    });

    setHasGenerated(true);
    toast("PDF descargado", "success");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Modalidad
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleModeChange(option.value)}
                    className={clsx(
                      "rounded-2xl border p-4 text-left transition-colors",
                      mode === option.value
                        ? "border-primary bg-primary/5"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-lg font-bold text-slate-900">
                        {option.label}
                      </p>
                      <span
                        className={clsx(
                          "rounded-full px-2.5 py-1 text-xs font-semibold",
                          mode === option.value
                            ? "bg-primary text-white"
                            : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {mode === option.value ? "Activo" : "Disponible"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {option.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label={
                  mode === "individual" ? "Asegurado" : "Cliente / empresa"
                }
                value={customerName}
                onChange={(event) => {
                  setCustomerName(event.target.value);
                  setErrors((currentErrors) => ({
                    ...currentErrors,
                    customerName: undefined,
                  }));
                }}
                error={errors.customerName}
                required
              />
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Resumen rapido
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>
                    Vehiculos:{" "}
                    <span className="font-semibold text-slate-900">
                      {formatNumber(scopedVehicles.length)}
                    </span>
                  </p>
                  <p>
                    Valor asegurado:{" "}
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(totalInsuredValue, "L")}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Vehiculos
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {mode === "individual"
                    ? " "
                    : "Flota a cotizar"}
                </h2>
              </div> */}

              {mode === "colectivo" && (
                <button
                  type="button"
                  onClick={handleAddVehicle}
                  className="btn btn-secondary inline-flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Agregar vehiculo
                </button>
              )}
            </div>

            <div className="space-y-4">
              {scopedVehicles.map((vehicle, index) => (
                <article
                  key={vehicle.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4"
                >
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                        {mode === "individual"
                          ? "Vehiculo"
                          : `Vehiculo ${index + 1}`}
                      </p>
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {vehicle.brand.trim() || vehicle.model.trim()
                          ? `${vehicle.brand || "Marca"} ${vehicle.model || "Modelo"}`
                          : "Completa la informacion del vehiculo"}
                      </p>
                    </div>

                    {mode === "colectivo" && scopedVehicles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveVehicle(vehicle.id)}
                        className="btn btn-secondary inline-flex items-center gap-2 text-rose-600"
                      >
                        <Trash2 size={16} />
                        Quitar
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <SelectField
                      label="Agencia o importado"
                      value={vehicle.origin}
                      onChange={(event) =>
                        setVehicleField(
                          vehicle.id,
                          "origin",
                          event.target.value as VehicleEntry["origin"],
                        )
                      }
                      options={VEHICLE_ORIGIN_OPTIONS}
                      error={errors.vehicles[vehicle.id]?.origin}
                    />
                    <InputField
                      label="Marca"
                      value={vehicle.brand}
                      onChange={(event) =>
                        setVehicleField(vehicle.id, "brand", event.target.value)
                      }
                      error={errors.vehicles[vehicle.id]?.brand}
                    />
                    <SelectField
                      label="Tipo"
                      value={vehicle.type}
                      onChange={(event) =>
                        setVehicleField(
                          vehicle.id,
                          "type",
                          event.target.value as VehicleEntry["type"],
                        )
                      }
                      options={VEHICLE_TYPE_OPTIONS}
                      error={errors.vehicles[vehicle.id]?.type}
                    />
                    <InputField
                      label="Modelo"
                      value={vehicle.model}
                      onChange={(event) =>
                        setVehicleField(vehicle.id, "model", event.target.value)
                      }
                      error={errors.vehicles[vehicle.id]?.model}
                    />
                    <InputField
                      label="Año"
                      type="number"
                      min={1950}
                      max={currentYear + 1}
                      value={vehicle.year}
                      onChange={(event) =>
                        setVehicleField(vehicle.id, "year", event.target.value)
                      }
                      error={errors.vehicles[vehicle.id]?.year}
                    />
                    <InputField
                      label="Valor asegurado"
                      type="number"
                      min={0}
                      step="0.01"
                      value={vehicle.insuredValue}
                      onChange={(event) =>
                        setVehicleField(
                          vehicle.id,
                          "insuredValue",
                          event.target.value,
                        )
                      }
                      error={errors.vehicles[vehicle.id]?.insuredValue}
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-500">
              Las tasas se administran en la pestaña Tasas. Si una aseguradora
              no tiene configuración para algun tipo de vehiculo, el modulo la
              marca como no disponible para evitar sumas parciales.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="btn btn-secondary inline-flex items-center gap-2"
              >
                <RefreshCcw size={16} />
                Limpiar
              </button>
              <button
                type="button"
                onClick={generateComparison}
                className="btn btn-primary inline-flex items-center gap-2"
              >
                Generar cuadro comparativo
              </button>
              <button
                type="button"
                onClick={downloadComparisonPdf}
                className="btn btn-accent inline-flex items-center gap-2"
              >
                <FileDown size={16} />
                Descargar PDF
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Vista de salida
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              {hasGenerated ? "Comparativo listo" : "Esperando calculo"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {hasGenerated
                ? "Ya puedes revisar primas, impuestos, gastos de emision y coberturas de referencia."
                : "Completa la informacion principal y genera el cuadro para ver el comparativo de aseguradoras."}
            </p>

            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Modalidad activa
                </p>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {mode === "individual" ? "Individual" : "Colectivo"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Aseguradoras comparadas
                </p>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {formatNumber(configuredProviders.length)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {configuredProviders.length > 0
                    ? configuredProviders
                        .map((provider) => VEHICLE_COMPANY_LABELS[provider.id])
                        .join(", ")
                    : "No hay compañías configuradas para esta modalidad."}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Portafolio asegurado
                </p>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {formatCurrency(totalInsuredValue, "L")}
                </p>
              </div>
            </div>
          </div>

          {/* <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Referencia tecnica
            </p>
            <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
              <p>ISV aplicado: 15% sobre prima neta.</p>
              <p>Seguro de ocupantes: 0 en la plantilla base.</p>
              <p>
                Gastos de emision:
                {mode === "individual"
                  ? " Ficohsa L 350, resto de aseguradoras L 500."
                  : " no parametrizados en colectivo."}
              </p>
              <p>
                Descuento especial:
                {mode === "individual"
                  ? " Ficohsa aplica 4% sobre la prima bruta."
                  : " no aplica descuento en la hoja colectiva."}
              </p>
            </div>
          </div> */}
        </aside>
      </section>

      {hasGenerated && (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Resultado
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  Cuadro comparativo para {customerName}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {mode === "individual"
                    ? "Comparativo de primas para un vehiculo individual."
                    : `Comparativo consolidado para ${formatNumber(scopedVehicles.length)} vehiculos.`}
                </p>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              {comparison.quotes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-14 text-center">
                  <p className="text-sm font-medium text-slate-600">
                    No hay aseguradoras configuradas para esta modalidad.
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Crea o ajusta tasas en la pestaña Tasas para habilitar el
                    comparativo.
                  </p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        "Aseguradora",
                        "Prima bruta",
                        "Descuento",
                        "Prima neta",
                        "ISV",
                        "Gastos emision",
                        "Total",
                        "Estado",
                      ].map((header) => (
                        <th
                          key={header}
                          className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {comparison.quotes.map((quote) => (
                      <tr key={quote.id} className="align-top bg-white">
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">
                            {quote.name}
                          </p>
                        </td>
                        {quote.supported ? (
                          <>
                            <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                              {formatCurrency(quote.grossPremium ?? 0, "L")}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                              {formatCurrency(quote.discount, "L")}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900">
                              {formatCurrency(quote.netPremium ?? 0, "L")}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                              {formatCurrency(quote.tax ?? 0, "L")}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                              {formatCurrency(quote.emission ?? 0, "L")}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-sm font-bold text-primary">
                              {formatCurrency(quote.total ?? 0, "L")}
                            </td>
                            <td className="px-4 py-4 text-sm text-emerald-700">
                              Disponible
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-4 text-sm text-slate-400">
                              -
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-400">
                              -
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-400">
                              -
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-400">
                              -
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-400">
                              -
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-400">
                              -
                            </td>
                            <td className="px-4 py-4 text-sm text-amber-700">
                              {quote.unavailableReason}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Coberturas de referencia
                </p>
                {/* <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  Resumen tomado de la plantilla base
                </h2> */}
              </div>
              <p className="text-sm leading-6 text-slate-500">
                Estas coberturas replican la referencia visible del archivo
                Excel para Ficohsa y Davivienda.
              </p>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <CoverageTable
                title="Coberturas principales"
                rows={baseCoverages}
              />
              {mode === "individual" ? (
                <CoverageTable
                  title="Coberturas especiales"
                  rows={INDIVIDUAL_SPECIAL_COVERAGES}
                />
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Nota
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    La hoja colectiva del archivo base solo muestra el bloque
                    principal de coberturas. Las cotizaciones especiales no
                    vienen parametrizadas en esa pestana.
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

const CoverageTable = ({
  title,
  rows,
}: {
  title: string;
  rows: CoverageRow[];
}) => (
  <div className="overflow-hidden rounded-3xl border border-slate-200">
    <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
      <p className="text-lg font-bold text-slate-900">{title}</p>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-left">
        <thead className="bg-white">
          <tr>
            {["Cobertura", "Ficohsa", "Davivienda"].map((header) => (
              <th
                key={header}
                className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="px-4 py-3 text-sm text-slate-600">{row.label}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                {renderCoverageValue(row.ficohsa)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                {renderCoverageValue(row.davivienda)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const renderCoverageValue = (value: CoverageValue) =>
  typeof value === "number" ? formatCurrency(value, "L") : value;

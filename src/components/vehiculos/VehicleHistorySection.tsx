import { Download, History, Mail, UserRound } from "lucide-react";
import { formatDate } from "../../utils/dates";
import { formatCurrency, formatNumber } from "../../utils/format";
import {
  COLLECTIVE_COVERAGES,
  INDIVIDUAL_BASE_COVERAGES,
  INDIVIDUAL_SPECIAL_COVERAGES,
  VEHICLE_ORIGIN_LABELS,
  VEHICLE_TYPE_LABELS,
} from "./constants";
import { generateVehicleComparisonPdf } from "./pdf";
import { VehicleQuoteHistory } from "./types";

interface VehicleHistorySectionProps {
  history: VehicleQuoteHistory[];
  loading: boolean;
}

const getModeLabel = (mode: VehicleQuoteHistory["mode"]) =>
  mode === "individual" ? "Individual" : "Colectivo";

export const VehicleHistorySection = ({
  history,
  loading,
}: VehicleHistorySectionProps) => {
  const handleDownloadPdf = (item: VehicleQuoteHistory) => {
    generateVehicleComparisonPdf({
      mode: item.mode,
      customerName: item.customerName,
      vehicles: item.vehicles,
      quotes: item.quotes,
      totalInsuredValue: item.totalInsuredValue,
      baseCoverages:
        item.mode === "individual"
          ? INDIVIDUAL_BASE_COVERAGES
          : COLLECTIVE_COVERAGES,
      specialCoverages:
        item.mode === "individual" ? INDIVIDUAL_SPECIAL_COVERAGES : undefined,
      generatedByName: item.createdByName,
      generatedByEmail: item.createdByEmail,
      generatedAt: item.createdAt,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Historial
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">
          Cotizaciones vehiculares realizadas
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Aquí se conserva el nombre del asegurado, el detalle del vehículo y el
          snapshot de la cotización para volver a descargar el PDF cuando lo
          necesites.
        </p>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-400 shadow-sm">
          Cargando historial de cotizaciones...
        </div>
      ) : history.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-600">
            Aún no hay cotizaciones guardadas en el historial.
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Genera un cuadro comparativo o descarga un PDF para que quede
            registrado aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {history.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Asegurado
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-slate-900">
                      {item.customerName}
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                    <span className="rounded-full bg-slate-50 px-3 py-1">
                      {getModeLabel(item.mode)}
                    </span>
                    <span className="rounded-full bg-slate-50 px-3 py-1">
                      {formatNumber(item.vehicles.length)} vehículo(s)
                    </span>
                    <span className="rounded-full bg-slate-50 px-3 py-1">
                      {formatCurrency(item.totalInsuredValue, "L")}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1">
                      <History size={13} />
                      {formatDate(item.createdAt, "dd/MM/yyyy HH:mm")}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:flex-wrap sm:items-center">
                    <span className="inline-flex items-center gap-2">
                      <UserRound size={14} />
                      {item.createdByName}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Mail size={14} />
                      {item.createdByEmail}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownloadPdf(item)}
                  className="btn btn-accent inline-flex items-center gap-2 self-start"
                >
                  <Download size={16} />
                  Descargar PDF
                </button>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Información del vehículo
                </p>

                <div className="mt-4 grid gap-3">
                  {item.vehicles.map((vehicle, index) => (
                    <div
                      key={`${item.id}-${vehicle.id}-${index}`}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {vehicle.brand || "Marca"} {vehicle.model || "Modelo"}
                          </p>
                          <p className="text-sm text-slate-500">
                            {vehicle.type
                              ? VEHICLE_TYPE_LABELS[vehicle.type]
                              : "Sin tipo"}
                            {" · "}
                            {vehicle.origin
                              ? VEHICLE_ORIGIN_LABELS[vehicle.origin]
                              : "Origen no definido"}
                          </p>
                        </div>
                        <div className="text-sm text-slate-500">
                          <span>Año: {vehicle.year || "-"}</span>
                          <span className="mx-2 text-slate-300">|</span>
                          <span>
                            Valor:{" "}
                            {formatCurrency(Number(vehicle.insuredValue || 0), "L")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

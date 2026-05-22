import {
  FileDown,
  FolderOpen,
  RefreshCcw,
  Send,
  Trash2,
} from "lucide-react";
import { clsx } from "clsx";
import { format, parseISO } from "date-fns";
import { Cotizacion } from "../../types/models";
import { getPlanById, calculateTripDays, formatUSD } from "./helpers";
import { statusConfig } from "./constants";

const StatusBadge = ({ status }: { status: Cotizacion["status"] }) => (
  <span
    className={clsx(
      "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
      statusConfig[status].className,
    )}
  >
    {statusConfig[status].label}
  </span>
);

interface HistoryItemProps {
  quote: Cotizacion;
  onOpen: (quote: Cotizacion) => void;
  onDownload: (quote: Cotizacion) => void;
  onMarkFollowUp: (quote: Cotizacion) => void;
  onConvert: (quote: Cotizacion) => void;
  onDiscard: (quote: Cotizacion) => void;
}

export const HistoryItem = ({
  quote,
  onOpen,
  onDownload,
  onMarkFollowUp,
  onConvert,
  onDiscard,
}: HistoryItemProps) => {
  const selectedPlan = getPlanById(quote.selectedPlanId);
  const recommendedQuote =
    quote.quotes.find((item) => item.id === quote.recommendedQuoteId) ??
    [...quote.quotes].sort((a, b) => a.price - b.price)[0];
  const tripDays = calculateTripDays(quote.formData);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">
              {quote.formData.fullName}
            </h3>
            <StatusBadge status={quote.status} />
          </div>
          <p className="text-sm text-slate-500">
            {selectedPlan?.name || quote.selectedPlanId} | {quote.formData.destination} |{" "}
            {tripDays} dias
          </p>
          <p className="text-xs text-slate-400">
            Actualizada el {format(parseISO(quote.updatedAt), "dd/MM/yyyy HH:mm")}
          </p>
        </div>

        <div className="text-left md:text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Mejor opción
          </p>
          <p className="text-2xl font-black text-primary">
            {recommendedQuote ? formatUSD(recommendedQuote.price) : "--"}
          </p>
          <p className="text-sm text-slate-500">
            {recommendedQuote
              ? `${recommendedQuote.provider} - ${recommendedQuote.productName}`
              : "Sin recomendación"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-600 md:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
          <p className="font-medium text-slate-800">Viaje</p>
          <p>
            {format(parseISO(quote.formData.departureDate), "dd/MM/yyyy")} -{" "}
            {format(parseISO(quote.formData.returnDate), "dd/MM/yyyy")}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
          <p className="font-medium text-slate-800">Contacto</p>
          <p>{quote.formData.email}</p>
          <p>{quote.formData.phone}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
          <p className="font-medium text-slate-800">Destino</p>
          <p>{quote.formData.destination}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onOpen(quote)}
          className="btn btn-secondary inline-flex items-center gap-2"
        >
          <FolderOpen size={16} />
          Reabrir
        </button>
        <button
          type="button"
          onClick={() => onDownload(quote)}
          className="btn btn-secondary inline-flex items-center gap-2"
        >
          <FileDown size={16} />
          PDF
        </button>
        {quote.status !== "en_seguimiento" && quote.status !== "convertida" && (
          <button
            type="button"
            onClick={() => onMarkFollowUp(quote)}
            className="btn btn-secondary inline-flex items-center gap-2"
          >
            <RefreshCcw size={16} />
            Seguimiento
          </button>
        )}
        {!quote.convertedVentaId && quote.status !== "descartada" && (
          <button
            type="button"
            onClick={() => onConvert(quote)}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <Send size={16} />
            Convertir a Venta
          </button>
        )}
        {quote.status !== "descartada" && quote.status !== "convertida" && (
          <button
            type="button"
            onClick={() => onDiscard(quote)}
            className="btn btn-secondary inline-flex items-center gap-2 text-rose-600"
          >
            <Trash2 size={16} />
            Descartar
          </button>
        )}
      </div>
    </article>
  );
};

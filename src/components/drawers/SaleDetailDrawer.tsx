import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react";
import { clsx } from "clsx";
import { Drawer } from "../forms/Drawer";
import { BitacoraService } from "../../services/bitacora.service";
import { useNotificationStore } from "../../stores/notifications.store";
import type { EntradaBitacora, Venta } from "../../types/models";

interface Props {
  sale: Venta | null;
  isOpen: boolean;
  onClose: () => void;
}

type FiltroTipo = "all" | "prospecto" | "venta" | "actividad";

const FILTROS: { key: FiltroTipo; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "prospecto", label: "Prospectos" },
  { key: "venta", label: "Ventas" },
  { key: "actividad", label: "Actividades" },
];

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
};

const formatFecha = (iso: string | null) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-HN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const initials = (name: string | null) =>
  (name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

export const SaleDetailDrawer = ({ sale, isOpen, onClose }: Props) => {
  const [entradas, setEntradas] = useState<EntradaBitacora[]>([]);
  const [filtro, setFiltro] = useState<FiltroTipo>("all");
  const [loading, setLoading] = useState(false);
  const [contenido, setContenido] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFinAprox, setFechaFinAprox] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [finalizando, setFinalizando] = useState<string | null>(null);

  const { notifications, markAsRead } = useNotificationStore();

  const cargarBitacora = async () => {
    if (!sale) return;
    setLoading(true);
    try {
      const data = await BitacoraService.getAll(sale.id);
      setEntradas(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !sale) return;
    void cargarBitacora();
  }, [isOpen, sale?.id]);

  // Auto-marcar notificaciones de esta venta como leídas
  useEffect(() => {
    if (!isOpen || !sale) return;
    const pendientes = notifications.filter(
      (n) => !n.read && n.linkTo === `/ventas?sale=${sale.id}`,
    );
    pendientes.forEach((n) => void markAsRead(n.id));
  }, [isOpen, sale?.id]);

  const handleGuardar = async () => {
    if (!sale || !contenido.trim()) return;
    setGuardando(true);
    try {
      await BitacoraService.create(sale.id, {
        contenido: contenido.trim(),
        fechaInicio: fechaInicio || undefined,
        fechaFinAprox: fechaFinAprox || undefined,
      });
      setContenido("");
      setFechaInicio("");
      setFechaFinAprox("");
      await cargarBitacora();
    } finally {
      setGuardando(false);
    }
  };

  const handleFinalizar = async (entradaId: string) => {
    if (!sale) return;
    setFinalizando(entradaId);
    try {
      const updated = await BitacoraService.finalizar(sale.id, entradaId);
      setEntradas((prev) =>
        prev.map((e) => (e.id === entradaId ? updated : e)),
      );
    } finally {
      setFinalizando(null);
    }
  };

  const entradasFiltradas =
    filtro === "all"
      ? entradas
      : filtro === "actividad"
        ? entradas.filter((e) => e.tipo === "actividad")
        : entradas.filter(
            (e) =>
              e.tipo === "estado" && e.datosExtra?.tipoEstado === filtro,
          );

  if (!sale) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Historial"
      width="xl"
    >
      {/* Chips de filtro */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={clsx(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filtro === f.key
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="mb-6 flex flex-col gap-3">
        {loading && (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        )}

        {!loading && entradasFiltradas.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-400">
            <ClipboardList size={28} className="mx-auto mb-2 opacity-40" />
            Sin registros en la bitácora
          </div>
        )}

        {!loading &&
          entradasFiltradas.map((entrada) => (
            <div
              key={entrada.id}
              className={clsx(
                "relative flex gap-3 rounded-lg border p-3",
                entrada.tipo === "actividad" && entrada.finalizada
                  ? "border-emerald-100 bg-emerald-50"
                  : "border-slate-100 bg-slate-50",
              )}
            >
              {/* Ícono */}
              <div className="flex-shrink-0">
                {entrada.tipo === "estado" && (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <RefreshCw size={14} />
                  </span>
                )}
                {entrada.tipo === "actividad" && (
                  <span
                    className={clsx(
                      "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                      entrada.finalizada
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    {entrada.finalizada ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      initials(entrada.nombreUsuario)
                    )}
                  </span>
                )}
              </div>

              {/* Contenido */}
              <div className="min-w-0 flex-1">
                {entrada.tipo === "estado" && entrada.datosExtra && (
                  <div className="flex flex-wrap items-center gap-1 text-sm">
                    <span className="font-medium text-slate-700">
                      {entrada.datosExtra.de}
                    </span>
                    <ArrowRight size={14} className="text-slate-400" />
                    <span className="font-semibold text-blue-700">
                      {entrada.datosExtra.a}
                    </span>
                  </div>
                )}

                {entrada.tipo === "actividad" && (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-700">
                        {entrada.nombreUsuario ?? "Usuario"}
                        {entrada.finalizada && (
                          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                            Finalizada
                          </span>
                        )}
                      </p>

                      {!entrada.finalizada && (
                        <button
                          onClick={() => void handleFinalizar(entrada.id)}
                          disabled={finalizando === entrada.id}
                          className="flex items-center gap-1 rounded-full border border-emerald-300 bg-white px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-60"
                        >
                          {finalizando === entrada.id ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={11} />
                          )}
                          Finalizar
                        </button>
                      )}
                    </div>

                    <p className="mt-1 break-words text-sm text-slate-600">
                      {entrada.contenido}
                    </p>

                    {/* Fechas */}
                    {(entrada.fechaInicio || entrada.fechaFinAprox) && (
                      <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-slate-500">
                        {entrada.fechaInicio && (
                          <span>
                            Inicio:{" "}
                            <span className="font-medium">
                              {formatFecha(entrada.fechaInicio)}
                            </span>
                          </span>
                        )}
                        {entrada.fechaFinAprox && (
                          <span>
                            Fin aprox.:{" "}
                            <span className="font-medium">
                              {formatFecha(entrada.fechaFinAprox)}
                            </span>
                          </span>
                        )}
                        {entrada.finalizadaEn && (
                          <span className="text-emerald-600">
                            Completada:{" "}
                            <span className="font-medium">
                              {formatFecha(entrada.finalizadaEn)}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}

                <p className="mt-1 text-[11px] text-slate-400">
                  {timeAgo(entrada.creadoEn)}
                </p>
              </div>
            </div>
          ))}
      </div>

      {/* Formulario de nueva actividad */}
      <div className="border-t border-slate-100 pt-4">
        <p className="mb-2 text-xs font-semibold text-slate-600">
          Nueva actividad
        </p>

        <textarea
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          rows={3}
          placeholder="Describe la actividad..."
          className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />

        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">
              Fecha inicio
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">
              Fecha fin aprox.
            </label>
            <input
              type="date"
              value={fechaFinAprox}
              onChange={(e) => setFechaFinAprox(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            onClick={() => void handleGuardar()}
            disabled={!contenido.trim() || !fechaInicio || !fechaFinAprox || guardando}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
          >
            {guardando ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            Guardar
          </button>
        </div>
      </div>
    </Drawer>
  );
};

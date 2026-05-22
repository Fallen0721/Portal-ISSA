import { useEffect, useMemo, useState } from "react";
import { isSameMonth, isSameYear, parseISO } from "date-fns";
import { Plus, X } from "lucide-react";
import {
  ALL_META_TIPOS,
  AppUser,
  META_TIPO_LABELS,
  MetaMensual,
  MetaMensualInput,
  MetaTipo,
} from "../types/models";
import {
  MetasService,
  ProduccionPorTipo,
  calcProduccionPorTipo,
  getTierL,
  getTierUsd,
  FUSIONA2_L_TIERS,
  DIRECTA_CRUZADA_L_TIERS,
  prodForTipo,
} from "../services/metas.service";
import { VentasService } from "../services/ventas.service";
import { UsersService } from "../services/auth.service";
import { MetaFormDrawer } from "../components/forms/MetaFormDrawer";
import { useToast } from "../hooks/useToast";
import { formatCurrency } from "../utils/format";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ── Celda por tipo ────────────────────────────────────────────────────────────

const TipoCell = ({
  tipo,
  prod,
  meta,
  onRemove,
}: {
  tipo: MetaTipo;
  prod: ProduccionPorTipo;
  meta: MetaMensual | undefined;
  onRemove: (id: string) => void;
}) => {
  if (!meta) {
    return <span className="text-slate-300 text-xs select-none">—</span>;
  }

  const produccion = prodForTipo(prod, tipo);
  const hasManualPercentage =
    meta.manualPercentage !== null && meta.manualPercentage !== undefined;
  const hasManualValue =
    meta.manualValue !== null && meta.manualValue !== undefined;

  let tierLabel = "Sin tier";
  let bono = 0;
  let currency: "L" | "$" = "L";

  if (tipo === "fusiona2_l") {
    const tier = getTierL(produccion, FUSIONA2_L_TIERS);
    tierLabel = tier?.label ?? "< 80%";
    bono = tier?.bonificacion ?? 0;
    currency = "L";
  } else if (tipo === "directa_cruzada_l") {
    const tier = getTierL(produccion, DIRECTA_CRUZADA_L_TIERS);
    tierLabel = tier?.label ?? "< Novato";
    bono = tier?.bonificacion ?? 0;
    currency = "L";
  } else {
    const tier = getTierUsd(produccion);
    tierLabel = tier?.label ?? "< $3,000";
    bono = 0; // USD bono is %, shown via label
    currency = "$";
  }

  const badgeColor =
    hasManualPercentage || hasManualValue
      ? "bg-primary/10 text-primary"
      : tierLabel === "200%"
        ? "bg-green-100 text-green-700"
        : tierLabel === "150%"
          ? "bg-emerald-100 text-emerald-700"
          : tierLabel === "100%"
            ? "bg-blue-100 text-blue-700"
            : tierLabel.startsWith("90") || tierLabel.startsWith("85") || tierLabel.startsWith("80")
              ? "bg-yellow-100 text-yellow-700"
              : tierLabel === "Novato" || tierLabel.startsWith("50")
                ? "bg-orange-100 text-orange-700"
                : "bg-slate-100 text-slate-500";

  const displayLabel = hasManualPercentage
    ? `${meta.manualPercentage}%`
    : tierLabel;
  const displayValue = hasManualValue
    ? (meta.manualValue ?? null)
    : bono > 0
      ? bono
      : null;
  const displayValuePrefix = hasManualValue ? "Valor manual" : "Bono";

  return (
    <div className="flex flex-col items-end gap-1 min-w-[120px]">
      <div className="flex items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeColor}`}>
          {displayLabel}
        </span>
        <button
          onClick={() => onRemove(meta.id)}
          className="rounded p-0.5 text-slate-300 hover:text-red-400 hover:bg-red-50"
          title="Quitar meta"
        >
          <X size={12} />
        </button>
      </div>
      <span className="text-xs text-slate-500">
        Producción: {formatCurrency(produccion, currency)}
      </span>
      {displayValue !== null && (
        <span className="text-xs font-medium text-green-600">
          {displayValuePrefix}: {formatCurrency(displayValue, currency)}
        </span>
      )}
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

export const MetasSection = () => {
  const { toast } = useToast();
  const now = new Date();

  const [mes, setMes] = useState(now.getMonth() + 1);
  const [año, setAño] = useState(now.getFullYear());
  const [vendedores, setVendedores] = useState<AppUser[]>([]);
  const [metas, setMetas] = useState<MetaMensual[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerVendedorId, setDrawerVendedorId] = useState<string>("");
  const [produccionMap, setProduccionMap] = useState<Record<string, ProduccionPorTipo>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [allUsers, allMetas, allVentas] = await Promise.all([
        UsersService.getAll(),
        MetasService.getAll(),
        VentasService.getAll(),
      ]);

      const comerciales = allUsers.filter((u) => u.role === "comercial" && u.isActive);
      setVendedores(comerciales);
      setMetas(allMetas);

      const refDate = new Date(año, mes - 1, 1);
      const ventasMes = allVentas.filter((v) => {
        const d = parseISO(v.fechaIngreso);
        return isSameMonth(d, refDate) && isSameYear(d, refDate);
      });

      const map: Record<string, ProduccionPorTipo> = {};
      for (const v of comerciales) {
        map[v.id] = calcProduccionPorTipo(ventasMes, v.id);
      }
      setProduccionMap(map);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Error al cargar datos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, [mes, año]);

  const handleAssign = async (input: MetaMensualInput) => {
    try {
      await MetasService.assign(input);
      await loadData();
      toast("Meta asignada", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "No se pudo asignar la meta", "error");
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await MetasService.remove(id);
      await loadData();
      toast("Meta removida", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Error al remover", "error");
    }
  };

  // Metas del mes/año seleccionado
  const metasMes = useMemo(
    () => metas.filter((m) => m.mes === mes && m.año === año),
    [metas, mes, año],
  );

  // Tipos ya asignados para el vendedor que abrirá el drawer
  const tiposYaAsignados = useMemo(
    () =>
      metasMes
        .filter((m) => m.vendedorId === drawerVendedorId)
        .map((m) => m.tipo),
    [metasMes, drawerVendedorId],
  );

  const rows = useMemo(
    () =>
      vendedores.map((v) => {
        const metasVendedor = metasMes.filter((m) => m.vendedorId === v.id);
        const prod = produccionMap[v.id] ?? { fusiona2L: 0, directaCruzadaL: 0, directaCruzadaUSD: 0 };
        const metaByTipo = Object.fromEntries(
          metasVendedor.map((m) => [m.tipo, m]),
        ) as Partial<Record<MetaTipo, MetaMensual>>;
        const tieneEspacio = metasVendedor.length < ALL_META_TIPOS.length;
        return { vendedor: v, prod, metaByTipo, tieneEspacio };
      }),
    [vendedores, metasMes, produccionMap],
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Metas Mensuales</h2>
        <p className="text-sm text-slate-500 mt-1">
          Asigna metas por canal a cada vendedor
        </p>
      </div>

      {/* Filtro período */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm w-fit">
        <span className="text-sm font-bold text-slate-700">Período:</span>
        <select
          className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary"
          value={mes}
          onChange={(e) => setMes(Number(e.target.value))}
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={i + 1} value={i + 1}>{name}</option>
          ))}
        </select>
        <input
          type="number"
          className="w-20 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary"
          value={año}
          onChange={(e) => setAño(Number(e.target.value) || now.getFullYear())}
        />
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-slate-400">Cargando...</div>
      ) : vendedores.length === 0 ? (
        <div className="py-20 text-center text-sm text-slate-400">
          No hay vendedores comerciales activos registrados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 text-left">Vendedor</th>
                {ALL_META_TIPOS.map((t) => (
                  <th key={t} className="px-4 py-3 text-right">
                    {META_TIPO_LABELS[t]}
                  </th>
                ))}
                <th className="px-4 py-3 text-center">Asignar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ vendedor, prod, metaByTipo, tieneEspacio }) => (
                <tr key={vendedor.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {vendedor.name}
                  </td>

                  {ALL_META_TIPOS.map((tipo) => (
                    <td key={tipo} className="px-4 py-3 text-right">
                      <TipoCell
                        tipo={tipo}
                        prod={prod}
                        meta={metaByTipo[tipo]}
                        onRemove={handleRemove}
                      />
                    </td>
                  ))}

                  <td className="px-4 py-3 text-center">
                    {tieneEspacio ? (
                      <button
                        onClick={() => {
                          setDrawerVendedorId(vendedor.id);
                          setIsDrawerOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary border border-primary/30 hover:bg-blue-50"
                        title="Asignar tipo de meta"
                      >
                        <Plus size={13} />
                        Agregar
                      </button>
                    ) : (
                      <span className="text-xs text-slate-300">Completo</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MetaFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={handleAssign}
        vendedores={vendedores}
        tiposYaAsignados={tiposYaAsignados}
        preselectedVendedorId={drawerVendedorId}
        mes={mes}
        año={año}
      />
    </div>
  );
};

export const MetasPage = MetasSection;

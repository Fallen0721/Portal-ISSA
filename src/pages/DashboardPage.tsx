import { useEffect, useMemo, useState } from "react";
import { isSameMonth, isSameYear, parseISO } from "date-fns";
import ReactECharts from "echarts-for-react";
import {
  DollarSign,
  FileText,
  Link as LinkIcon,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { QuickActions } from "../components/dashboard/QuickActions";
import { DashboardSkeleton } from "../components/dashboard/DashboardSkeleton";
import { TrendChart } from "../components/charts/TrendChart";
import { KpiCard } from "../components/kpi/KpiCard";
import { DetailedSummary } from "../components/summaries/DetailedSummary";
import { StatisticalSummary } from "../components/summaries/StatisticalSummary";
import { useAuth } from "../hooks/useAuth";
import {
  Cotizacion,
  META_TIPO_LABELS,
  MetaMensual,
  MetaTipo,
  Venta,
  VentaStatus,
  VENTA_ACTIVE_PIPELINE_STATUSES,
  VENTA_STATUS_GROUP_BY_STATUS,
} from "../types/models";
import { formatCurrency } from "../utils/format";
import { CotizacionesService } from "../services/cotizaciones.service";
import {
  DIRECTA_CRUZADA_L_TIERS,
  FUSIONA2_L_TIERS,
  MetasService,
  calcProduccionPorTipo,
  getTierL,
  getTierUsd,
  prodForTipo,
} from "../services/metas.service";
import { VentasService } from "../services/ventas.service";
import { VentasVidaService } from "../services/ventasVida.service";
import { VentasSaludService } from "../services/ventasSalud.service";
import { VentaVida, VentaVidaStatus, VentaSalud } from "../types/models";
import { VidaDetailedSummary } from "../components/summaries/VidaDetailedSummary";
import { SaludDetailedSummary } from "../components/summaries/SaludDetailedSummary";

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
};

// Compara como strings YYYY-MM-DD para evitar problemas de zona horaria
const matchesDateRange = (dateStr: string, from: string, to: string) => {
  const d = dateStr.slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
};

const DateRangeFilter = ({
  dateFrom,
  dateTo,
  onFromChange,
  onToChange,
}: {
  dateFrom: string;
  dateTo: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}) => (
  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <span className="text-sm font-bold text-slate-700">Período:</span>
    <div className="flex items-center gap-2">
      <label className="text-xs text-slate-500">Desde</label>
      <input
        type="date"
        value={dateFrom}
        onChange={(e) => onFromChange(e.target.value)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
    <div className="flex items-center gap-2">
      <label className="text-xs text-slate-500">Hasta</label>
      <input
        type="date"
        value={dateTo}
        onChange={(e) => onToChange(e.target.value)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
    {(dateFrom || dateTo) && (
      <button
        type="button"
        onClick={() => { onFromChange(""); onToChange(""); }}
        className="text-xs text-slate-400 underline hover:text-slate-600"
      >
        Limpiar
      </button>
    )}
  </div>
);

const META_100_TARGET: Record<MetaTipo, number> = {
  fusiona2_l: 500_000,
  directa_cruzada_l: 500_000,
  directa_cruzada_usd: 10_000,
};

const MetaTipoCard = ({
  tipo,
  produccion,
  meta,
}: {
  tipo: MetaTipo;
  produccion: number;
  meta: MetaMensual;
}) => {
  const currency: "L" | "$" = tipo === "directa_cruzada_usd" ? "$" : "L";
  const hasManualPercentage =
    meta.manualPercentage !== null && meta.manualPercentage !== undefined;
  const hasManualValue =
    meta.manualValue !== null && meta.manualValue !== undefined;

  let tierLabel = "Sin producción";
  let bono: number | null = null;
  let badgeColor = "bg-slate-100 text-slate-500";

  if (tipo === "fusiona2_l") {
    const tier = getTierL(produccion, FUSIONA2_L_TIERS);
    tierLabel = tier ? tier.label : produccion > 0 ? "< 80%" : "Sin producción";
    bono = tier?.bonificacion ?? null;
  } else if (tipo === "directa_cruzada_l") {
    const tier = getTierL(produccion, DIRECTA_CRUZADA_L_TIERS);
    tierLabel = tier ? tier.label : produccion > 0 ? "< Novato" : "Sin producción";
    bono = tier?.bonificacion ?? null;
  } else {
    const tier = getTierUsd(produccion);
    tierLabel = tier ? tier.label : produccion > 0 ? "< $3,000" : "Sin producción";
  }

  if (hasManualPercentage || hasManualValue) {
    badgeColor = "bg-primary/10 text-primary";
  } else if (tierLabel === "200%") badgeColor = "bg-green-100 text-green-700";
  else if (tierLabel === "150%") badgeColor = "bg-emerald-100 text-emerald-700";
  else if (tierLabel === "100%") badgeColor = "bg-blue-100 text-blue-700";
  else if (["90%", "85%", "80%"].includes(tierLabel))
    badgeColor = "bg-yellow-100 text-yellow-700";
  else if (tierLabel === "Novato" || tierLabel === "50%")
    badgeColor = "bg-orange-100 text-orange-700";

  const target = META_100_TARGET[tipo];
  const pct = Math.min((produccion / target) * 100, 100);
  const barColor =
    pct >= 100 ? "bg-green-500" : pct >= 60 ? "bg-primary" : "bg-accent";

  const displayTierLabel = hasManualPercentage
    ? `${meta.manualPercentage}%`
    : tierLabel;
  const displayValue = hasManualValue ? (meta.manualValue ?? null) : bono;
  const displayValueLabel = hasManualValue ? "Valor manual" : "Bono estimado";

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {META_TIPO_LABELS[tipo]}
      </p>
      <p className="text-lg font-bold text-slate-900">
        {formatCurrency(produccion, currency)}
      </p>

      <div className="space-y-1">
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {pct.toFixed(1)}% de {formatCurrency(target, currency)}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeColor}`}
          >
            {displayTierLabel}
          </span>
        </div>
      </div>

      {displayValue !== null && displayValue > 0 && (
        <p className="text-xs font-medium text-green-600">
          {displayValueLabel}: {formatCurrency(displayValue, currency)}
        </p>
      )}
    </div>
  );
};

const ComercialDashboard = ({ ventas }: { ventas: Venta[] }) => {
  const { user } = useAuth();
  const [metasMes, setMetasMes] = useState<MetaMensual[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState<"resumen" | "detallado">("resumen");
  const now = new Date();

  useEffect(() => {
    if (!user?.id) return;
    MetasService.getAllForVendorCurrentMonth(user.id)
      .then(setMetasMes)
      .catch(() => setMetasMes([]));
  }, [user?.id]);

  // Para metas: siempre el mes actual (usa fechaCierre si existe)
  const myVentasMes = useMemo(
    () =>
      ventas.filter((venta) => {
        if (venta.status !== VentaStatus.NUEVO) return false;
        if (venta.ownerUserId !== user?.id) return false;
        const dateStr = venta.fechaCierre ?? venta.fechaIngreso;
        const d = parseISO(dateStr);
        return isSameMonth(d, now) && isSameYear(d, now);
      }),
    [ventas, user?.id],
  );

  // Todos los status del vendedor, respetando el filtro de fechas (para DetailedSummary)
  // Usa fechaCierre si existe, sino fechaIngreso
  const myAllVentasFiltered = useMemo(
    () =>
      ventas.filter((venta) => {
        if (venta.ownerUserId !== user?.id) return false;
        const d = venta.fechaCierre ?? venta.fechaIngreso;
        return !dateFrom && !dateTo ? true : matchesDateRange(d, dateFrom, dateTo);
      }),
    [ventas, user?.id, dateFrom, dateTo],
  );

  // Para KPIs y gráfico: solo ventas Nuevo con fechaCierre, filtradas por fechaCierre
  const myVentasFiltered = useMemo(
    () =>
      ventas.filter((venta) => {
        if (venta.status !== VentaStatus.NUEVO) return false;
        if (!venta.fechaCierre) return false;
        if (venta.ownerUserId !== user?.id) return false;
        return !dateFrom && !dateTo
          ? true
          : matchesDateRange(venta.fechaCierre, dateFrom, dateTo);
      }),
    [ventas, user?.id, dateFrom, dateTo],
  );

  const myVentasActivas = useMemo(
    () =>
      ventas.filter(
        (venta) =>
          VENTA_ACTIVE_PIPELINE_STATUSES.includes(venta.status) &&
          venta.ownerUserId === user?.id,
      ),
    [ventas, user?.id],
  );

  const recentGestiones = useMemo(
    () =>
      [...myVentasActivas]
        .sort(
          (a, b) =>
            new Date(b.fechaIngreso).getTime() -
            new Date(a.fechaIngreso).getTime(),
        )
        .slice(0, 5),
    [myVentasActivas],
  );

  const primaL = myVentasFiltered
    .filter((venta) => venta.moneda === "L")
    .reduce((sum, venta) => sum + venta.primaNetaAnual, 0);
  const primaUSD = myVentasFiltered
    .filter((venta) => venta.moneda === "$")
    .reduce((sum, venta) => sum + venta.primaNetaAnual, 0);

  const prod = useMemo(
    () => calcProduccionPorTipo(myVentasMes, user?.id ?? ""),
    [myVentasMes, user?.id],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {getGreeting()}, {user?.name?.split(" ")[0] ?? "Usuario"}
          </h2>
          <p className="text-slate-500">Tu producción</p>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setActiveTab("resumen")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "resumen"
                ? "bg-primary text-white shadow-md"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Resumen Estadístico
          </button>
          <button
            onClick={() => setActiveTab("detallado")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "detallado"
                ? "bg-primary text-white shadow-md"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Resumen Detallado
          </button>
        </div>
      </div>

      <QuickActions />

      <DateRangeFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        onFromChange={setDateFrom}
        onToChange={setDateTo}
      />

      {activeTab === "resumen" ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard
              title="Mis Ventas"
              value={String(myVentasFiltered.length)}
              icon={FileText}
              variant="primary"
            />
            <KpiCard
              title="Prima Neta (L)"
              value={formatCurrency(primaL, "L")}
              icon={TrendingUp}
              variant="neutral"
            />
            <KpiCard
              title="Prima Neta ($)"
              value={formatCurrency(primaUSD, "$")}
              icon={DollarSign}
              variant="neutral"
            />
            <KpiCard
              title="Gestiones activas"
              value={String(myVentasActivas.length)}
              icon={Users}
              variant="accent"
            />
          </div>

          {metasMes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Mis metas del mes
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {metasMes.map((meta) => (
                  <MetaTipoCard
                    key={meta.id}
                    tipo={meta.tipo}
                    produccion={prodForTipo(prod, meta.tipo)}
                    meta={meta}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
              Tendencia de mis ventas
            </h3>
            {myVentasFiltered.length > 0 ? (
              <TrendChart data={myVentasFiltered} viewMode="mes" />
            ) : (
              <p className="py-10 text-center text-sm text-slate-400">
                Sin ventas registradas aún.
              </p>
            )}
          </div>
        </>
      ) : (
        <DetailedSummary data={myAllVentasFiltered} />
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Mis gestiones recientes
          </h3>
          <Link
            to="/ventas"
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Ver todos
            <LinkIcon size={12} />
          </Link>
        </div>

        {recentGestiones.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Sin gestiones activas registradas.
          </p>
        ) : (
          <div className="space-y-2">
            {recentGestiones.map((venta) => (
              <div
                key={venta.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {venta.asegurado}
                  </p>
                  <p className="text-xs text-slate-500">
                    {venta.producto} &middot;{" "}
                    {new Date(venta.fechaIngreso).toLocaleDateString("es-HN")}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    VENTA_STATUS_GROUP_BY_STATUS[venta.status]?.badgeClassName ??
                    "bg-slate-100 text-slate-600"
                  }`}
                >
                  {venta.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const matchesVidaDateRange = (item: VentaVida, from: string, to: string) => {
  if (!from && !to) return true;
  const d = parseISO(item.fechaIngreso);
  if (from && d < new Date(from)) return false;
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    if (d > toDate) return false;
  }
  return true;
};

type ModuloPersonas = "vida" | "salud";

const MONTH_NAMES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const formatMonth = (m: string) => {
  const [year, month] = m.split("-");
  return `${MONTH_NAMES[parseInt(month) - 1]} ${year.slice(2)}`;
};

const makePieOption = (items: { name: string; value: number }[], seriesName: string) => ({
  tooltip: { trigger: "item" as const, formatter: "{b}: {c} ({d}%)" },
  legend: { bottom: 0, left: "center", type: "scroll" as const, textStyle: { fontSize: 11 } },
  series: [{
    name: seriesName,
    type: "pie",
    radius: ["40%", "65%"],
    center: ["50%", "44%"],
    avoidLabelOverlap: false,
    itemStyle: { borderRadius: 8, borderColor: "#fff", borderWidth: 2 },
    label: { show: false },
    emphasis: { label: { show: true, fontSize: 16, fontWeight: "bold" as const } },
    labelLine: { show: false },
    data: items,
  }],
});

const PersonasCharts = ({ data }: { data: (VentaVida | VentaSalud)[] }) => {
  const trendOption = useMemo(() => {
    const grouped: Record<string, { primaL: number; primaD: number; count: number }> = {};
    data.forEach((v) => {
      const m = v.fechaIngreso.slice(0, 7);
      if (!grouped[m]) grouped[m] = { primaL: 0, primaD: 0, count: 0 };
      if (v.moneda === "L") grouped[m].primaL += v.primaPlaneada;
      else grouped[m].primaD += v.primaPlaneada;
      grouped[m].count++;
    });
    const months = Object.keys(grouped).sort();
    const fmtL = (v: number) => `L ${new Intl.NumberFormat("es-HN", { maximumFractionDigits: 0 }).format(v)}`;
    const fmtD = (v: number) => `$ ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v)}`;
    return {
      tooltip: { trigger: "axis" as const, axisPointer: { type: "cross" as const, label: { backgroundColor: "#6a7985" } } },
      legend: { data: ["Gestiones", "Prima L", "Prima $"] },
      grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
      xAxis: { type: "category" as const, boundaryGap: false, data: months.map(formatMonth) },
      yAxis: [
        { type: "value" as const, name: "Gestiones", position: "left" as const },
        { type: "value" as const, name: "Prima", position: "right" as const },
      ],
      series: [
        {
          name: "Gestiones", type: "line" as const, smooth: true,
          data: months.map((m) => grouped[m].count),
          areaStyle: { opacity: 0.1, color: "#005aa7" },
          lineStyle: { color: "#005aa7" },
          itemStyle: { color: "#005aa7" },
          yAxisIndex: 0,
        },
        {
          name: "Prima L", type: "line" as const, smooth: true,
          data: months.map((m) => Math.round(grouped[m].primaL)),
          lineStyle: { color: "#de5b14", width: 2 },
          itemStyle: { color: "#de5b14" },
          tooltip: { valueFormatter: fmtL },
          yAxisIndex: 1,
        },
        {
          name: "Prima $", type: "line" as const, smooth: true,
          data: months.map((m) => Math.round(grouped[m].primaD)),
          lineStyle: { color: "#0d9488", width: 2, type: "dashed" as const },
          itemStyle: { color: "#0d9488" },
          tooltip: { valueFormatter: fmtD },
          yAxisIndex: 1,
        },
      ],
      dataZoom: [{ type: "inside" as const, start: 0, end: 100 }, { start: 0, end: 100 }],
    };
  }, [data]);

  const statusOption = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((v) => { counts[v.status] = (counts[v.status] || 0) + 1; });
    return makePieOption(Object.entries(counts).map(([name, value]) => ({ name, value })), "Status");
  }, [data]);

  const companiaOption = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((v) => { counts[v.compania] = (counts[v.compania] || 0) + 1; });
    return makePieOption(
      Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8),
      "Compañía",
    );
  }, [data]);

  const canalOption = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((v) => { counts[v.canal] = (counts[v.canal] || 0) + 1; });
    return makePieOption(Object.entries(counts).map(([name, value]) => ({ name, value })), "Canal");
  }, [data]);

  if (data.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Tendencia mensual</h3>
          <ReactECharts option={trendOption} style={{ height: "260px" }} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Por status</h3>
          <ReactECharts option={statusOption} style={{ height: "260px" }} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Por compañía</h3>
          <ReactECharts option={companiaOption} style={{ height: "260px" }} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Por canal</h3>
          <ReactECharts option={canalOption} style={{ height: "260px" }} />
        </div>
      </div>
    </div>
  );
};

const matchesSaludDateRange = (item: VentaSalud, from: string, to: string) => {
  if (!from && !to) return true;
  const d = parseISO(item.fechaIngreso);
  if (from && d < new Date(from)) return false;
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    if (d > toDate) return false;
  }
  return true;
};

const PersonasDashboard = () => {
  const { user } = useAuth();
  const [modulo, setModulo] = useState<ModuloPersonas>("vida");
  const [ventasVida, setVentasVida] = useState<VentaVida[]>([]);
  const [ventasSalud, setVentasSalud] = useState<VentaSalud[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState<"estadistico" | "detallado">("estadistico");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      VentasVidaService.getAll().catch(() => [] as VentaVida[]),
      VentasSaludService.getAll().catch(() => [] as VentaSalud[]),
    ])
      .then(([vida, salud]) => {
        setVentasVida(vida);
        setVentasSalud(salud);
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  const filteredVida = useMemo(
    () => ventasVida.filter((v) => matchesVidaDateRange(v, dateFrom, dateTo)),
    [ventasVida, dateFrom, dateTo],
  );

  const filteredSalud = useMemo(
    () => ventasSalud.filter((v) => matchesSaludDateRange(v, dateFrom, dateTo)),
    [ventasSalud, dateFrom, dateTo],
  );

  const filteredData = modulo === "vida" ? filteredVida : filteredSalud;

  const kpi = useMemo(() => {
    const nuevas = filteredData.filter((v) => v.status === VentaVidaStatus.NUEVA);
    return {
      total: filteredData.length,
      nuevas: nuevas.length,
      primaL: nuevas.filter((v) => v.moneda === "L").reduce((s, v) => s + v.primaPlaneada, 0),
      primaD: nuevas.filter((v) => v.moneda === "$").reduce((s, v) => s + v.primaPlaneada, 0),
    };
  }, [filteredData]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {getGreeting()}, {user?.name?.split(" ")[0] ?? "Usuario"}
          </h2>
          <p className="text-slate-500">
            Módulo de Personas — {modulo === "vida" ? "Vida" : "Salud"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setModulo("vida")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
                modulo === "vida"
                  ? "bg-primary text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Vida
            </button>
            <button
              onClick={() => setModulo("salud")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
                modulo === "salud"
                  ? "bg-primary text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Salud
            </button>
          </div>

          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setActiveTab("estadistico")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
                activeTab === "estadistico"
                  ? "bg-primary text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Resumen Estadístico
            </button>
            <button
              onClick={() => setActiveTab("detallado")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
                activeTab === "detallado"
                  ? "bg-primary text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Resumen Detallado
            </button>
          </div>
        </div>
      </div>

      <DateRangeFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        onFromChange={setDateFrom}
        onToChange={setDateTo}
      />

      {activeTab === "estadistico" ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard
              title="Total Gestiones"
              value={String(kpi.total)}
              icon={FileText}
              variant="neutral"
            />
            <KpiCard
              title="Pólizas Nuevas"
              value={String(kpi.nuevas)}
              icon={TrendingUp}
              variant="primary"
            />
            <KpiCard
              title="Prima Planeada (L)"
              value={formatCurrency(kpi.primaL, "L")}
              icon={DollarSign}
              variant="neutral"
            />
            <KpiCard
              title="Prima Planeada ($)"
              value={formatCurrency(kpi.primaD, "$")}
              icon={DollarSign}
              variant="accent"
            />
          </div>
          <PersonasCharts data={filteredData} />
        </>
      ) : modulo === "vida" ? (
        <VidaDetailedSummary data={filteredVida} />
      ) : (
        <SaludDetailedSummary data={filteredSalud} />
      )}
    </div>
  );
};

type SeccionGerente = "comercial" | "vida" | "salud";

const GerenteComercialDashboard = ({
  ventas,
  cotizaciones,
}: {
  ventas: Venta[];
  cotizaciones: Cotizacion[];
}) => {
  const { user } = useAuth();
  const [seccion, setSeccion] = useState<SeccionGerente>("comercial");

  // Comercial state
  const [activeTab, setActiveTab] = useState<"statistical" | "detailed">("statistical");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedVendedor, setSelectedVendedor] = useState<string>("all");

  // Personas state
  const [ventasVida, setVentasVida] = useState<VentaVida[]>([]);
  const [ventasSalud, setVentasSalud] = useState<VentaSalud[]>([]);
  const [personasLoading, setPersonasLoading] = useState(false);
  const [personasFetched, setPersonasFetched] = useState(false);
  const [personasDateFrom, setPersonasDateFrom] = useState("");
  const [personasDateTo, setPersonasDateTo] = useState("");
  const [personasTab, setPersonasTab] = useState<"estadistico" | "detallado">("estadistico");

  useEffect(() => {
    if ((seccion === "vida" || seccion === "salud") && !personasFetched) {
      setPersonasLoading(true);
      Promise.all([
        VentasVidaService.getAll().catch(() => [] as VentaVida[]),
        VentasSaludService.getAll().catch(() => [] as VentaSalud[]),
      ])
        .then(([vida, salud]) => {
          setVentasVida(vida);
          setVentasSalud(salud);
          setPersonasFetched(true);
        })
        .finally(() => setPersonasLoading(false));
    }
  }, [seccion, personasFetched]);

  // Comercial computed
  const allFilteredVentas = useMemo(() => {
    let result = ventas.filter((v) => {
      const d = v.fechaCierre ?? v.fechaIngreso;
      return !dateFrom && !dateTo ? true : matchesDateRange(d, dateFrom, dateTo);
    });
    if (selectedVendedor !== "all") result = result.filter((v) => v.vendedor === selectedVendedor);
    return result;
  }, [ventas, dateFrom, dateTo, selectedVendedor]);

  const filteredVentas = useMemo(
    () => allFilteredVentas.filter((v) => v.status === VentaStatus.NUEVO),
    [allFilteredVentas],
  );

  const uniqueVendors = useMemo(
    () => Array.from(new Set(ventas.map((v) => v.vendedor).filter(Boolean))).sort(),
    [ventas],
  );

  // Personas computed
  const filteredVida = useMemo(
    () => ventasVida.filter((v) => matchesVidaDateRange(v, personasDateFrom, personasDateTo)),
    [ventasVida, personasDateFrom, personasDateTo],
  );

  const filteredSalud = useMemo(
    () => ventasSalud.filter((v) => matchesSaludDateRange(v, personasDateFrom, personasDateTo)),
    [ventasSalud, personasDateFrom, personasDateTo],
  );

  const personasData = seccion === "vida" ? filteredVida : filteredSalud;

  const personasKpi = useMemo(() => {
    const nuevas = personasData.filter((v) => v.status === VentaVidaStatus.NUEVA);
    return {
      total: personasData.length,
      nuevas: nuevas.length,
      primaL: nuevas.filter((v) => v.moneda === "L").reduce((s, v) => s + v.primaPlaneada, 0),
      primaD: nuevas.filter((v) => v.moneda === "$").reduce((s, v) => s + v.primaPlaneada, 0),
    };
  }, [personasData]);

  const seccionLabel: Record<SeccionGerente, string> = {
    comercial: "Comercial",
    vida: "Personas — Vida",
    salud: "Personas — Salud",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {getGreeting()}, {user?.name?.split(" ")[0] ?? "Gerente"}
          </h2>
          <p className="text-slate-500">{seccionLabel[seccion]}</p>
        </div>

        {/* Top section selector */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {(["comercial", "vida", "salud"] as SeccionGerente[]).map((s) => (
            <button
              key={s}
              onClick={() => setSeccion(s)}
              className={`rounded-md px-4 py-2 text-sm font-medium capitalize transition-all ${
                seccion === s
                  ? "bg-primary text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s === "comercial" ? "Comercial" : s === "vida" ? "Vida" : "Salud"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Sección Comercial ── */}
      {seccion === "comercial" && (
        <>
          <QuickActions />

          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <DateRangeFilter
              dateFrom={dateFrom}
              dateTo={dateTo}
              onFromChange={setDateFrom}
              onToChange={setDateTo}
            />
            <div className="hidden h-6 w-px bg-slate-200 sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-700">Vendedor:</span>
              <select
                className="rounded-lg border border-slate-300 bg-slate-50 p-2 text-sm text-slate-900 outline-none focus:border-primary"
                value={selectedVendedor}
                onChange={(e) => setSelectedVendedor(e.target.value)}
              >
                <option value="all">Todos</option>
                {uniqueVendors.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="hidden h-6 w-px bg-slate-200 sm:block" />
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
              <button
                onClick={() => setActiveTab("statistical")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  activeTab === "statistical" ? "bg-primary text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Estadístico
              </button>
              <button
                onClick={() => setActiveTab("detailed")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  activeTab === "detailed" ? "bg-primary text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Detallado
              </button>
            </div>
          </div>

          {activeTab === "statistical" ? (
            <StatisticalSummary
              data={filteredVentas}
              allVentas={ventas}
              cotizaciones={cotizaciones}
            />
          ) : (
            <DetailedSummary data={allFilteredVentas} />
          )}
        </>
      )}

      {/* ── Sección Vida / Salud ── */}
      {(seccion === "vida" || seccion === "salud") && (
        <>
          {personasLoading ? (
            <DashboardSkeleton />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <DateRangeFilter
                  dateFrom={personasDateFrom}
                  dateTo={personasDateTo}
                  onFromChange={setPersonasDateFrom}
                  onToChange={setPersonasDateTo}
                />
                <div className="hidden h-6 w-px bg-slate-200 sm:block" />
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                  <button
                    onClick={() => setPersonasTab("estadistico")}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                      personasTab === "estadistico" ? "bg-primary text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Estadístico
                  </button>
                  <button
                    onClick={() => setPersonasTab("detallado")}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                      personasTab === "detallado" ? "bg-primary text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Detallado
                  </button>
                </div>
              </div>

              {personasTab === "estadistico" ? (
                <>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <KpiCard title="Total Gestiones" value={String(personasKpi.total)} icon={FileText} variant="neutral" />
                    <KpiCard title="Pólizas Nuevas" value={String(personasKpi.nuevas)} icon={TrendingUp} variant="primary" />
                    <KpiCard title="Prima Planeada (L)" value={formatCurrency(personasKpi.primaL, "L")} icon={DollarSign} variant="neutral" />
                    <KpiCard title="Prima Planeada ($)" value={formatCurrency(personasKpi.primaD, "$")} icon={DollarSign} variant="accent" />
                  </div>
                  <PersonasCharts data={personasData} />
                </>
              ) : seccion === "vida" ? (
                <VidaDetailedSummary data={filteredVida} />
              ) : (
                <SaludDetailedSummary data={filteredSalud} />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

const AdminDashboard = ({
  ventas,
  cotizaciones,
}: {
  ventas: Venta[];
  cotizaciones: Cotizacion[];
}) => {
  const { user: dashUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"statistical" | "detailed">(
    "statistical",
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedVendedor, setSelectedVendedor] = useState<string>("all");

  const allFilteredVentas = useMemo(() => {
    let result = ventas.filter((venta) => {
      const d = venta.fechaCierre ?? venta.fechaIngreso;
      return !dateFrom && !dateTo ? true : matchesDateRange(d, dateFrom, dateTo);
    });
    if (selectedVendedor !== "all") {
      result = result.filter((venta) => venta.vendedor === selectedVendedor);
    }
    return result;
  }, [ventas, dateFrom, dateTo, selectedVendedor]);

  const filteredVentas = useMemo(
    () => allFilteredVentas.filter((v) => v.status === VentaStatus.NUEVO),
    [allFilteredVentas],
  );

  const uniqueVendors = useMemo(
    () =>
      Array.from(new Set(ventas.map((venta) => venta.vendedor).filter(Boolean))).sort(),
    [ventas],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {getGreeting()}, {dashUser?.name?.split(" ")[0] ?? "Administrador"}
          </h2>
          <p className="text-slate-500">Resumen general de desempeño</p>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setActiveTab("statistical")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "statistical"
                ? "bg-primary text-white shadow-md"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Resumen Estadístico
          </button>
          <button
            onClick={() => setActiveTab("detailed")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "detailed"
                ? "bg-primary text-white shadow-md"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Resumen Detallado
          </button>
        </div>
      </div>

      <QuickActions />

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onFromChange={setDateFrom}
          onToChange={setDateTo}
        />

        <div className="hidden h-6 w-px bg-slate-200 sm:block" />

        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">Vendedor:</span>
          <select
            className="rounded-lg border border-slate-300 bg-slate-50 p-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-primary"
            value={selectedVendedor}
            onChange={(event) => setSelectedVendedor(event.target.value)}
          >
            <option value="all">Todos</option>
            {uniqueVendors.map((vendor) => (
              <option key={vendor} value={vendor}>
                {vendor}
              </option>
            ))}
          </select>
        </div>
      </div>
      {activeTab === "statistical" ? (
        <StatisticalSummary
          data={filteredVentas}
          allVentas={ventas}
          cotizaciones={cotizaciones}
        />
      ) : (
        <DetailedSummary data={allFilteredVentas} />
      )}
    </div>
  );
};

export const DashboardPage = () => {
  const { user } = useAuth();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [allVentas, allCotizaciones] = await Promise.all([
          VentasService.getAll(),
          user?.role === "admin"
            ? CotizacionesService.getAll()
            : Promise.resolve([]),
        ]);
        setVentas(allVentas);
        setCotizaciones(allCotizaciones);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [user?.id, user?.role]);

  if (loading) return <DashboardSkeleton />;

  if (user?.role === "personas") {
    return <PersonasDashboard />;
  }

  if (user?.role === "comercial") {
    return <ComercialDashboard ventas={ventas} />;
  }

  if (user?.role === "gerente_comercial") {
    return <GerenteComercialDashboard ventas={ventas} cotizaciones={cotizaciones} />;
  }

  return <AdminDashboard ventas={ventas} cotizaciones={cotizaciones} />;
};

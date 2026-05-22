import { useMemo } from "react";
import { Users, FileText, BarChart3, DollarSign } from "lucide-react";
import {
  isSameDay,
  isSameMonth,
  isSameWeek,
  isSameYear,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  parseISO,
} from "date-fns";
import { KpiCard } from "./KpiCard";
import {
  Venta,
  VENTA_ACTIVE_PIPELINE_STATUSES,
} from "../../types/models";
import { formatCurrency } from "../../utils/format";
import { DashboardDateFilter } from "../../services/compensation.service";

interface KpiGridProps {
  ventas: Venta[];
  allVentas?: Venta[];
  dateFilter?: DashboardDateFilter;
}

const TREND_LABELS: Record<DashboardDateFilter, string> = {
  hoy: "vs ayer",
  semana: "vs semana anterior",
  mes: "vs mes anterior",
  anual: "vs año anterior",
};

const getPreviousPeriodData = (
  allVentas: Venta[],
  dateFilter: DashboardDateFilter,
) => {
  const now = new Date();
  const prev =
    dateFilter === "hoy"
      ? subDays(now, 1)
      : dateFilter === "semana"
        ? subWeeks(now, 1)
        : dateFilter === "mes"
          ? subMonths(now, 1)
          : subYears(now, 1);

  return allVentas.filter((v) => {
    const date = parseISO(v.fechaIngreso);
    if (dateFilter === "hoy") return isSameDay(date, prev);
    if (dateFilter === "semana")
      return isSameWeek(date, prev, { weekStartsOn: 1 });
    if (dateFilter === "mes")
      return isSameMonth(date, prev) && isSameYear(date, prev);
    return isSameYear(date, prev);
  });
};

const calcTrend = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? { value: 100, isPositive: true } : undefined;
  const pct = Math.round(((current - previous) / previous) * 100);
  return { value: Math.abs(pct), isPositive: pct >= 0 };
};

export const KpiGrid = ({
  ventas,
  allVentas,
  dateFilter,
}: KpiGridProps) => {
  const totalPrimaL = ventas
    .filter((v) => v.moneda === "L")
    .reduce((sum, v) => sum + v.primaNetaAnual, 0);
  const totalPrimaD = ventas
    .filter((v) => v.moneda === "$")
    .reduce((sum, v) => sum + v.primaNetaAnual, 0);
  const ventasPeriodo = ventas.length;
  const gestionesActivas = ventas.filter((venta) =>
    VENTA_ACTIVE_PIPELINE_STATUSES.includes(venta.status),
  ).length;

  const trends = useMemo(() => {
    if (!allVentas || !dateFilter) return null;

    const prevVentas = getPreviousPeriodData(allVentas, dateFilter);
    const prevPrimaL = prevVentas
      .filter((v) => v.moneda === "L")
      .reduce((s, v) => s + v.primaNetaAnual, 0);
    const prevPrimaD = prevVentas
      .filter((v) => v.moneda === "$")
      .reduce((s, v) => s + v.primaNetaAnual, 0);
    const prevCount = prevVentas.length;
    const prevGestionesActivas = prevVentas.filter((venta) =>
      VENTA_ACTIVE_PIPELINE_STATUSES.includes(venta.status),
    ).length;

    return {
      primaL: calcTrend(totalPrimaL, prevPrimaL),
      primaD: calcTrend(totalPrimaD, prevPrimaD),
      ventas: calcTrend(ventasPeriodo, prevCount),
      gestiones: calcTrend(gestionesActivas, prevGestionesActivas),
    };
  }, [allVentas, dateFilter, totalPrimaL, totalPrimaD, ventasPeriodo, gestionesActivas]);

  const trendLabel = dateFilter ? TREND_LABELS[dateFilter] : undefined;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="Prima Neta (L)"
        value={formatCurrency(totalPrimaL, "L")}
        icon={BarChart3}
        variant="primary"
        trend={trends?.primaL}
        trendLabel={trendLabel}
      />
      <KpiCard
        title="Prima Neta ($)"
        value={formatCurrency(totalPrimaD, "$")}
        icon={DollarSign}
        variant="primary"
        trend={trends?.primaD}
        trendLabel={trendLabel}
      />
      <KpiCard
        title="Ventas del Periodo"
        value={ventasPeriodo.toString()}
        icon={FileText}
        variant="accent"
        trend={trends?.ventas}
        trendLabel={trendLabel}
      />
      <KpiCard
        title="Gestiones Activas"
        value={gestionesActivas.toString()}
        icon={Users}
        trend={trends?.gestiones}
        trendLabel={trendLabel}
      />
    </div>
  );
};

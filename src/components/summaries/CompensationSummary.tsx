import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
import { addMonths, endOfDay, endOfMonth, isSameMonth, isSameYear, startOfMonth, subMonths } from "date-fns";
import {
  CompensationService,
  CompensationTier,
  DIRECT_CROSS_LEMPIRA_TIERS,
  FUSIONA2_LEMPIRA_TIERS,
  getCurrentTier,
  getNextTier,
  USD_PROGRESS_TIERS,
  VendorLempiraScheme,
  VendorCompensationSnapshot,
} from "../../services/compensation.service";
import { Venta } from "../../types/models";
import { formatCurrency, formatNumber } from "../../utils/format";

interface CompensationSummaryProps {
  allVentas: Venta[];
  isVendorView: boolean;
}

const formatPercent = (rate: number) => `${(rate * 100).toFixed(2)}%`;
const formatCompact = (amount: number) =>
  new Intl.NumberFormat("es-HN", {
    maximumFractionDigits: 0,
  }).format(amount);

const getLempiraProgressConfig = (scheme: VendorLempiraScheme) => {
  if (scheme === "fusiona2") {
    return {
      title: "Meta Lempiras Fusiona2",
      tiers: FUSIONA2_LEMPIRA_TIERS,
      emptyLabel: "Sin escala Fusiona2 activa",
      maxLabel: "Ya alcanzaste la escala máxima Fusiona2.",
      nextPrefix: "Próxima meta",
      remainingPrefix: "Te faltan",
      remainingSuffix: "para activar la siguiente meta Fusiona2.",
    };
  }

  return {
    title: "Meta Lempiras Directa/Cruzada",
    tiers: DIRECT_CROSS_LEMPIRA_TIERS,
    emptyLabel: "Sin escala Directa/Cruzada activa",
    maxLabel: "Ya alcanzaste la escala máxima Directa/Cruzada.",
    nextPrefix: "Próxima meta",
    remainingPrefix: "Te faltan",
    remainingSuffix: "para activar la siguiente meta Directa/Cruzada.",
  };
};

const getProgressWidth = (value: number, tiers: CompensationTier[]) => {
  const currentTier = getCurrentTier(value, tiers);
  const nextTier = getNextTier(value, tiers);

  if (!nextTier && tiers.length > 0) {
    return 100;
  }

  const baseThreshold = currentTier?.threshold ?? 0;
  const targetThreshold = nextTier?.threshold ?? tiers[0]?.threshold ?? 1;
  const range = Math.max(1, targetThreshold - baseThreshold);
  const progressValue = Math.max(0, value - baseThreshold);
  return Math.min(100, (progressValue / range) * 100);
};

const ProgressCard = ({
  title,
  currentValue,
  currentValueLabel,
  currentTierLabel,
  nextTierLabel,
  remainingLabel,
  creditedLabel,
  progress,
  progressTone,
}: {
  title: string;
  currentValue: string;
  currentValueLabel: string;
  currentTierLabel: string;
  nextTierLabel: string;
  remainingLabel: string;
  creditedLabel: string;
  progress: number;
  progressTone: "blue" | "orange";
}) => {
  const progressClass =
    progressTone === "blue"
      ? "from-primary to-primary-dark"
      : "from-accent to-accent-dark";

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {title}
          </p>
          <h4 className="mt-2 text-3xl font-bold text-slate-900">
            {currentValue}
          </h4>
          <p className="mt-1 text-sm text-slate-500">{currentValueLabel}</p>
        </div>
        <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Bono acreditable
          </p>
          <p className="mt-1 text-xl font-bold text-slate-900">{creditedLabel}</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          <span>{currentTierLabel}</span>
          <span>{nextTierLabel}</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${progressClass} transition-all duration-500`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-slate-600">{remainingLabel}</p>
      </div>
    </div>
  );
};

const VendorCompensationProgress = ({
  vendor,
}: {
  vendor: VendorCompensationSnapshot;
}) => {
  const usdCurrentTier = getCurrentTier(vendor.usdBase, USD_PROGRESS_TIERS);
  const usdNextTier = getNextTier(vendor.usdBase, USD_PROGRESS_TIERS);
  const usdProgress = getProgressWidth(vendor.usdBase, USD_PROGRESS_TIERS);
  const usdRemaining = usdNextTier
    ? usdNextTier.threshold - vendor.usdBase
    : 0;
  const lempiraConfig = getLempiraProgressConfig(vendor.lempiraScheme);
  const lempiraCurrentTier = getCurrentTier(
    vendor.lempiraProduction,
    lempiraConfig.tiers,
  );
  const lempiraNextTier = getNextTier(
    vendor.lempiraProduction,
    lempiraConfig.tiers,
  );
  const lempiraProgress = getProgressWidth(
    vendor.lempiraProduction,
    lempiraConfig.tiers,
  );
  const lempiraRemaining = lempiraNextTier
    ? lempiraNextTier.threshold - vendor.lempiraProduction
    : 0;

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <ProgressCard
        title="Meta USD"
        currentValue={formatCurrency(vendor.usdBase, "$")}
        currentValueLabel={`${formatNumber(vendor.usdEligibleSales)} venta(s) nuevas elegibles registradas`}
        currentTierLabel={
          usdCurrentTier
            ? `Tramo actual ${formatPercent(usdCurrentTier.rate)}`
            : "Sin tramo activo"
        }
        nextTierLabel={
          usdNextTier
            ? `Próximo ${formatCurrency(usdNextTier.threshold, "$")}`
            : "Tope máximo alcanzado"
        }
        remainingLabel={
          usdNextTier
            ? `Te faltan ${formatCurrency(usdRemaining, "$")} para llegar al siguiente tramo.`
            : "Ya alcanzaste el tramo máximo de bonificación en USD."
        }
        creditedLabel={formatCurrency(vendor.usdBonus, "$")}
        progress={usdProgress}
        progressTone="blue"
      />

      <ProgressCard
        title={lempiraConfig.title}
        currentValue={formatCurrency(vendor.lempiraProduction, "L")}
        currentValueLabel={`${formatNumber(vendor.lempiraEligibleSales)} venta(s) nuevas elegibles registradas`}
        currentTierLabel={
          lempiraCurrentTier
            ? `Escala actual ${formatPercent(lempiraCurrentTier.rate)}`
            : lempiraConfig.emptyLabel
        }
        nextTierLabel={
          lempiraNextTier
            ? `${lempiraConfig.nextPrefix} ${formatCurrency(lempiraNextTier.threshold, "L")}`
            : "Tope máximo alcanzado"
        }
        remainingLabel={
          lempiraNextTier
            ? `${lempiraConfig.remainingPrefix} L ${formatCompact(lempiraRemaining)} ${lempiraConfig.remainingSuffix}`
            : lempiraConfig.maxLabel
        }
        creditedLabel={formatCurrency(vendor.lempiraBonus, "L")}
        progress={lempiraProgress}
        progressTone="orange"
      />
    </div>
  );
};

const formatMonthLabel = (date: Date) =>
  new Intl.DateTimeFormat("es-HN", { month: "long", year: "numeric" }).format(date);

export const CompensationSummary = ({
  allVentas,
  isVendorView,
}: CompensationSummaryProps) => {
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));

  const now = new Date();
  const isCurrentMonth = isSameMonth(selectedMonth, now) && isSameYear(selectedMonth, now);

  const snapshot = useMemo(
    () => CompensationService.getSnapshot(allVentas, "mes", endOfDay(endOfMonth(selectedMonth))),
    [allVentas, selectedMonth],
  );

  const prevMonth = () => setSelectedMonth((m) => startOfMonth(subMonths(m, 1)));
  const nextMonth = () => {
    if (!isCurrentMonth) setSelectedMonth((m) => startOfMonth(addMonths(m, 1)));
  };

  const MonthNav = (
    <div className="flex items-center gap-1">
      <button
        onClick={prevMonth}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        title="Mes anterior"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="min-w-[130px] text-center text-sm font-semibold capitalize text-slate-700">
        {formatMonthLabel(selectedMonth)}
      </span>
      <button
        onClick={nextMonth}
        disabled={isCurrentMonth}
        className="rounded-lg p-1.5 transition-colors disabled:cursor-not-allowed disabled:text-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        title="Mes siguiente"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );

  const topPerformerUserId =
    snapshot.vendors.length > 0
      ? [...snapshot.vendors].sort(
          (a, b) => b.usdBase + b.lempiraProduction - (a.usdBase + a.lempiraProduction),
        )[0]?.ownerUserId
      : null;
  if (snapshot.vendors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        No hay ventas elegibles para calcular compensación en el periodo.
      </div>
    );
  }

  if (isVendorView) {
    const vendor = snapshot.vendors[0] ?? snapshot.totals;

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Tu compensación estimada
            </h3>
            <p className="text-sm text-slate-500 capitalize">
              {formatMonthLabel(selectedMonth)} — {vendor.vendedor}
            </p>
          </div>
          {MonthNav}
        </div>

        <VendorCompensationProgress vendor={vendor} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">
            Compensación por vendedor
          </h3>
          <p className="text-sm text-slate-500">
            Vista comparativa del bono estimado en USD y lempiras.
          </p>
        </div>
        {MonthNav}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Vendedor</th>
              <th className="px-4 py-3 text-center">Ventas USD</th>
              <th className="px-4 py-3 text-right">Base USD</th>
              <th className="px-4 py-3 text-right">Bonificación USD</th>
              <th className="px-4 py-3 text-right">Producción L</th>
              <th className="px-4 py-3 text-right">% Escala L</th>
              <th className="px-4 py-3 text-right">Bonificación L</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.vendors.map((vendor, idx) => {
              const isTop = vendor.ownerUserId === topPerformerUserId;
              const isExpanded = expandedVendor === vendor.ownerUserId;
              return (
                <React.Fragment key={vendor.ownerUserId}>
                  <tr
                    onClick={() =>
                      setExpandedVendor(isExpanded ? null : vendor.ownerUserId)
                    }
                    className={`border-b border-slate-100 text-sm text-slate-600 cursor-pointer transition-colors last:border-none ${
                      idx % 2 === 1 ? "bg-slate-50/50" : ""
                    } ${isTop ? "border-l-4 border-l-accent" : ""} hover:bg-blue-50/50`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <span className="inline-flex items-center gap-1.5">
                        {isExpanded ? (
                          <ChevronDown size={14} className="text-slate-400" />
                        ) : (
                          <ChevronRight size={14} className="text-slate-400" />
                        )}
                        {vendor.vendedor}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {vendor.usdEligibleSales}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(vendor.usdBase, "$")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(vendor.usdBonus, "$")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(vendor.lempiraProduction, "L")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatPercent(vendor.lempiraRate)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(vendor.lempiraBonus, "L")}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} className="bg-slate-50/80 px-6 py-4">
                        <VendorCompensationProgress vendor={vendor} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-slate-100 bg-slate-50 text-sm font-semibold text-slate-800">
            <tr>
              <td className="px-4 py-3">TOTAL</td>
              <td className="px-4 py-3 text-center">
                {snapshot.totals.usdEligibleSales}
              </td>
              <td className="px-4 py-3 text-right">
                {formatCurrency(snapshot.totals.usdBase, "$")}
              </td>
              <td className="px-4 py-3 text-right">
                {formatCurrency(snapshot.totals.usdBonus, "$")}
              </td>
              <td className="px-4 py-3 text-right">
                {formatCurrency(snapshot.totals.lempiraProduction, "L")}
              </td>
              <td className="px-4 py-3 text-right">
                {formatPercent(snapshot.totals.lempiraRate)}
              </td>
              <td className="px-4 py-3 text-right">
                {formatCurrency(snapshot.totals.lempiraBonus, "L")}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

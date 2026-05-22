import React, { useMemo, useState } from "react";
import { PieChart, Activity, BarChart } from "lucide-react";
import ReactECharts from "echarts-for-react";
import { Cotizacion, Venta } from "../../types/models";
import { useAuth } from "../../hooks/useAuth";
import { DashboardDateFilter } from "../../services/compensation.service";
import { KpiGrid } from "../kpi/KpiGrid";
import { TrendChart } from "../charts/TrendChart";
import { CompensationSummary } from "./CompensationSummary";
import { EmptyState } from "../dashboard/EmptyState";
import { ConversionFunnel } from "../dashboard/ConversionFunnel";
import { VendorDetailSummary } from "./VendorDetailSummary";

interface StatisticalSummaryProps {
  data: Venta[];
  allVentas: Venta[];
  cotizaciones?: Cotizacion[];
  dateFilter?: DashboardDateFilter;
}

type PieMode = "count" | "primaL" | "primaD";

const PIE_MODE_LABELS: Record<PieMode, string> = {
  count: "Cantidad",
  primaL: "Prima L",
  primaD: "Prima $",
};

const PRODUCTS = ["Vida", "Medico", "Automovil", "Daños"] as const;
const PRODUCT_LABELS: Record<string, string> = {
  Vida: "Vida",
  Medico: "Médico",
  Automovil: "Automóvil",
  Daños: "Daños",
};

export const StatisticalSummary: React.FC<StatisticalSummaryProps> = ({
  data,
  allVentas,
  cotizaciones = [],
  dateFilter = "mes",
}) => {
  const { user } = useAuth();
  const [pieMode, setPieMode] = useState<PieMode>("count");

  const productOptions = useMemo(() => {
    const pieData = PRODUCTS.map((prod) => {
      const filtered = data.filter((v) => v.producto === prod);
      let value: number;
      if (pieMode === "count") {
        value = filtered.length;
      } else if (pieMode === "primaL") {
        value = filtered
          .filter((v) => v.moneda === "L")
          .reduce((s, v) => s + v.primaNetaAnual, 0);
      } else {
        value = filtered
          .filter((v) => v.moneda === "$")
          .reduce((s, v) => s + v.primaNetaAnual, 0);
      }
      return { value, name: PRODUCT_LABELS[prod] };
    });

    const currencyFormatter =
      pieMode === "primaL"
        ? (v: number) =>
            `L ${new Intl.NumberFormat("es-HN", { maximumFractionDigits: 0 }).format(v)}`
        : pieMode === "primaD"
          ? (v: number) =>
              `$ ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v)}`
          : undefined;

    return {
      tooltip: {
        trigger: "item",
        ...(currencyFormatter ? { valueFormatter: currencyFormatter } : {}),
      },
      legend: { bottom: "0%", left: "center" },
      series: [
        {
          name: "Productos",
          type: "pie",
          radius: ["40%", "70%"],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 10, borderColor: "#fff", borderWidth: 2 },
          label: { show: false, position: "center" },
          emphasis: {
            label: { show: true, fontSize: 40, fontWeight: "bold" },
          },
          labelLine: { show: false },
          data: pieData,
        },
      ],
    };
  }, [data, pieMode]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
          <Activity className="text-primary" size={20} />
          Indicadores Clave
        </h3>
        <KpiGrid
          ventas={data}
          allVentas={allVentas}
          dateFilter={dateFilter}
        />
      </div>

      <CompensationSummary
        allVentas={allVentas}
        isVendorView={user?.role === "comercial"}
      />

      {data.length === 0 ? (
        <EmptyState
          title="Sin ventas en este periodo"
          subtitle="Ajusta el filtro de periodo para ver datos de ventas, graficos y resúmenes."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md lg:col-span-2">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                <BarChart className="text-primary" size={20} />
                Tendencia de Ventas
              </h3>
              <TrendChart data={data} viewMode={dateFilter} />
            </div>

            <div className="space-y-6 lg:col-span-1">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                    <PieChart className="text-primary" size={20} />
                    Distribución por Producto
                  </h3>
                </div>
                <div className="mb-3 flex gap-1">
                  {(Object.keys(PIE_MODE_LABELS) as PieMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setPieMode(mode)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        pieMode === mode
                          ? "bg-slate-800 text-white"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {PIE_MODE_LABELS[mode]}
                    </button>
                  ))}
                </div>
                <ReactECharts
                  option={productOptions}
                  style={{ height: "280px" }}
                />
              </div>

              <ConversionFunnel
                cotizaciones={cotizaciones}
                ventas={data}
              />
            </div>
          </div>

          <VendorDetailSummary data={data} />
        </>
      )}
    </div>
  );
};

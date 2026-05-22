import ReactECharts from "echarts-for-react";
import { Filter } from "lucide-react";
import {
  Cotizacion,
  Venta,
  VentaStatus,
  VENTA_ACTIVE_PIPELINE_STATUSES,
} from "../../types/models";

interface ConversionFunnelProps {
  cotizaciones: Cotizacion[];
  ventas: Venta[];
}

export const ConversionFunnel = ({
  cotizaciones,
  ventas,
}: ConversionFunnelProps) => {
  const totalCotizaciones = cotizaciones.length;
  const ventasDesdeCotizacion = ventas.filter(
    (venta) => venta.source === "cotizacion",
  );
  const gestionesActivas = ventasDesdeCotizacion.filter((venta) =>
    VENTA_ACTIVE_PIPELINE_STATUSES.includes(venta.status),
  ).length;
  const cierres = ventasDesdeCotizacion.filter(
    (venta) => venta.status === VentaStatus.NUEVO,
  ).length;

  const cotToVenta =
    totalCotizaciones > 0
      ? Math.round((ventasDesdeCotizacion.length / totalCotizaciones) * 100)
      : 0;
  const ventaACierre =
    ventasDesdeCotizacion.length > 0
      ? Math.round((cierres / ventasDesdeCotizacion.length) * 100)
      : 0;

  const option = {
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c}",
    },
    series: [
      {
        name: "Embudo",
        type: "funnel",
        left: "10%",
        top: 10,
        bottom: 10,
        width: "80%",
        min: 0,
        max: Math.max(totalCotizaciones, ventasDesdeCotizacion.length, cierres, 1),
        minSize: "20%",
        maxSize: "100%",
        sort: "descending",
        gap: 4,
        label: {
          show: true,
          position: "inside",
          fontSize: 12,
          color: "#fff",
          fontWeight: "bold",
        },
        labelLine: { show: false },
        itemStyle: {
          borderColor: "#fff",
          borderWidth: 2,
        },
        data: [
          {
            value: totalCotizaciones,
            name: `Cotizaciones (${totalCotizaciones})`,
            itemStyle: { color: "#005aa7" },
          },
          {
            value: gestionesActivas || ventasDesdeCotizacion.length,
            name: `Gestiones (${ventasDesdeCotizacion.length})`,
            itemStyle: { color: "#de5b14" },
          },
          {
            value: cierres,
            name: `Cierres (${cierres})`,
            itemStyle: { color: "#0d9488" },
          },
        ],
      },
    ],
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <h3 className="mb-2 flex items-center gap-2 text-lg font-bold text-slate-800">
        <Filter className="text-primary" size={20} />
        Embudo de Conversión
      </h3>
      <ReactECharts option={option} style={{ height: "260px" }} />
      <div className="mt-2 flex justify-center gap-6 text-xs text-slate-500">
        <span>
          Cotiz. → Venta: <strong className="text-slate-700">{cotToVenta}%</strong>
        </span>
        <span>
          Venta → Cierre: <strong className="text-slate-700">{ventaACierre}%</strong>
        </span>
      </div>
    </div>
  );
};

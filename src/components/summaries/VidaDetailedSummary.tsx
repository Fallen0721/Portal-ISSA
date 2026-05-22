import React, { useMemo } from "react";
import { VentaVida, VentaVidaStatus } from "../../types/models";
import { clsx } from "clsx";
import { formatCurrency } from "../../utils/format";
import { EmptyState } from "../dashboard/EmptyState";
import { FileText } from "lucide-react";

interface VidaDetailedSummaryProps {
  data: VentaVida[];
}

export const VidaDetailedSummary: React.FC<VidaDetailedSummaryProps> = ({ data }) => {
  const calculateTotals = (items: VentaVida[]) => ({
    countL: items.filter((i) => i.moneda === "L").length,
    amountL: items.filter((i) => i.moneda === "L").reduce((acc, i) => acc + i.primaPlaneada, 0),
    countD: items.filter((i) => i.moneda === "$").length,
    amountD: items.filter((i) => i.moneda === "$").reduce((acc, i) => acc + i.primaPlaneada, 0),
  });

  const statusData = useMemo(() => {
    const statuses = Array.from(new Set(data.map((d) => d.status))).sort();
    return statuses.map((status) => ({
      label: status,
      ...calculateTotals(data.filter((d) => d.status === status)),
    }));
  }, [data]);

  const nuevoData = useMemo(
    () => data.filter((d) => d.status === VentaVidaStatus.NUEVA),
    [data],
  );

  const companiaData = useMemo(() => {
    const companies = Array.from(new Set(nuevoData.map((d) => d.compania)));
    return companies.map((company) => ({
      label: company,
      ...calculateTotals(nuevoData.filter((d) => d.compania === company)),
    }));
  }, [nuevoData]);

  const canalData = useMemo(() => {
    const canales = Array.from(new Set(nuevoData.map((d) => d.canal)));
    return canales.map((canal) => ({
      label: canal,
      ...calculateTotals(nuevoData.filter((d) => d.canal === canal)),
    }));
  }, [nuevoData]);

  const TableContainer = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
          {title}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">{children}</table>
      </div>
    </div>
  );

  const TableHeader = () => (
    <thead>
      <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
        <th className="px-6 py-3 text-left w-1/3">Concepto</th>
        <th className="px-4 py-3 text-center w-24">No. Pólizas (L)</th>
        <th className="px-4 py-3 text-right">Prima Planeada (L)</th>
        <th className="px-4 py-3 text-center w-24">No. Pólizas ($)</th>
        <th className="px-4 py-3 text-right">Prima Planeada ($)</th>
      </tr>
    </thead>
  );

  const TableRow = ({
    label,
    stats,
    isTotal = false,
  }: {
    label: string;
    stats: ReturnType<typeof calculateTotals>;
    isTotal?: boolean;
  }) => (
    <tr
      className={clsx(
        "text-sm transition-colors border-b border-slate-50 last:border-none",
        isTotal
          ? "bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-100"
          : "hover:bg-slate-50/80 text-slate-600",
      )}
    >
      <td className="px-6 py-3">{label}</td>
      <td className="px-4 py-3 text-center font-mono text-slate-500">{stats.countL}</td>
      <td className="px-4 py-3 text-right font-mono text-slate-700">
        {formatCurrency(stats.amountL, "L")}
      </td>
      <td className="px-4 py-3 text-center font-mono text-slate-500">{stats.countD}</td>
      <td className="px-4 py-3 text-right font-mono text-slate-700">
        {formatCurrency(stats.amountD, "$")}
      </td>
    </tr>
  );

  const totalStats = calculateTotals(data);
  const totalNuevo = calculateTotals(nuevoData);

  if (data.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Sin datos detallados"
        subtitle="No se encontraron registros para los filtros seleccionados."
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 delay-100">
      <TableContainer title="Producción por Estatus">
        <TableHeader />
        <tbody>
          {statusData.map((row) => (
            <TableRow key={row.label} label={row.label} stats={row} />
          ))}
          <TableRow label="GRAN TOTAL" stats={totalStats} isTotal />
        </tbody>
      </TableContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <TableContainer title="Producción Nueva por Compañía">
          <TableHeader />
          <tbody>
            {companiaData.map((row) => (
              <TableRow key={row.label} label={row.label} stats={row} />
            ))}
            <TableRow label="GRAN TOTAL" stats={totalNuevo} isTotal />
          </tbody>
        </TableContainer>

        <TableContainer title="Producción Nueva por Canal">
          <TableHeader />
          <tbody>
            {canalData.map((row) => (
              <TableRow key={row.label} label={row.label} stats={row} />
            ))}
            <TableRow label="GRAN TOTAL" stats={totalNuevo} isTotal />
          </tbody>
        </TableContainer>
      </div>
    </div>
  );
};

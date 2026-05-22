import React, { useMemo } from "react";
import { Venta, Canal, VentaStatus } from "../../types/models";
import { clsx } from "clsx";
import { formatCurrency } from "../../utils/format";
import { EmptyState } from "../dashboard/EmptyState";
import { FileText } from "lucide-react";

interface DetailedSummaryProps {
  data: Venta[];
}

export const DetailedSummary: React.FC<DetailedSummaryProps> = ({ data }) => {
  // Helper to calculate totals
  const calculateTotals = (items: Venta[]) => {
    return {
      countL: items.filter((i) => i.moneda === "L").length,
      amountL: items
        .filter((i) => i.moneda === "L")
        .reduce((acc, curr) => acc + curr.primaNetaAnual, 0),
      countD: items.filter((i) => i.moneda === "$").length,
      amountD: items
        .filter((i) => i.moneda === "$")
        .reduce((acc, curr) => acc + curr.primaNetaAnual, 0),
    };
  };

  // 1. Status Summary
  const statusData = useMemo(() => {
    const statuses = Array.from(
      new Set(data.map((item) => item.status)),
    ).sort();
    return statuses.map((status) => {
      const items = data.filter((d) => d.status === status);
      return {
        label: status,
        ...calculateTotals(items),
      };
    });
  }, [data]);

  // 2. Production by Company
  const companyData = useMemo(() => {
    const companies = Array.from(new Set(data.map((d) => d.compania)));
    return companies.map((company) => {
      const items = data.filter((d) => d.compania === company);
      const totals = calculateTotals(items);
      return {
        label: company,
        ...totals,
      };
    });
  }, [data]);

  // 3. Production by Channel — solo status "Nuevo"
  const nuevoData = useMemo(
    () => data.filter((d) => d.status === VentaStatus.NUEVO),
    [data],
  );

  const channelData = useMemo(() => {
    const channels = Object.values(Canal);
    return channels.map((canal) => {
      const items = nuevoData.filter((d) => d.canal === canal);
      return {
        label: canal.replace(/_/g, " "),
        ...calculateTotals(items),
      };
    });
  }, [nuevoData]);

  // 4. Production by Product — solo status "Nuevo"
  const productData = useMemo(() => {
    const products = Array.from(new Set(nuevoData.map((d) => d.producto)));
    return products.map((producto) => {
      const items = nuevoData.filter((d) => d.producto === producto);
      return {
        label: producto,
        ...calculateTotals(items),
      };
    });
  }, [nuevoData]);

  // Modern Table Components
  const TableContainer = ({
    title,
    children,
    className,
  }: {
    title: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <div
      className={clsx(
        "bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col",
        className,
      )}
    >
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
        <th className="px-4 py-3 text-right">Prima Neta (L)</th>
        <th className="px-4 py-3 text-center w-24">No. Pólizas ($)</th>
        <th className="px-4 py-3 text-right">Prima Neta ($)</th>
      </tr>
    </thead>
  );

  const TableRow = ({
    label,
    stats,
    isTotal = false,
  }: {
    label: string;
    stats: any;
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
      <td className="px-4 py-3 text-center font-mono text-slate-500">
        {stats.countL}
      </td>
      <td className="px-4 py-3 text-right font-mono text-slate-700">
        {formatCurrency(stats.amountL, "L")}
      </td>
      <td className="px-4 py-3 text-center font-mono text-slate-500">
        {stats.countD}
      </td>
      <td className="px-4 py-3 text-right font-mono text-slate-700">
        {formatCurrency(stats.amountD, "$")}
      </td>
    </tr>
  );

  const totalStats = calculateTotals(data);

  if (data.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Sin datos detallados"
        subtitle="No se encontraron ventas para los filtros seleccionados."
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 delay-100">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status Table */}
        <TableContainer title="Producción por Estatus">
          <TableHeader />
          <tbody>
            {statusData.map((row) => (
              <TableRow key={row.label} label={row.label} stats={row} />
            ))}
            <TableRow label="GRAN TOTAL" stats={totalStats} isTotal />
          </tbody>
        </TableContainer>

        {/* Channel Table (New) */}
        <TableContainer title="Producción Nueva por Canal">
          <TableHeader />
          <tbody>
            {channelData.map((row) => (
              <TableRow key={row.label} label={row.label} stats={row} />
            ))}
            <TableRow
              label="GRAN TOTAL"
              stats={calculateTotals(nuevoData)}
              isTotal
            />
          </tbody>
        </TableContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Company Table */}
        <TableContainer title="Cotizado por Compañía">
          <TableHeader />
          <tbody>
            {companyData.map((row) => (
              <TableRow key={row.label} label={row.label} stats={row} />
            ))}
            <TableRow label="GRAN TOTAL" stats={totalStats} isTotal />
          </tbody>
        </TableContainer>

        {/* Product Table */}
        <TableContainer title="Producción Nueva por Producto">
          <TableHeader />
          <tbody>
            {productData.map((row) => (
              <TableRow key={row.label} label={row.label} stats={row} />
            ))}
            <TableRow
              label="GRAN TOTAL"
              stats={calculateTotals(nuevoData)}
              isTotal
            />
          </tbody>
        </TableContainer>
      </div>
    </div>
  );
};

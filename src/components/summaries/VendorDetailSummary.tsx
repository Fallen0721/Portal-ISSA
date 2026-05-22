import { useMemo } from "react";
import { Users } from "lucide-react";
import { Venta } from "../../types/models";
import { formatCurrency } from "../../utils/format";

interface VendorDetailSummaryProps {
  data: Venta[];
}

export const VendorDetailSummary = ({ data }: VendorDetailSummaryProps) => {
  const rows = useMemo(() => {
    const vendorMap = new Map<string, Venta[]>();
    for (const venta of data) {
      const key = venta.vendedor || "Sin vendedor";
      if (!vendorMap.has(key)) vendorMap.set(key, []);
      vendorMap.get(key)!.push(venta);
    }

    return Array.from(vendorMap.entries())
      .map(([vendedor, ventas]) => {
        const ventasL = ventas.filter((v) => v.moneda === "L");
        const ventasD = ventas.filter((v) => v.moneda === "$");
        return {
          vendedor,
          totalVentas: ventas.length,
          polizasL: ventasL.length,
          primaL: ventasL.reduce((s, v) => s + v.primaNetaAnual, 0),
          polizasD: ventasD.length,
          primaD: ventasD.reduce((s, v) => s + v.primaNetaAnual, 0),
        };
      })
      .sort((a, b) => b.totalVentas - a.totalVentas);
  }, [data]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          totalVentas: acc.totalVentas + r.totalVentas,
          polizasL: acc.polizasL + r.polizasL,
          primaL: acc.primaL + r.primaL,
          polizasD: acc.polizasD + r.polizasD,
          primaD: acc.primaD + r.primaD,
        }),
        { totalVentas: 0, polizasL: 0, primaL: 0, polizasD: 0, primaD: 0 },
      ),
    [rows],
  );

  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
        <Users size={18} className="text-primary" />
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
          Resumen Detallado por Vendedor
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
              <th className="px-6 py-3 text-left">Vendedor</th>
              <th className="px-4 py-3 text-center">Total Pólizas</th>
              <th className="px-4 py-3 text-center">Pólizas (L)</th>
              <th className="px-4 py-3 text-right">Prima Neta (L)</th>
              <th className="px-4 py-3 text-center">Pólizas ($)</th>
              <th className="px-4 py-3 text-right">Prima Neta ($)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((row) => (
              <tr
                key={row.vendedor}
                className="hover:bg-slate-50/80 transition-colors text-slate-600"
              >
                <td className="px-6 py-3 font-medium text-slate-800">
                  {row.vendedor}
                </td>
                <td className="px-4 py-3 text-center font-mono text-slate-500">
                  {row.totalVentas}
                </td>
                <td className="px-4 py-3 text-center font-mono text-slate-500">
                  {row.polizasL}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-700">
                  {formatCurrency(row.primaL, "L")}
                </td>
                <td className="px-4 py-3 text-center font-mono text-slate-500">
                  {row.polizasD}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-700">
                  {formatCurrency(row.primaD, "$")}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
              <td className="px-6 py-3">Gran Total</td>
              <td className="px-4 py-3 text-center font-mono">
                {totals.totalVentas}
              </td>
              <td className="px-4 py-3 text-center font-mono">
                {totals.polizasL}
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {formatCurrency(totals.primaL, "L")}
              </td>
              <td className="px-4 py-3 text-center font-mono">
                {totals.polizasD}
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {formatCurrency(totals.primaD, "$")}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

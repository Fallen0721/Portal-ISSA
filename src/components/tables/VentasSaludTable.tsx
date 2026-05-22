import { useEffect, useMemo, useState } from "react";
import { VentaSalud, VentaVidaStatus } from "../../types/models";
import { DataTable, Column } from "./DataTable";
import { formatDate } from "../../utils/dates";
import { differenceInDays, parseISO, startOfDay } from "date-fns";
import { formatCurrency } from "../../utils/format";
import { RowActions } from "./RowActions";
import { clsx } from "clsx";

interface VentasSaludTableProps {
  data: VentaSalud[];
  isLoading?: boolean;
  onEdit?: (item: VentaSalud) => void;
  onDelete?: (id: string) => void;
}

const calcDias = (item: VentaSalud): number => {
  const start = startOfDay(parseISO(item.fechaIngreso.slice(0, 10)));
  const end = startOfDay(new Date());
  return Math.max(0, differenceInDays(end, start));
};

const statusColors: Record<string, string> = {
  [VentaVidaStatus.INGRESADA]: "bg-blue-100 text-blue-800",
  [VentaVidaStatus.APROBADA]: "bg-emerald-100 text-emerald-800",
  [VentaVidaStatus.NUEVA]: "bg-amber-100 text-amber-900",
  [VentaVidaStatus.TCC]: "bg-rose-100 text-rose-800",
  [VentaVidaStatus.NT]: "bg-rose-100 text-rose-800",
  [VentaVidaStatus.ASIGNACION]: "bg-violet-100 text-violet-800",
};

export const VentasSaludTable = ({
  data,
  isLoading,
  onEdit,
  onDelete,
}: VentasSaludTableProps) => {
  const pageSize = 10;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [data.length]);

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageData = useMemo(
    () => data.slice(startIndex, startIndex + pageSize),
    [data, startIndex],
  );

  const startItem = totalItems === 0 ? 0 : startIndex + 1;
  const endItem = Math.min(startIndex + pageSize, totalItems);
  const showPagination = totalItems > pageSize && !isLoading;

  const columns: Column<VentaSalud>[] = [
    {
      header: "Fecha",
      cell: (item) => {
        const dias = calcDias(item);
        return (
          <div className="space-y-0.5 text-sm">
            <div className="font-medium text-slate-900">
              {formatDate(item.fechaIngreso)}
            </div>
            {item.fechaVigencia ? (
              <div className="text-xs text-emerald-600 font-medium">
                Vigencia: {formatDate(item.fechaVigencia)}
              </div>
            ) : (
              <div className="text-[11px] text-slate-400">Sin vigencia</div>
            )}
            <div className="text-[11px] text-slate-400">
              {dias} {dias === 1 ? "día" : "días"}
            </div>
          </div>
        );
      },
    },
    {
      header: "Creado por",
      cell: (item) => (
        <div>
          <div className="font-medium text-slate-800">{item.creadoPor}</div>
          {item.agente && (
            <div className="text-xs text-slate-500">Agente: {item.agente}</div>
          )}
          {item.alianza && (
            <div className="text-xs text-slate-500">Alianza: {item.alianza}</div>
          )}
          {item.oficialNegocios && (
            <div className="text-xs text-slate-500">{item.oficialNegocios}</div>
          )}
        </div>
      ),
    },
    {
      header: "Asegurado",
      cell: (item) => (
        <div>
          <div className="font-medium text-slate-800">{item.asegurado}</div>
          <div className="text-xs text-slate-500">
            {item.producto}
            {item.ramo ? ` · ${item.ramo}` : ""}
          </div>
        </div>
      ),
    },
    { header: "Compañía", accessorKey: "compania" },
    {
      header: "Prima Planeada",
      className: "text-right",
      cell: (item) => (
        <div className="text-right">
          <div className="font-medium text-slate-900">
            {formatCurrency(item.primaPlaneada, item.moneda)}
          </div>
          <div className="text-[11px] text-slate-500">
            {formatCurrency(item.sumaAsegurada, item.moneda)}
          </div>
        </div>
      ),
    },
    {
      header: "Canal",
      cell: (item) => (
        <span className="text-sm text-slate-700">{item.canal}</span>
      ),
    },
    {
      header: "Status",
      cell: (item) => (
        <span
          className={clsx(
            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
            statusColors[item.status] ?? "bg-slate-100 text-slate-700",
          )}
        >
          {item.status}
        </span>
      ),
    },
  ];

  if (onEdit || onDelete) {
    columns.push({
      header: "Acciones",
      className: "text-right",
      cell: (item) => (
        <RowActions
          onEdit={onEdit ? () => onEdit(item) : undefined}
          onDelete={onDelete ? () => onDelete(item.id) : undefined}
        />
      ),
    });
  }

  const footer = showPagination ? (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs text-slate-500">
        Mostrando {startItem}-{endItem} de {totalItems}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className={clsx(
            "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
            currentPage === 1
              ? "cursor-not-allowed border-slate-200 text-slate-300"
              : "border-slate-200 text-slate-600 hover:bg-slate-50",
          )}
        >
          Anterior
        </button>
        <span className="text-xs text-slate-500">
          Página {currentPage} de {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          className={clsx(
            "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
            currentPage === totalPages
              ? "cursor-not-allowed border-slate-200 text-slate-300"
              : "border-slate-200 text-slate-600 hover:bg-slate-50",
          )}
        >
          Siguiente
        </button>
      </div>
    </div>
  ) : null;

  return (
    <DataTable
      data={pageData}
      columns={columns}
      isLoading={isLoading}
      footer={footer}
    />
  );
};

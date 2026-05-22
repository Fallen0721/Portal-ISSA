import { useEffect, useMemo, useState } from "react";
import { Venta, VENTA_STATUS_GROUP_BY_STATUS, VentaStatus } from "../../types/models";
import { DataTable, Column } from "./DataTable";
import { formatDate } from "../../utils/dates";
import { differenceInDays, parseISO } from "date-fns";
import { formatCurrency } from "../../utils/format";
import { RowActions } from "./RowActions";
import { clsx } from "clsx";
import { ClipboardList } from "lucide-react";

interface VentasTableProps {
  data: Venta[];
  isLoading?: boolean;
  onEdit?: (venta: Venta) => void;
  onDelete?: (id: string) => void;
  onDetail?: (venta: Venta) => void;
}

const calcDiasProceso = (venta: Venta): number => {
  const end = venta.fechaCierre ? parseISO(venta.fechaCierre) : new Date();
  return Math.max(0, differenceInDays(end, parseISO(venta.fechaIngreso)));
};

const statusColors: Record<string, string> = {
  [VentaStatus.PRIMER_CONTACTO_REALIZADO]: "bg-yellow-100 text-yellow-800",
  [VentaStatus.NO_CONTACTADO]: "bg-yellow-100 text-yellow-800",
  [VentaStatus.NO_INTERESADO]: "bg-rose-100 text-rose-800",
  [VentaStatus.CITA_PROGRAMADA]: "bg-blue-100 text-blue-800",
  [VentaStatus.COTIZACION_ENVIADA]: "bg-blue-100 text-blue-800",
  [VentaStatus.SEGUIMIENTO_COTIZACION]: "bg-blue-100 text-blue-800",
  [VentaStatus.AJUSTES_COTIZACION]: "bg-blue-100 text-blue-800",
  [VentaStatus.INTERESADO_PENDIENTE_DECISION]: "bg-violet-100 text-violet-800",
  [VentaStatus.NO_TOMADO_POR_CLIENTE]: "bg-rose-100 text-rose-800",
  [VentaStatus.SOLICITUD_EN_LLENADO]: "bg-emerald-100 text-emerald-800",
  [VentaStatus.DOCUMENTOS_PENDIENTES]: "bg-emerald-100 text-emerald-800",
  [VentaStatus.EN_REVISION_INTERNA]: "bg-emerald-100 text-emerald-800",
  [VentaStatus.INGRESADO_A_COMPANIA]: "bg-emerald-100 text-emerald-800",
  [VentaStatus.REQUERIMIENTOS_ADICIONALES]: "bg-orange-100 text-orange-800",
  [VentaStatus.APROBADO_POR_COMPANIA]: "bg-orange-100 text-orange-800",
  [VentaStatus.PAGO_PENDIENTE]: "bg-orange-100 text-orange-800",
  [VentaStatus.POLIZA_EMITIDA]: "bg-amber-100 text-amber-900",
  [VentaStatus.POLIZA_ENTREGADA]: "bg-amber-100 text-amber-900",
  [VentaStatus.NUEVO]: "bg-amber-100 text-amber-900",
  [VentaStatus.TRAMITE_CANCELADO_POR_COMPANIA]: "bg-rose-100 text-rose-800",
};

export const VentasTable = ({
  data,
  isLoading,
  onEdit,
  onDelete,
  onDetail,
}: VentasTableProps) => {
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

  const columns: Column<Venta>[] = [
    {
      header: "Fecha",
      cell: (venta) => {
        const dias = calcDiasProceso(venta);
        return (
          <div className="space-y-0.5 text-sm">
            <div className="font-medium text-slate-900">
              {formatDate(venta.fechaIngreso)}
            </div>
            {venta.fechaCierre ? (
              <div className="text-xs text-emerald-600 font-medium">
                Cierre: {formatDate(venta.fechaCierre)}
              </div>
            ) : (
              <div className="text-[11px] text-slate-400">Sin cierre</div>
            )}
            <div className="text-[11px] text-slate-400">
              {dias} {dias === 1 ? "día" : "días"} en proceso
            </div>
          </div>
        );
      },
    },
    {
      header: "Vendedor",
      cell: (venta) => venta.vendedor || "—",
    },
    {
      header: "Asegurado",
      cell: (venta) => (
        <div>
          <div className="font-medium text-slate-800">{venta.asegurado}</div>
          <div className="text-xs text-slate-500">{venta.producto}</div>
        </div>
      ),
    },
    { header: "Compañía", accessorKey: "compania" },
    {
      header: "Prima Neta",
      className: "text-right",
      cell: (venta) => (
        <div className="text-right">
          <div className="font-medium text-slate-900">
            {formatCurrency(venta.primaNetaAnual, venta.moneda)}
          </div>
          <div className="text-[11px] text-slate-500">
            {formatCurrency(venta.sumaAsegurada, venta.moneda)}
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (venta) => (
        <div className="space-y-1">
          <span
            className={clsx(
              "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
              statusColors[venta.status] ?? "bg-slate-100 text-slate-700",
            )}
          >
            {venta.status}
          </span>
          <div className="text-[11px] text-slate-500">
            {VENTA_STATUS_GROUP_BY_STATUS[venta.status]?.label ?? "Sin etapa"}
          </div>
        </div>
      ),
    },
  ];

  if (onEdit || onDelete || onDetail) {
    columns.push({
      header: "Acciones",
      className: "text-right",
      cell: (venta) => (
        <div className="flex items-center justify-end gap-1">
          {onDetail && (
            <button
              onClick={() => onDetail(venta)}
              title="Ver actividad"
              className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary"
            >
              <ClipboardList size={15} />
            </button>
          )}
          <RowActions
            onEdit={onEdit ? () => onEdit(venta) : undefined}
            onDelete={onDelete ? () => onDelete(venta.id) : undefined}
          />
        </div>
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

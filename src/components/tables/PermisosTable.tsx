import { PermisoLaboral, PermisoStatus } from "../../types/models";
import { DataTable, Column } from "./DataTable";
import { formatDate } from "../../utils/dates";
import { RowActions } from "./RowActions";

interface PermisosTableProps {
  data: PermisoLaboral[];
  isLoading?: boolean;
  onEdit?: (permiso: PermisoLaboral) => void;
  onDelete?: (id: string) => void;
}

export const PermisosTable = ({
  data,
  isLoading,
  onEdit,
  onDelete,
}: PermisosTableProps) => {
  const columns: Column<PermisoLaboral>[] = [
    {
      header: "Empleado",
      cell: (permiso) => (
        <div>
          <div className="font-medium text-slate-900">{permiso.empleado}</div>
          <div className="text-xs text-slate-500">{permiso.departamento}</div>
        </div>
      ),
    },
    { header: "Tipo", accessorKey: "tipo" },
    {
      header: "Fechas",
      cell: (permiso) => (
        <div className="text-sm">
          <span className="text-slate-900">
            {formatDate(permiso.fechaInicio, "dd MMM")}
          </span>
          <span className="mx-1 text-slate-400">→</span>
          <span className="text-slate-900">
            {formatDate(permiso.fechaFin, "dd MMM")}
          </span>
        </div>
      ),
    },
    {
      header: "Días",
      className: "text-center",
      cell: (permiso) => (
        <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
          {permiso.dias}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (permiso) => (
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            permiso.status === PermisoStatus.APROBADO
              ? "bg-green-100 text-green-700"
              : permiso.status === PermisoStatus.RECHAZADO
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {permiso.status}
        </span>
      ),
    },
  ];

  if (onEdit || onDelete) {
    columns.push({
      header: "Acciones",
      className: "text-right",
      cell: (permiso) => (
        <RowActions
          onEdit={onEdit ? () => onEdit(permiso) : undefined}
          onDelete={onDelete ? () => onDelete(permiso.id) : undefined}
        />
      ),
    });
  }

  return <DataTable data={data} columns={columns} isLoading={isLoading} />;
};

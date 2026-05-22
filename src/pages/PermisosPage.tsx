import { useEffect, useState } from "react";
import { PermisosService } from "../services/permisos.service";
import {
  PermisoLaboral,
  PermisoMutationInput,
  PermisoStatus,
} from "../types/models";
import { PermisosTable } from "../components/tables/PermisosTable";
import { TableToolbar } from "../components/tables/TableToolbar";
import { PermisoFormDrawer } from "../components/forms/PermisoFormDrawer";
import { ConfirmDialog } from "../components/forms/ConfirmDialog";
import { SelectField } from "../components/forms/FormFields";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../hooks/useAuth";

export const PermisosPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [data, setData] = useState<PermisoLaboral[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<PermisoStatus | "">("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PermisoLaboral | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await PermisosService.getAll({
        status: filterStatus || undefined,
      });
      setData(result);
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las solicitudes",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [filterStatus]);

  const handleCreate = async (item: PermisoMutationInput) => {
    try {
      await PermisosService.create(item);
      await loadData();
      toast("Solicitud creada", "success");
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "No se pudo crear la solicitud",
        "error",
      );
    }
  };

  const handleUpdate = async (item: PermisoMutationInput) => {
    if (!editingItem) return;

    try {
      await PermisosService.update(editingItem.id, item);
      await loadData();
      toast("Solicitud actualizada", "success");
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la solicitud",
        "error",
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await PermisosService.remove(deleteId);
      await loadData();
      setDeleteId(null);
      toast("Solicitud eliminada", "success");
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la solicitud",
        "error",
      );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-slate-800">
          {isAdmin ? "Solicitudes de Permisos y Vacaciones" : "Mis Solicitudes"}
        </h2>
      </div>

      <div className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:w-64">
        <SelectField
          label="Filtrar por Status"
          value={filterStatus}
          onChange={(event) =>
            setFilterStatus(event.target.value as PermisoStatus)
          }
          options={Object.values(PermisoStatus).map((status) => ({
            value: status,
            label: status,
          }))}
        />
      </div>

      <TableToolbar
        title={`Solicitudes (${data.length})`}
        onCreated={() => {
          setEditingItem(undefined);
          setIsDrawerOpen(true);
        }}
        actionLabel="Nueva Solicitud"
      />

      <PermisosTable
        data={data}
        isLoading={loading}
        onEdit={(item) => {
          setEditingItem(item);
          setIsDrawerOpen(true);
        }}
        onDelete={(id) => setDeleteId(id)}
      />

      <PermisoFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={editingItem ? handleUpdate : handleCreate}
        initialData={editingItem}
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Cancelar Solicitud"
        message="¿Estás seguro de eliminar esta solicitud?"
        isDestructive
      />
    </div>
  );
};

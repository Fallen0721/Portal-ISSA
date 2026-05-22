import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { StatusFormDrawer } from "../forms/StatusFormDrawer";
import { useToast } from "../../hooks/useToast";
import { StatusGestion } from "../../types/models";
import { StatusesService } from "../../services/statuses.service";

export const StatusSection = () => {
  const { toast } = useToast();
  const [statuses, setStatuses] = useState<StatusGestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<StatusGestion | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      setStatuses(await StatusesService.getAll());
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "No se pudieron cargar los status",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const grouped = useMemo(
    () => ({
      prospecto: statuses.filter((status) => status.tipo === "prospecto"),
      venta: statuses.filter((status) => status.tipo === "venta"),
    }),
    [statuses],
  );

  const handleCreate = async (input: { tipo: "prospecto" | "venta"; nombre: string }) => {
    try {
      await StatusesService.create(input);
      await loadData();
      toast("Status creado", "success");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "No se pudo crear el status",
        "error",
      );
      throw error;
    }
  };

  const handleUpdate = async (input: { tipo: "prospecto" | "venta"; nombre: string }) => {
    if (!editingStatus) return;
    try {
      await StatusesService.update(editingStatus.id, input);
      await loadData();
      toast("Status actualizado", "success");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "No se pudo actualizar el status",
        "error",
      );
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await StatusesService.remove(id);
      setStatuses((prev) => prev.filter((s) => s.id !== id));
      toast("Status eliminado", "success");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "No se pudo eliminar el status",
        "error",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (status: StatusGestion) => {
    setEditingStatus(status);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingStatus(undefined);
  };

  const renderBlock = (
    title: string,
    subtitle: string,
    data: StatusGestion[],
    badgeClassName: string,
  ) => (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            {title}
          </h3>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClassName}`}
        >
          {data.length} status
        </span>
      </div>

      {data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
          No hay status creados para esta categoría.
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((status) => (
            <div
              key={status.id}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
            >
              <span className="font-medium text-slate-800">{status.nombre}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  {new Date(status.createdAt).toLocaleDateString("es-HN")}
                </span>
                <button
                  type="button"
                  onClick={() => openEdit(status)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                  title="Editar"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(status.id)}
                  disabled={deletingId === status.id}
                  className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Status</h2>
          <p className="mt-1 text-sm text-slate-500">
            Configura los status que se usarán en Nueva Gestión.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-lg shadow-primary/30 hover:bg-primary-dark"
        >
          <Plus size={16} />
          Nuevo Status
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-slate-400">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {renderBlock(
            "Status Prospecto",
            "Estados para etapas de prospección y gestión comercial.",
            grouped.prospecto,
            "bg-yellow-100 text-yellow-800",
          )}
          {renderBlock(
            "Status Venta",
            "Estados para emisión, aseguradora y cierre.",
            grouped.venta,
            "bg-emerald-100 text-emerald-800",
          )}
        </div>
      )}

      <StatusFormDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        onSubmit={editingStatus ? handleUpdate : handleCreate}
        initialData={editingStatus}
      />
    </div>
  );
};

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { StatusFormDrawer } from "../forms/StatusFormDrawer";
import { useToast } from "../../hooks/useToast";
import { StatusArea, StatusGestion, StatusGestionInput } from "../../types/models";
import { StatusesService } from "../../services/statuses.service";

const AREA_TABS: { value: StatusArea; label: string }[] = [
  { value: "comercial", label: "Comercial" },
  { value: "personas", label: "Personas (Vida / Salud)" },
  { value: "danos", label: "Daños (Riesgos Generales)" },
];

export const StatusSection = () => {
  const { toast } = useToast();
  const [area, setArea] = useState<StatusArea>("comercial");
  const [statuses, setStatuses] = useState<StatusGestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<StatusGestion | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async (targetArea: StatusArea) => {
    setLoading(true);
    try {
      setStatuses(await StatusesService.getAll(targetArea));
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
    void loadData(area);
  }, [area]);

  const isComercial = area === "comercial";

  // Comercial agrupa por tipo (prospecto/venta); las demás áreas, por etapa.
  const grouped = useMemo(() => {
    const map = new Map<string, StatusGestion[]>();
    if (isComercial) {
      map.set("Status Prospecto", statuses.filter((s) => s.tipo === "prospecto"));
      map.set("Status Venta", statuses.filter((s) => s.tipo === "venta"));
      return map;
    }
    for (const s of statuses) {
      const key = s.etapa || "Sin etapa";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [statuses, isComercial]);

  const etapaSuggestions = useMemo(
    () =>
      Array.from(
        new Set(statuses.map((s) => s.etapa).filter((e): e is string => Boolean(e))),
      ),
    [statuses],
  );

  const handleCreate = async (input: StatusGestionInput) => {
    try {
      await StatusesService.create(input);
      await loadData(area);
      toast("Status creado", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "No se pudo crear el status", "error");
      throw error;
    }
  };

  const handleUpdate = async (input: StatusGestionInput) => {
    if (!editingStatus) return;
    try {
      await StatusesService.update(editingStatus.id, input);
      await loadData(area);
      toast("Status actualizado", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "No se pudo actualizar el status", "error");
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
      toast(error instanceof Error ? error.message : "No se pudo eliminar el status", "error");
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

  const renderBlock = (title: string, data: StatusGestion[]) => (
    <section key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">{title}</h3>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
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
              <span className="flex items-center gap-2 font-medium text-slate-800">
                {status.nombre}
                {status.esCierre && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                    cierre
                  </span>
                )}
              </span>
              <div className="flex items-center gap-3">
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
            Configura los status que se usarán en Nueva Gestión, por área y etapa.
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

      <div className="flex flex-wrap gap-2">
        {AREA_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setArea(tab.value)}
            className={clsx(
              "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
              area === tab.value
                ? "border-primary bg-primary/5 text-primary"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-slate-400">Cargando...</div>
      ) : (
        <div
          className={clsx(
            "grid grid-cols-1 gap-6",
            isComercial ? "xl:grid-cols-2" : "xl:grid-cols-2",
          )}
        >
          {Array.from(grouped.entries()).map(([title, data]) => renderBlock(title, data))}
        </div>
      )}

      <StatusFormDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        onSubmit={editingStatus ? handleUpdate : handleCreate}
        initialData={editingStatus}
        area={area}
        etapaSuggestions={etapaSuggestions}
      />
    </div>
  );
};

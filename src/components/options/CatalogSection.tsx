import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { CatalogItemFormDrawer } from "../forms/CatalogItemFormDrawer";
import { useToast } from "../../hooks/useToast";
import { CatalogItem } from "../../types/models";

interface AreaOption {
  value: string;
  label: string;
}

interface CatalogService {
  getAll(): Promise<CatalogItem[]>;
  create(nombre: string, extra?: Record<string, string>): Promise<CatalogItem>;
  update(id: string, nombre: string, extra?: Record<string, string>): Promise<CatalogItem>;
  remove(id: string): Promise<void>;
}

interface CatalogSectionProps {
  title: string;
  description: string;
  entityLabel: string;
  service: CatalogService;
  badgeClassName?: string;
  areaOptions?: AreaOption[];
  areaLabels?: Record<string, string>;
}

const AREA_BADGE: Record<string, string> = {
  comercial: "bg-blue-100 text-blue-800",
  vida: "bg-emerald-100 text-emerald-800",
  salud: "bg-rose-100 text-rose-800",
  "daños": "bg-amber-100 text-amber-800",
};

export const CatalogSection = ({
  title,
  description,
  entityLabel,
  service,
  badgeClassName = "bg-slate-100 text-slate-700",
  areaOptions,
  areaLabels,
}: CatalogSectionProps) => {
  const { toast } = useToast();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      setItems(await service.getAll());
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "No se pudieron cargar los datos",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [service]);

  const handleCreate = async (nombre: string, area?: string) => {
    try {
      await service.create(nombre, area ? { area } : undefined);
      await loadData();
      toast(`${entityLabel} creado`, "success");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : `No se pudo crear el ${entityLabel.toLowerCase()}`,
        "error",
      );
      throw error;
    }
  };

  const handleUpdate = async (nombre: string, area?: string) => {
    if (!editing) return;
    try {
      await service.update(editing.id, nombre, area ? { area } : undefined);
      await loadData();
      toast(`${entityLabel} actualizado`, "success");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : `No se pudo actualizar el ${entityLabel.toLowerCase()}`,
        "error",
      );
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await service.remove(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast(`${entityLabel} eliminado`, "success");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : `No se pudo eliminar el ${entityLabel.toLowerCase()}`,
        "error",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (item: CatalogItem) => {
    setEditing(item);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditing(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-lg shadow-primary/30 hover:bg-primary-dark"
        >
          <Plus size={16} />
          {`Nuevo ${entityLabel}`}
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-slate-400">Cargando...</div>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              {title}
            </h3>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClassName}`}>
              {items.length} {items.length === 1 ? "elemento" : "elementos"}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
              No hay elementos creados.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-slate-800">{item.nombre}</span>
                    {item.area && areaOptions && (
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${AREA_BADGE[item.area] ?? "bg-slate-100 text-slate-600"}`}>
                        {areaLabels?.[item.area] ?? item.area}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString("es-HN")}
                    </span>
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item.id)}
                      disabled={deletingId === item.id}
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
      )}

      <CatalogItemFormDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        onSubmit={editing ? handleUpdate : handleCreate}
        initialData={editing}
        entityLabel={entityLabel}
        areaOptions={areaOptions}
      />
    </div>
  );
};

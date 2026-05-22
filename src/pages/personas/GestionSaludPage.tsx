import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronDown, Filter, Plus } from "lucide-react";
import { clsx } from "clsx";
import { CurrencyCode, VentaSalud, VentaSaludMutationInput, VentaVidaStatus } from "../../types/models";
import { VentasSaludService } from "../../services/ventasSalud.service";
import { VentasSaludTable } from "../../components/tables/VentasSaludTable";
import { VentaSaludFormDrawer } from "../../components/forms/VentaSaludFormDrawer";
import { ConfirmDialog } from "../../components/forms/ConfirmDialog";
import { useAuth } from "../../hooks/useAuth";

const ALL_STATUSES = Object.values(VentaVidaStatus);

const StatusDropdown = ({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (s: string) =>
    onChange(selected.includes(s) ? selected.filter((x) => x !== s) : [...selected, s]);

  const label = selected.length === 0 ? "Todos los status" : `${selected.length} status`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
          selected.length > 0
            ? "border-primary bg-primary/5 text-primary"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
        )}
      >
        <Filter size={14} />
        <span>{label}</span>
        <ChevronDown size={14} className={clsx("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-xs font-semibold text-slate-500">Filtrar por status</span>
            {selected.length > 0 && (
              <button type="button" onClick={() => onChange([])} className="text-xs text-primary hover:underline">
                Limpiar
              </button>
            )}
          </div>
          <div className="py-1">
            {ALL_STATUSES.map((s) => (
              <label key={s} className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={selected.includes(s)}
                  onChange={() => toggle(s)}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-primary"
                />
                <span className="text-sm text-slate-700">{s}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const getStored = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

export const GestionSaludPage = () => {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const [data, setData] = useState<VentaSalud[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => getStored(`psalud_search_${uid}`, ""));
  const [dateFrom, setDateFrom] = useState(() => getStored(`psalud_dateFrom_${uid}`, ""));
  const [dateTo, setDateTo] = useState(() => getStored(`psalud_dateTo_${uid}`, ""));
  const [statusFilter, setStatusFilter] = useState<string[]>(() => getStored(`psalud_statuses_${uid}`, []));
  const [monedaFilter, setMonedaFilter] = useState<CurrencyCode | "all">(() => getStored(`psalud_moneda_${uid}`, "all"));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<VentaSalud | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await VentasSaludService.getAll();
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!uid) return;
    localStorage.setItem(`psalud_search_${uid}`, JSON.stringify(search));
  }, [search, uid]);

  useEffect(() => {
    if (!uid) return;
    localStorage.setItem(`psalud_dateFrom_${uid}`, JSON.stringify(dateFrom));
  }, [dateFrom, uid]);

  useEffect(() => {
    if (!uid) return;
    localStorage.setItem(`psalud_dateTo_${uid}`, JSON.stringify(dateTo));
  }, [dateTo, uid]);

  useEffect(() => {
    if (!uid) return;
    localStorage.setItem(`psalud_statuses_${uid}`, JSON.stringify(statusFilter));
  }, [statusFilter, uid]);

  useEffect(() => {
    if (!uid) return;
    localStorage.setItem(`psalud_moneda_${uid}`, JSON.stringify(monedaFilter));
  }, [monedaFilter, uid]);

  const filtered = useMemo(() => {
    let result = data;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (v) =>
          v.asegurado.toLowerCase().includes(q) ||
          (v.no ?? "").toLowerCase().includes(q) ||
          v.producto.toLowerCase().includes(q) ||
          v.compania.toLowerCase().includes(q) ||
          (v.agente ?? "").toLowerCase().includes(q),
      );
    }
    if (dateFrom) result = result.filter((v) => v.fechaIngreso >= dateFrom);
    if (dateTo) result = result.filter((v) => v.fechaIngreso <= dateTo);
    if (statusFilter.length > 0) result = result.filter((v) => statusFilter.includes(v.status));
    if (monedaFilter !== "all") result = result.filter((v) => v.moneda === monedaFilter);
    return result;
  }, [data, search, dateFrom, dateTo, statusFilter, monedaFilter]);

  const handleCreate = async (input: VentaSaludMutationInput): Promise<boolean> => {
    try {
      await VentasSaludService.create(input);
      await loadData();
      return true;
    } catch {
      return false;
    }
  };

  const handleEdit = async (input: VentaSaludMutationInput): Promise<boolean> => {
    if (!editTarget) return false;
    try {
      await VentasSaludService.update(editTarget.id, input);
      await loadData();
      return true;
    } catch {
      return false;
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await VentasSaludService.remove(deleteTarget);
    setDeleteTarget(null);
    await loadData();
  };

  const openEdit = (item: VentaSalud) => {
    setEditTarget(item);
    setIsFormOpen(true);
  };

  const openCreate = () => {
    setEditTarget(undefined);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditTarget(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión Salud</h1>
          <p className="text-sm text-slate-500">
            {filtered.length} {filtered.length === 1 ? "registro" : "registros"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Buscar asegurado, compañía..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-lg shadow-primary/30 hover:bg-primary-dark"
          >
            <Plus size={16} />
            Nueva Gestión
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
          <Calendar size={15} className="shrink-0 text-slate-400" />
          <span className="shrink-0">Desde</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-transparent text-slate-900 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
          <Calendar size={15} className="shrink-0 text-slate-400" />
          <span className="shrink-0">Hasta</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-transparent text-slate-900 outline-none"
          />
        </div>

        <StatusDropdown selected={statusFilter} onChange={setStatusFilter} />

        <select
          value={monedaFilter}
          onChange={(e) => setMonedaFilter(e.target.value as CurrencyCode | "all")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none transition-all hover:border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">Todas las monedas</option>
          <option value="L">Lempiras (L)</option>
          <option value="$">Dólares ($)</option>
        </select>

        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => { setDateFrom(""); setDateTo(""); }}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            Limpiar fechas
          </button>
        )}
      </div>

      <VentasSaludTable
        data={filtered}
        isLoading={loading}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      <VentaSaludFormDrawer
        isOpen={isFormOpen}
        onClose={closeForm}
        onSubmit={editTarget ? handleEdit : handleCreate}
        initialData={editTarget}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Eliminar registro"
        message="¿Seguro que deseas eliminar esta gestión? Esta acción no se puede deshacer."
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
        isDestructive
      />
    </div>
  );
};

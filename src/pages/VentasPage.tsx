import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { clsx } from "clsx";
import { ChevronDown, Download, Filter } from "lucide-react";
import { exportVentasToExcel } from "../utils/exportExcel";
import { VentasService } from "../services/ventas.service";
import {
  CurrencyCode,
  StatusGestion,
  Venta,
  VentaMutationInput,
} from "../types/models";
import { VentasTable } from "../components/tables/VentasTable";
import { TableToolbar } from "../components/tables/TableToolbar";
import { GlobalFilters } from "../components/filters/GlobalFilters";
import { useGlobalFilters } from "../components/filters/useGlobalFilters";
import { VentaFormDrawer } from "../components/forms/VentaFormDrawer";
import { SaleDetailDrawer } from "../components/drawers/SaleDetailDrawer";
import { ConfirmDialog } from "../components/forms/ConfirmDialog";
import { useToast } from "../hooks/useToast.tsx";
import { useAuth } from "../hooks/useAuth";
import { StatusesService } from "../services/statuses.service";

function getStored<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item !== null ? (JSON.parse(item) as T) : fallback;
  } catch {
    return fallback;
  }
}

const StatusMultiSelect = ({
  options,
  selected,
  onChange,
}: {
  options: StatusGestion[];
  selected: string[];
  onChange: (v: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (nombre: string) =>
    onChange(
      selected.includes(nombre)
        ? selected.filter((s) => s !== nombre)
        : [...selected, nombre],
    );

  const prospectos = options.filter((s) => s.tipo === "prospecto");
  const ventas = options.filter((s) => s.tipo === "venta");

  const label =
    selected.length === 0
      ? "Todos los status"
      : `${selected.length} etapa${selected.length !== 1 ? "s" : ""}`;

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
        <ChevronDown
          size={14}
          className={clsx("transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-xs font-semibold text-slate-500">
              Filtrar por status
            </span>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-primary hover:underline"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            {[
              { groupLabel: "Prospecto", items: prospectos },
              { groupLabel: "Venta", items: ventas },
            ].map(({ groupLabel, items }) =>
              items.length === 0 ? null : (
                <div key={groupLabel}>
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {groupLabel}
                  </div>
                  {items.map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(s.nombre)}
                        onChange={() => toggle(s.nombre)}
                        className="h-3.5 w-3.5 rounded border-slate-300 accent-primary"
                      />
                      <span className="text-sm text-slate-700">{s.nombre}</span>
                    </label>
                  ))}
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const VentasPage = () => {
  const [data, setData] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const { search, dateRange } = useGlobalFilters();
  const { toast } = useToast();
  const { user, permissions } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Venta | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statusOptions, setStatusOptions] = useState<StatusGestion[]>([]);
  const [selectedSale, setSelectedSale] = useState<Venta | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const uid = user?.id ?? "";

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() =>
    getStored(`vp_statuses_${uid}`, []),
  );
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyCode | "all">(
    () => getStored(`vp_currency_${uid}`, "all"),
  );
  const [vendedorFilter, setVendedorFilter] = useState<string>(() =>
    getStored(`vp_vendedor_${uid}`, "all"),
  );

  useEffect(() => {
    if (!uid) return;
    localStorage.setItem(`vp_statuses_${uid}`, JSON.stringify(selectedStatuses));
  }, [selectedStatuses, uid]);

  useEffect(() => {
    if (!uid) return;
    localStorage.setItem(`vp_currency_${uid}`, JSON.stringify(currencyFilter));
  }, [currencyFilter, uid]);

  useEffect(() => {
    if (!uid) return;
    localStorage.setItem(`vp_vendedor_${uid}`, JSON.stringify(vendedorFilter));
  }, [vendedorFilter, uid]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await VentasService.getAll({ search, dateRange });
      setData(result);
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "No se pudieron cargar ventas",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [
    search,
    dateRange.from,
    dateRange.to,
    user?.id,
  ]);

  useEffect(() => {
    StatusesService.getAll()
      .then(setStatusOptions)
      .catch(() => setStatusOptions([]));
  }, []);

  const vendedores = useMemo(
    () =>
      Array.from(new Set(data.map((v) => v.vendedor).filter(Boolean))).sort(),
    [data],
  );

  // Status y moneda se aplican como memo (sin llamada extra al servidor)
  const filteredData = useMemo(() => {
    let result = data;
    if (selectedStatuses.length > 0) {
      result = result.filter((v) => selectedStatuses.includes(v.status));
    }
    if (currencyFilter !== "all") {
      result = result.filter((v) => v.moneda === currencyFilter);
    }
    return result;
  }, [data, selectedStatuses, currencyFilter]);

  const displayData = useMemo(
    () =>
      vendedorFilter === "all"
        ? filteredData
        : filteredData.filter((v) => v.vendedor === vendedorFilter),
    [filteredData, vendedorFilter],
  );

  // Deep link: abrir SaleDetailDrawer si la URL trae ?sale=<id>
  useEffect(() => {
    const saleId = searchParams.get("sale");
    if (!saleId || data.length === 0) return;
    const found = data.find((v) => v.id === saleId);
    if (found) setSelectedSale(found);
  }, [searchParams, data]);

  const handleOpenDetail = (venta: Venta) => {
    setSelectedSale(venta);
    setSearchParams({ sale: venta.id });
  };

  const handleCloseDetail = () => {
    setSelectedSale(null);
    setSearchParams({});
  };

  const handleCreate = async (venta: VentaMutationInput) => {
    try {
      const created = await VentasService.create(venta);
      // Insertar la nueva venta al inicio del estado local en lugar de
      // re-fetchear todo — reduce la latencia visible para el usuario
      setData((prev) => [created, ...prev]);
      toast("Venta creada exitosamente", "success");
      return true;
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "No se pudo crear la venta",
        "error",
      );
      return false;
    }
  };

  const handleUpdate = async (venta: VentaMutationInput) => {
    if (!editingItem) return false;

    try {
      const updated = await VentasService.update(editingItem.id, venta);
      await loadData();
      toast("Venta actualizada", "success");
      // Si el filtro de status activo ocultaría la venta recién actualizada, limpiarlo
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(updated.status)) {
        setSelectedStatuses([]);
      }
      return true;
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la venta",
        "error",
      );
      return false;
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await VentasService.remove(deleteId);
      await loadData();
      setDeleteId(null);
      toast("Venta eliminada", "success");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "No se pudo eliminar la venta",
        "error",
      );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-slate-800">
          Gestión Comercial y Ventas
        </h2>
        <GlobalFilters
          searchPlaceholder="Buscar por asegurado, póliza, producto, compañía o vendedor..."
          secondaryValue={currencyFilter}
          onSecondaryChange={(value) =>
            setCurrencyFilter(value as CurrencyCode | "all")
          }
          secondaryOptions={[
            { value: "all", label: "Todas las monedas" },
            { value: "L", label: "Lempiras" },
            { value: "$", label: "Dólares" },
          ]}
          statusSlot={
            <StatusMultiSelect
              options={statusOptions}
              selected={selectedStatuses}
              onChange={setSelectedStatuses}
            />
          }
          extraRow={
            user?.role === "gerente_comercial" && vendedores.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-500">
                  Vendedor:
                </span>
                <select
                  value={vendedorFilter}
                  onChange={(e) => setVendedorFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="all">Todos</option>
                  {vendedores.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            ) : undefined
          }
        />
      </div>

      <TableToolbar
        title={`Gestiones registradas (${displayData.length})`}
        onCreated={
          permissions?.ventas.create
            ? () => {
                setEditingItem(undefined);
                setIsDrawerOpen(true);
              }
            : undefined
        }
        actionLabel="Nueva Gestión"
      >
        {user?.role === "gerente_comercial" && (
          <button
            onClick={() => exportVentasToExcel(displayData)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Download size={16} />
            Exportar Excel
          </button>
        )}
      </TableToolbar>

      <VentasTable
        data={displayData}
        isLoading={loading}
        onEdit={
          permissions?.ventas.edit
            ? (item) => {
                setEditingItem(item);
                setIsDrawerOpen(true);
              }
            : undefined
        }
        onDelete={
          permissions?.ventas.delete ? (id) => setDeleteId(id) : undefined
        }
        onDetail={handleOpenDetail}
      />

      <VentaFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={editingItem ? handleUpdate : handleCreate}
        initialData={editingItem}
      />

      <SaleDetailDrawer
        sale={selectedSale}
        isOpen={!!selectedSale}
        onClose={handleCloseDetail}
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar Venta"
        message="¿Estás seguro de que deseas eliminar esta venta? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        isDestructive
      />
    </div>
  );
};

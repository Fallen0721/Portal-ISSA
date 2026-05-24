import { useEffect, useMemo, useState } from "react";
import { Drawer } from "./Drawer";
import { InputField, SelectField } from "./FormFields";
import {
  AppUser,
  CatalogItem,
  CurrencyCode,
  Gestion,
  GestionMutationInput,
  StatusArea,
  StatusGestion,
} from "../../types/models";
import { ProductosService } from "../../services/productos.service";
import { CompaniasService } from "../../services/companias.service";
import { CanalesService } from "../../services/canales.service";
import { TiposService } from "../../services/tipos.service";
import { TiposGestionService } from "../../services/tiposGestion.service";
import { StatusesService } from "../../services/statuses.service";
import { UsersService } from "../../services/auth.service";
import { useAuth } from "../../hooks/useAuth";

interface GestionFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: GestionMutationInput) => Promise<boolean> | boolean;
  initialData?: Gestion;
  /** Área del catálogo de productos: "vida" | "salud" | "daños". */
  productArea: string;
  /** Área de los status: "personas" | "danos". */
  statusArea: StatusArea;
  /** Etiqueta del submódulo para el título ("Vida", "Salud", "Riesgos Generales"). */
  titleLabel: string;
}

const today = () => new Date().toISOString().split("T")[0];

const emptyForm: GestionMutationInput = {
  no: null,
  fechaIngreso: today(),
  fechaVigencia: null,
  fechaCierre: null,
  asegurado: "",
  tipo: "",
  tipoGestion: "",
  producto: "",
  ramo: "",
  compania: "",
  status: "",
  moneda: "L",
  sumaAsegurada: 0,
  primaNeta: null,
  primaPlaneada: 0,
  primaBasica: null,
  agente: null,
  alianza: null,
  oficialNegocios: "",
  canal: "",
  observaciones: "",
};

export const GestionFormDrawer = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  productArea,
  statusArea,
  titleLabel,
}: GestionFormDrawerProps) => {
  const { user } = useAuth();
  const isElevated =
    user?.role === "admin" || user?.role === "gerente_comercial";

  const [formData, setFormData] = useState<GestionMutationInput>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productos, setProductos] = useState<CatalogItem[]>([]);
  const [companias, setCompanias] = useState<CatalogItem[]>([]);
  const [canales, setCanales] = useState<CatalogItem[]>([]);
  const [tipos, setTipos] = useState<CatalogItem[]>([]);
  const [tiposGestion, setTiposGestion] = useState<CatalogItem[]>([]);
  const [statuses, setStatuses] = useState<StatusGestion[]>([]);
  const [usuarios, setUsuarios] = useState<AppUser[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    ProductosService.getAll(productArea).then(setProductos).catch(() => setProductos([]));
    CompaniasService.getAll().then(setCompanias).catch(() => setCompanias([]));
    CanalesService.getAll().then(setCanales).catch(() => setCanales([]));
    TiposService.getAll().then(setTipos).catch(() => setTipos([]));
    TiposGestionService.getAll().then(setTiposGestion).catch(() => setTiposGestion([]));
    StatusesService.getAll(statusArea).then(setStatuses).catch(() => setStatuses([]));
    if (isElevated) {
      UsersService.getAll().then(setUsuarios).catch(() => setUsuarios([]));
    }
  }, [isOpen, productArea, statusArea, isElevated]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setFormData({
        no: initialData.no,
        fechaIngreso: initialData.fechaIngreso.split("T")[0],
        fechaVigencia: initialData.fechaVigencia
          ? initialData.fechaVigencia.split("T")[0]
          : null,
        fechaCierre: initialData.fechaCierre
          ? initialData.fechaCierre.split("T")[0]
          : null,
        asegurado: initialData.asegurado,
        tipo: initialData.tipo,
        tipoGestion: initialData.tipoGestion ?? "",
        producto: initialData.producto,
        ramo: initialData.ramo ?? "",
        compania: initialData.compania,
        status: initialData.status,
        moneda: initialData.moneda,
        sumaAsegurada: initialData.sumaAsegurada,
        primaNeta: initialData.primaNeta ?? null,
        primaPlaneada: initialData.primaPlaneada,
        primaBasica: initialData.primaBasica ?? null,
        agente: initialData.agente ?? null,
        alianza: initialData.alianza ?? null,
        oficialNegocios: initialData.oficialNegocios ?? "",
        canal: initialData.canal,
        ownerUserId: initialData.ownerUserId,
        vendedor: initialData.vendedor,
        observaciones: initialData.observaciones ?? "",
      });
      return;
    }
    setFormData({ ...emptyForm, vendedor: user?.name });
  }, [initialData, isOpen, user?.name]);

  const handleChange = <K extends keyof GestionMutationInput>(
    field: K,
    value: GestionMutationInput[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Línea Vida: la prima neta se calcula como Planeada + Básica. Las demás
  // líneas (Salud, Riesgos Generales) capturan la Prima Neta directamente.
  const isVida = useMemo(
    () => productos.find((p) => p.nombre === formData.producto)?.area === "vida",
    [productos, formData.producto],
  );

  const computedPrimaNeta = useMemo(() => {
    if (!isVida) return formData.primaNeta ?? 0;
    return (formData.primaPlaneada || 0) + (formData.primaBasica ?? 0);
  }, [isVida, formData.primaPlaneada, formData.primaBasica, formData.primaNeta]);

  // Agrupación de status por etapa para el <select>.
  const statusGroups = useMemo(() => {
    const groups = new Map<string, StatusGestion[]>();
    for (const s of statuses) {
      const key = s.etapa ?? "Sin etapa";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }
    return Array.from(groups.entries());
  }, [statuses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload: GestionMutationInput = {
        ...formData,
        primaNeta: isVida ? computedPrimaNeta : (formData.primaNeta ?? 0),
        primaPlaneada: isVida ? formData.primaPlaneada : 0,
        primaBasica: isVida ? formData.primaBasica ?? null : null,
      };
      const didSubmit = await onSubmit(payload);
      if (didSubmit !== false) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const toOptions = (items: CatalogItem[]) =>
    items.map((item) => ({ value: item.nombre, label: item.nombre }));

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? `Editar Gestión ${titleLabel}` : `Nueva Gestión ${titleLabel}`}
      width="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            label="No. Póliza / Referencia"
            value={formData.no ?? ""}
            onChange={(e) => handleChange("no", e.target.value || null)}
          />
          <InputField
            label="Fecha Ingreso"
            type="date"
            value={formData.fechaIngreso}
            onChange={(e) => handleChange("fechaIngreso", e.target.value)}
            required
          />
        </div>

        <InputField
          label="Asegurado"
          value={formData.asegurado}
          onChange={(e) => handleChange("asegurado", e.target.value)}
          required
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {isElevated ? (
            <SelectField
              label="Vendedor"
              value={formData.vendedor ?? ""}
              onChange={(e) => handleChange("vendedor", e.target.value)}
              options={usuarios.map((u) => ({ value: u.name, label: u.name }))}
            />
          ) : (
            <InputField
              label="Vendedor"
              value={formData.vendedor ?? user?.name ?? ""}
              disabled
            />
          )}
          <SelectField
            label="Tipo"
            value={formData.tipo}
            onChange={(e) => handleChange("tipo", e.target.value)}
            options={toOptions(tipos)}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Producto"
            value={formData.producto}
            onChange={(e) => handleChange("producto", e.target.value)}
            options={toOptions(productos)}
            required
          />
          <SelectField
            label="Tipo Gestión"
            value={formData.tipoGestion ?? ""}
            onChange={(e) => handleChange("tipoGestion", e.target.value)}
            options={toOptions(tiposGestion)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Compañía"
            value={formData.compania}
            onChange={(e) => handleChange("compania", e.target.value)}
            options={toOptions(companias)}
            required
          />
          <SelectField
            label="Canal"
            value={formData.canal}
            onChange={(e) => handleChange("canal", e.target.value)}
            options={toOptions(canales)}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => handleChange("status", e.target.value)}
            required
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Seleccionar...</option>
            {statusGroups.map(([etapa, items]) => (
              <optgroup key={etapa} label={etapa}>
                {items.map((s) => (
                  <option key={s.id} value={s.nombre}>
                    {s.nombre}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectField
            label="Moneda"
            value={formData.moneda}
            onChange={(e) =>
              handleChange("moneda", e.target.value as CurrencyCode)
            }
            options={[
              { value: "L", label: "Lempiras (L)" },
              { value: "$", label: "Dólares ($)" },
            ]}
          />
          <InputField
            label="Suma Asegurada"
            type="number"
            value={formData.sumaAsegurada || ""}
            onChange={(e) =>
              handleChange("sumaAsegurada", parseFloat(e.target.value) || 0)
            }
          />
          <InputField
            label="Fecha de Cierre"
            type="date"
            value={formData.fechaCierre ?? ""}
            disabled
            title="Se llena automáticamente al cerrar la gestión"
          />
        </div>

        {isVida ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <InputField
              label="Prima Planeada"
              type="number"
              value={formData.primaPlaneada || ""}
              onChange={(e) =>
                handleChange("primaPlaneada", parseFloat(e.target.value) || 0)
              }
            />
            <InputField
              label="Prima Básica"
              type="number"
              value={formData.primaBasica ?? ""}
              onChange={(e) =>
                handleChange(
                  "primaBasica",
                  e.target.value ? parseFloat(e.target.value) : null,
                )
              }
            />
            <InputField
              label="Prima Neta (calculada)"
              type="number"
              value={computedPrimaNeta || ""}
              disabled
              title="Prima Planeada + Prima Básica"
            />
          </div>
        ) : (
          <InputField
            label="Prima Neta"
            type="number"
            value={formData.primaNeta ?? ""}
            onChange={(e) =>
              handleChange(
                "primaNeta",
                e.target.value ? parseFloat(e.target.value) : null,
              )
            }
          />
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Observaciones
          </label>
          <textarea
            className="w-full rounded-lg border border-slate-200 p-2 focus:border-primary focus:ring-1 focus:ring-primary"
            rows={3}
            value={formData.observaciones ?? ""}
            onChange={(e) => handleChange("observaciones", e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-primary px-4 py-2 text-white shadow-lg shadow-primary/30 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? initialData
                ? "Guardando..."
                : "Creando..."
              : initialData
                ? "Actualizar"
                : "Crear Gestión"}
          </button>
        </div>
      </form>
    </Drawer>
  );
};

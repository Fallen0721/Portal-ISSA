import { useEffect, useState } from "react";
import { Drawer } from "./Drawer";
import { InputField, SelectField } from "./FormFields";
import {
  VentaVida,
  VentaVidaMutationInput,
  VentaVidaStatus,
  CanalVida,
  COMPANIAS_VIDA,
  CatalogItem,
} from "../../types/models";
import { ProductosService } from "../../services/productos.service";
import { RamosService } from "../../services/ramos.service";

interface VentaVidaFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: VentaVidaMutationInput) => Promise<boolean> | boolean;
  initialData?: VentaVida;
}

const emptyForm: VentaVidaMutationInput = {
  no: null,
  fechaIngreso: new Date().toISOString().split("T")[0],
  fechaVigencia: null,
  asegurado: "",
  agente: null,
  alianza: null,
  tipo: "Nueva",
  producto: "",
  ramo: "",
  compania: COMPANIAS_VIDA[0],
  status: VentaVidaStatus.INGRESADA,
  moneda: "L",
  sumaAsegurada: 0,
  primaPlaneada: 0,
  primaBasica: null,
  oficialNegocios: "",
  canal: CanalVida.VENTA_DIRECTA,
  observaciones: "",
};

export const VentaVidaFormDrawer = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: VentaVidaFormDrawerProps) => {
  const [formData, setFormData] = useState<VentaVidaMutationInput>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productos, setProductos] = useState<CatalogItem[]>([]);
  const [ramos, setRamos] = useState<CatalogItem[]>([]);

  useEffect(() => {
    ProductosService.getAll("vida").then(setProductos).catch(() => setProductos([]));
    RamosService.getAll().then(setRamos).catch(() => setRamos([]));
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData({
        no: initialData.no,
        fechaIngreso: initialData.fechaIngreso.split("T")[0],
        fechaVigencia: initialData.fechaVigencia
          ? initialData.fechaVigencia.split("T")[0]
          : null,
        asegurado: initialData.asegurado,
        agente: initialData.agente,
        alianza: initialData.alianza ?? null,
        tipo: initialData.tipo,
        producto: initialData.producto,
        ramo: initialData.ramo ?? "",
        compania: initialData.compania,
        status: initialData.status,
        moneda: initialData.moneda,
        sumaAsegurada: initialData.sumaAsegurada,
        primaPlaneada: initialData.primaPlaneada,
        primaBasica: initialData.primaBasica ?? null,
        oficialNegocios: initialData.oficialNegocios ?? "",
        canal: initialData.canal,
        ownerUserId: initialData.ownerUserId,
        observaciones: initialData.observaciones ?? "",
      });
      return;
    }

    setFormData({ ...emptyForm });
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const didSubmit = await onSubmit(formData);
      if (didSubmit !== false) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = <K extends keyof VentaVidaMutationInput>(
    field: K,
    value: VentaVidaMutationInput[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const statusOptions = Object.values(VentaVidaStatus).map((s) => ({
    value: s,
    label: s,
  }));

  const companiaOptions = COMPANIAS_VIDA.map((c) => ({ value: c, label: c }));

  const canalOptions = Object.values(CanalVida).map((c) => ({
    value: c,
    label: c,
  }));

  const productoOptions = [
    { value: "", label: "— Seleccionar producto —" },
    ...productos.map((p) => ({ value: p.nombre, label: p.nombre })),
  ];

  const ramoOptions = [
    { value: "", label: "— Sin ramo —" },
    ...ramos.map((r) => ({ value: r.nombre, label: r.nombre })),
  ];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Editar Gestión Vida" : "Nueva Gestión Vida"}
      width="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            label="Fecha Ingreso"
            type="date"
            value={formData.fechaIngreso}
            onChange={(e) => handleChange("fechaIngreso", e.target.value)}
            required
          />
          <InputField
            label="Fecha Vigencia"
            type="date"
            value={formData.fechaVigencia?.split("T")[0] ?? ""}
            onChange={(e) =>
              handleChange("fechaVigencia", e.target.value || null)
            }
          />
        </div>

        <InputField
          label="No. Póliza"
          value={formData.no ?? ""}
          onChange={(e) => handleChange("no", e.target.value || null)}
        />

        <InputField
          label="Asegurado"
          value={formData.asegurado}
          onChange={(e) => handleChange("asegurado", e.target.value)}
          required
        />

        <InputField
          label="Oficial de Negocios"
          value={formData.oficialNegocios ?? ""}
          onChange={(e) => handleChange("oficialNegocios", e.target.value)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Tipo"
            value={formData.tipo}
            onChange={(e) => handleChange("tipo", e.target.value)}
            options={[
              { value: "Nueva", label: "Nueva" },
              { value: "Renovacion", label: "Renovación" },
              { value: "Inclusion", label: "Inclusión" },
              { value: "Asignacion", label: "Asignación" },
            ]}
          />
          <SelectField
            label="Canal"
            value={formData.canal}
            onChange={(e) => handleChange("canal", e.target.value)}
            options={canalOptions}
          />
        </div>

        {formData.canal === CanalVida.FUSIONA2 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField
              label="Agente"
              placeholder="Ej: Helen Siu"
              value={formData.agente ?? ""}
              onChange={(e) => handleChange("agente", e.target.value || null)}
            />
            <InputField
              label="Alianza"
              placeholder="Ej: Banco Cuscatlán"
              value={formData.alianza ?? ""}
              onChange={(e) => handleChange("alianza", e.target.value || null)}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Producto"
            value={formData.producto}
            onChange={(e) => handleChange("producto", e.target.value)}
            options={productoOptions}
            required
          />
          <SelectField
            label="Ramo"
            value={formData.ramo ?? ""}
            onChange={(e) => handleChange("ramo", e.target.value)}
            options={ramoOptions}
          />
        </div>

        <SelectField
          label="Compañía"
          value={formData.compania}
          onChange={(e) => handleChange("compania", e.target.value)}
          options={companiaOptions}
        />

        <SelectField
          label="Status"
          value={formData.status}
          onChange={(e) => handleChange("status", e.target.value)}
          options={statusOptions}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectField
            label="Moneda"
            value={formData.moneda}
            onChange={(e) =>
              handleChange("moneda", e.target.value as VentaVida["moneda"])
            }
            options={[
              { value: "L", label: "Lempiras" },
              { value: "$", label: "Dólares" },
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
            label="Prima Planeada"
            type="number"
            value={formData.primaPlaneada || ""}
            onChange={(e) =>
              handleChange("primaPlaneada", parseFloat(e.target.value) || 0)
            }
          />
        </div>

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
            className="rounded-lg bg-primary px-4 py-2 text-white shadow-lg shadow-primary/30 hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (initialData ? "Guardando..." : "Creando...") : (initialData ? "Actualizar" : "Crear Gestión")}
          </button>
        </div>
      </form>
    </Drawer>
  );
};

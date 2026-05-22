import { useEffect, useState } from "react";
import { Drawer } from "./Drawer";
import { InputField, SelectField } from "./FormFields";
import {
  Venta,
  VentaMutationInput,
  VentaStatus,
  Canal,
  StatusGestion,
  CatalogItem,
} from "../../types/models";
import { StatusesService } from "../../services/statuses.service";
import { ProductosService } from "../../services/productos.service";
import { CompaniasService } from "../../services/companias.service";
import { CanalesService } from "../../services/canales.service";
import { useAuth } from "../../hooks/useAuth";

interface VentaFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (venta: VentaMutationInput) => Promise<boolean> | boolean;
  initialData?: Venta;
}

const emptyForm: VentaMutationInput = {
  no: "",
  fechaIngreso: new Date().toISOString().split("T")[0],
  fechaVigencia: null,
  fechaCierre: null,
  asegurado: "",
  vendedor: "",
  tipo: "Nueva",
  producto: "",
  compania: "",
  status: VentaStatus.PRIMER_CONTACTO_REALIZADO,
  moneda: "L",
  sumaAsegurada: 0,
  primaNetaAnual: 0,
  canal: Canal.VENTA_DIRECTA,
  alianza: "",
  diasProceso: 0,
  observaciones: "",
};

export const VentaFormDrawer = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: VentaFormDrawerProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<VentaMutationInput>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statuses, setStatuses] = useState<StatusGestion[]>([]);
  const [productos, setProductos] = useState<CatalogItem[]>([]);
  const [companias, setCompanias] = useState<CatalogItem[]>([]);
  const [canales, setCanales] = useState<CatalogItem[]>([]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        no: initialData.no,
        fechaIngreso: initialData.fechaIngreso.split("T")[0],
        fechaVigencia: initialData.fechaVigencia,
        fechaCierre: initialData.fechaCierre
          ? initialData.fechaCierre.split("T")[0]
          : null,
        asegurado: initialData.asegurado,
        vendedor: initialData.vendedor,
        tipo: initialData.tipo,
        producto: initialData.producto,
        compania: initialData.compania,
        status: initialData.status,
        moneda: initialData.moneda,
        sumaAsegurada: initialData.sumaAsegurada,
        primaNetaAnual: initialData.primaNetaAnual,
        canal: initialData.canal,
        alianza: initialData.alianza || "",
        diasProceso: initialData.diasProceso,
        ownerUserId: initialData.ownerUserId,
        observaciones: initialData.observaciones || "",
        source: initialData.source,
        cotizacionId: initialData.cotizacionId,
      });
      return;
    }

    setFormData({ ...emptyForm, vendedor: user?.name ?? "" });
  }, [initialData, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    StatusesService.getAll()
      .then(setStatuses)
      .catch(() => setStatuses([]));
    ProductosService.getAll()
      .then(setProductos)
      .catch(() => setProductos([]));
    CompaniasService.getAll()
      .then(setCompanias)
      .catch(() => setCompanias([]));
    CanalesService.getAll()
      .then(setCanales)
      .catch(() => setCanales([]));
  }, [isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const didSubmit = await onSubmit(formData);
      if (didSubmit !== false) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = <K extends keyof VentaMutationInput>(
    field: K,
    value: VentaMutationInput[K],
  ) => {
    setFormData((current) => {
      const next = { ...current, [field]: value };
      if (
        field === "status" &&
        value === VentaStatus.NUEVO &&
        !current.fechaCierre
      ) {
        next.fechaCierre = new Date().toISOString().split("T")[0];
      }
      return next;
    });
  };

  const ventaStatusOptions =
    statuses.length > 0
      ? statuses.map((status) => ({
          value: status.nombre,
          label: `${status.tipo === "prospecto" ? "Prospecto" : "Venta"} · ${status.nombre}`,
        }))
      : Object.values(VentaStatus).map((status) => ({
          value: status,
          label: status,
        }));

  const productoOptions = [
    { value: "", label: "Seleccionar..." },
    ...productos.map((p) => ({ value: p.nombre, label: p.nombre })),
  ];

  const companiaOptions = [
    { value: "", label: "Seleccionar..." },
    ...companias.map((c) => ({ value: c.nombre, label: c.nombre })),
  ];

  const canalOptions =
    canales.length > 0
      ? canales.map((c) => ({ value: c.nombre, label: c.nombre }))
      : Object.values(Canal).map((canal) => ({ value: canal, label: canal }));

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Editar Gestión / Venta" : "Nueva Gestión / Venta"}
      width="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            label="No. Póliza / Referencia"
            type="text"
            value={formData.no}
            onChange={(event) => handleChange("no", event.target.value)}
          />
          <InputField
            label="Fecha Ingreso"
            type="date"
            value={formData.fechaIngreso}
            onChange={(event) =>
              handleChange("fechaIngreso", event.target.value)
            }
            required
          />
        </div>

        <InputField
          label="Asegurado"
          value={formData.asegurado}
          onChange={(event) => handleChange("asegurado", event.target.value)}
          required
        />

        <InputField
          label="Vendedor"
          value={formData.vendedor || ""}
          onChange={(event) => handleChange("vendedor", event.target.value)}
          required
          disabled
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Producto"
            value={formData.producto}
            onChange={(event) => handleChange("producto", event.target.value)}
            options={productoOptions}
          />
          <SelectField
            label="Compañía"
            value={formData.compania}
            onChange={(event) => handleChange("compania", event.target.value)}
            options={companiaOptions}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Tipo Venta"
            value={formData.tipo}
            onChange={(event) => handleChange("tipo", event.target.value)}
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
            onChange={(event) => {
              handleChange("canal", event.target.value as Canal);
              if (event.target.value !== Canal.FUSIONA2) {
                handleChange("alianza", "");
              }
            }}
            options={canalOptions}
          />
        </div>

        {formData.canal === Canal.FUSIONA2 && (
          <InputField
            label="Alianza"
            value={formData.alianza || ""}
            onChange={(event) => handleChange("alianza", event.target.value)}
            placeholder="Nombre de la alianza"
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectField
            label="Moneda"
            value={formData.moneda}
            onChange={(event) =>
              handleChange("moneda", event.target.value as Venta["moneda"])
            }
            options={[
              { value: "L", label: "Lempiras" },
              { value: "$", label: "Dólares" },
            ]}
            className="col-span-1"
          />
          <InputField
            label="Suma Asegurada"
            type="number"
            value={formData.sumaAsegurada || ""}
            onChange={(event) =>
              handleChange("sumaAsegurada", parseFloat(event.target.value) || 0)
            }
            className="col-span-1"
          />
          <InputField
            label="Prima Neta"
            type="number"
            value={formData.primaNetaAnual || ""}
            onChange={(event) =>
              handleChange(
                "primaNetaAnual",
                parseFloat(event.target.value) || 0,
              )
            }
            className="col-span-1"
          />
        </div>

        <SelectField
          label="Status"
          value={formData.status}
          onChange={(event) => handleChange("status", event.target.value)}
          options={ventaStatusOptions}
        />

        {formData.status === VentaStatus.NUEVO && (
          <InputField
            label="Fecha de Cierre"
            type="date"
            value={formData.fechaCierre?.split("T")[0] ?? ""}
            onChange={(event) =>
              handleChange("fechaCierre", event.target.value || null)
            }
            required
          />
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Observaciones
          </label>
          <textarea
            className="w-full rounded-lg border border-slate-200 p-2 focus:border-primary focus:ring-1 focus:ring-primary"
            rows={3}
            value={formData.observaciones || ""}
            onChange={(event) =>
              handleChange("observaciones", event.target.value)
            }
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-primary px-4 py-2 text-white shadow-lg shadow-primary/30 hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? (initialData ? "Guardando..." : "Creando...")
              : (initialData ? "Actualizar" : "Crear Gestión")}
          </button>
        </div>
      </form>
    </Drawer>
  );
};

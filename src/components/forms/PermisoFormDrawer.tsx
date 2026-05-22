import { useEffect, useState } from "react";
import { Drawer } from "./Drawer";
import { InputField, SelectField } from "./FormFields";
import {
  PermisoLaboral,
  PermisoMutationInput,
  PermisoTipo,
  PermisoStatus,
} from "../../types/models";
import { calculateDays } from "../../utils/dates";
import { useAuth } from "../../hooks/useAuth";

interface PermisoFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (permiso: PermisoMutationInput) => void;
  initialData?: PermisoLaboral;
}

export const PermisoFormDrawer = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: PermisoFormDrawerProps) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const buildEmptyForm = (): PermisoMutationInput => ({
    empleado: user?.name ?? "",
    departamento: "",
    tipo: PermisoTipo.PERMISO,
    fechaInicio: new Date().toISOString().split("T")[0],
    fechaFin: new Date().toISOString().split("T")[0],
    dias: 1,
    motivo: "",
    status: PermisoStatus.SOLICITADO,
    observaciones: "",
    ownerUserId: user?.id,
  });

  const [formData, setFormData] = useState<PermisoMutationInput>(buildEmptyForm);

  useEffect(() => {
    if (initialData) {
      setFormData({
        empleado: initialData.empleado,
        departamento: initialData.departamento || "",
        tipo: initialData.tipo,
        fechaInicio: initialData.fechaInicio.split("T")[0],
        fechaFin: initialData.fechaFin.split("T")[0],
        dias: initialData.dias,
        motivo: initialData.motivo,
        status: initialData.status,
        observaciones: initialData.observaciones || "",
        ownerUserId: initialData.ownerUserId ?? user?.id,
      });
      return;
    }

    setFormData(buildEmptyForm());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, isOpen]);

  useEffect(() => {
    if (!formData.fechaInicio || !formData.fechaFin) return;

    const days = calculateDays(formData.fechaInicio, formData.fechaFin);
    if (days === formData.dias) return;

    setFormData((current) => ({
      ...current,
      dias: days > 0 ? days : 0,
    }));
  }, [formData.fechaInicio, formData.fechaFin, formData.dias]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const handleChange = <K extends keyof PermisoMutationInput>(
    field: K,
    value: PermisoMutationInput[K],
  ) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Editar Solicitud" : "Nueva Solicitud"}
      width="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          label="Empleado"
          value={formData.empleado}
          onChange={(event) => handleChange("empleado", event.target.value)}
          disabled={!isAdmin}
          className={!isAdmin ? "bg-slate-50 opacity-70" : ""}
          required
        />

        <InputField
          label="Departamento"
          value={formData.departamento || ""}
          onChange={(event) =>
            handleChange("departamento", event.target.value)
          }
        />

        <SelectField
          label="Tipo de Solicitud"
          value={formData.tipo}
          onChange={(event) =>
            handleChange("tipo", event.target.value as PermisoTipo)
          }
          options={Object.values(PermisoTipo).map((tipo) => ({
            value: tipo,
            label: tipo,
          }))}
        />

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Desde"
            type="date"
            value={formData.fechaInicio}
            onChange={(event) =>
              handleChange("fechaInicio", event.target.value)
            }
            required
          />
          <InputField
            label="Hasta"
            type="date"
            value={formData.fechaFin}
            onChange={(event) => handleChange("fechaFin", event.target.value)}
            required
          />
        </div>

        <InputField
          label="Días (Calculado)"
          type="number"
          value={formData.dias}
          readOnly
          className="bg-slate-50 opacity-70"
        />

        <div className="grid grid-cols-1 gap-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Motivo
          </label>
          <textarea
            className="w-full rounded-lg border border-slate-200 p-2 focus:border-primary focus:ring-1 focus:ring-primary"
            rows={3}
            value={formData.motivo}
            onChange={(event) => handleChange("motivo", event.target.value)}
            required
          />
        </div>

        {isAdmin && (
          <SelectField
            label="Estado"
            value={formData.status}
            onChange={(event) =>
              handleChange("status", event.target.value as PermisoStatus)
            }
            options={Object.values(PermisoStatus).map((status) => ({
              value: status,
              label: status,
            }))}
          />
        )}

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
            className="rounded-lg bg-primary px-4 py-2 text-white shadow-lg shadow-primary/30 hover:bg-primary-dark"
          >
            {initialData ? "Actualizar" : "Enviar Solicitud"}
          </button>
        </div>
      </form>
    </Drawer>
  );
};

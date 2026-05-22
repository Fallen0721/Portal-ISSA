import { useEffect, useState } from "react";
import { Drawer } from "./Drawer";
import { InputField, SelectField } from "./FormFields";
import { StatusGestion, StatusGestionInput, StatusGestionTipo } from "../../types/models";

interface StatusFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: StatusGestionInput) => Promise<void> | void;
  initialData?: StatusGestion;
}

const emptyForm: StatusGestionInput = {
  tipo: "prospecto",
  nombre: "",
};

export const StatusFormDrawer = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: StatusFormDrawerProps) => {
  const [formData, setFormData] = useState<StatusGestionInput>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setFormData({ tipo: initialData.tipo, nombre: initialData.nombre });
    } else {
      setFormData(emptyForm);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.nombre.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit({ tipo: formData.tipo, nombre: formData.nombre.trim() });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = initialData
    ? "Editar Status"
    : formData.tipo === "prospecto"
      ? "Nuevo Status de Prospecto"
      : "Nuevo Status de Venta";

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={title} width="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <SelectField
          label="Tipo de Status"
          value={formData.tipo}
          onChange={(event) =>
            setFormData((current) => ({
              ...current,
              tipo: event.target.value as StatusGestionTipo,
            }))
          }
          options={[
            { value: "prospecto", label: "Prospecto" },
            { value: "venta", label: "Venta" },
          ]}
          required
        />

        <InputField
          label={
            formData.tipo === "prospecto"
              ? "Nombre del status de prospecto"
              : "Nombre del status de venta"
          }
          value={formData.nombre}
          onChange={(event) =>
            setFormData((current) => ({
              ...current,
              nombre: event.target.value,
            }))
          }
          required
        />

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
            {isSubmitting ? "Guardando..." : (initialData ? "Actualizar Status" : "Guardar Status")}
          </button>
        </div>
      </form>
    </Drawer>
  );
};

import { useEffect, useState } from "react";
import { Drawer } from "./Drawer";
import { InputField, SelectField } from "./FormFields";
import { CatalogItem } from "../../types/models";

interface AreaOption {
  value: string;
  label: string;
}

interface CatalogItemFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (nombre: string, area?: string) => Promise<void> | void;
  initialData?: CatalogItem;
  entityLabel: string;
  areaOptions?: AreaOption[];
}

export const CatalogItemFormDrawer = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  entityLabel,
  areaOptions,
}: CatalogItemFormDrawerProps) => {
  const [nombre, setNombre] = useState("");
  const [area, setArea] = useState(areaOptions?.[0]?.value ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setNombre(initialData?.nombre ?? "");
    setArea(initialData?.area ?? areaOptions?.[0]?.value ?? "");
  }, [isOpen, initialData]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nombre.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(nombre.trim(), areaOptions ? area : undefined);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = initialData ? `Editar ${entityLabel}` : `Nuevo ${entityLabel}`;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={title} width="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />

        {areaOptions && (
          <SelectField
            label="Área"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            options={areaOptions}
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
            disabled={isSubmitting}
            className="rounded-lg bg-primary px-4 py-2 text-white shadow-lg shadow-primary/30 hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Guardando..." : (initialData ? "Actualizar" : "Guardar")}
          </button>
        </div>
      </form>
    </Drawer>
  );
};

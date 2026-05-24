import { useEffect, useState } from "react";
import { Drawer } from "./Drawer";
import { InputField, SelectField } from "./FormFields";
import {
  StatusArea,
  StatusGestion,
  StatusGestionInput,
  StatusGestionTipo,
} from "../../types/models";

interface StatusFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: StatusGestionInput) => Promise<void> | void;
  initialData?: StatusGestion;
  /** Área activa en la sección. Determina los campos disponibles. */
  area: StatusArea;
  /** Etapas ya existentes en el área, para sugerirlas. */
  etapaSuggestions?: string[];
}

export const StatusFormDrawer = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  area,
  etapaSuggestions = [],
}: StatusFormDrawerProps) => {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<StatusGestionTipo>("prospecto");
  const [etapa, setEtapa] = useState("");
  const [esCierre, setEsCierre] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isComercial = area === "comercial";

  useEffect(() => {
    if (!isOpen) return;
    setNombre(initialData?.nombre ?? "");
    setTipo((initialData?.tipo as StatusGestionTipo) ?? "prospecto");
    setEtapa(initialData?.etapa ?? "");
    setEsCierre(initialData?.esCierre ?? false);
  }, [isOpen, initialData]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nombre.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        area,
        nombre: nombre.trim(),
        ...(isComercial
          ? { tipo }
          : { etapa: etapa.trim() || null, esCierre }),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = initialData ? "Editar Status" : "Nuevo Status";

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={title} width="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {isComercial ? (
          <SelectField
            label="Tipo de Status"
            value={tipo}
            onChange={(event) => setTipo(event.target.value as StatusGestionTipo)}
            options={[
              { value: "prospecto", label: "Prospecto" },
              { value: "venta", label: "Venta" },
            ]}
            required
          />
        ) : (
          <div>
            <InputField
              label="Etapa"
              placeholder="Ej: ETAPA COTIZACIÓN"
              value={etapa}
              onChange={(event) => setEtapa(event.target.value)}
              list="etapa-suggestions"
            />
            <datalist id="etapa-suggestions">
              {etapaSuggestions.map((e) => (
                <option key={e} value={e} />
              ))}
            </datalist>
          </div>
        )}

        <InputField
          label="Nombre del status"
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          required
        />

        {!isComercial && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={esCierre}
              onChange={(event) => setEsCierre(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-primary"
            />
            Marcar como status de cierre (llena la fecha de cierre automáticamente)
          </label>
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
            className="rounded-lg bg-primary px-4 py-2 text-white shadow-lg shadow-primary/30 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Guardando..." : initialData ? "Actualizar Status" : "Guardar Status"}
          </button>
        </div>
      </form>
    </Drawer>
  );
};

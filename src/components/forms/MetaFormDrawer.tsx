import { useEffect, useState } from "react";
import { Drawer } from "./Drawer";
import { InputField, SelectField } from "./FormFields";
import {
  ALL_META_TIPOS,
  AppUser,
  META_TIPO_LABELS,
  MetaMensualInput,
  MetaTipo,
} from "../../types/models";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface MetaFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: MetaMensualInput) => void;
  vendedores: AppUser[];
  /** Tipos ya asignados al vendedor para este mes/año (para filtrar el dropdown) */
  tiposYaAsignados: MetaTipo[];
  preselectedVendedorId?: string;
  mes: number;
  año: number;
}

export const MetaFormDrawer = ({
  isOpen,
  onClose,
  onSubmit,
  vendedores,
  tiposYaAsignados,
  preselectedVendedorId,
  mes,
  año,
}: MetaFormDrawerProps) => {
  const [vendedorId, setVendedorId] = useState(preselectedVendedorId ?? "");
  const [tipo, setTipo] = useState<MetaTipo | "">("");
  const [manualPercentage, setManualPercentage] = useState("");
  const [manualValue, setManualValue] = useState("");

  const tiposDisponibles = ALL_META_TIPOS.filter(
    (t) => !tiposYaAsignados.includes(t),
  );

  useEffect(() => {
    setVendedorId(preselectedVendedorId ?? "");
    setTipo(tiposDisponibles[0] ?? "");
    setManualPercentage("");
    setManualValue("");
  }, [isOpen, preselectedVendedorId, tiposDisponibles]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!vendedorId || !tipo) return;
    onSubmit({
      vendedorId,
      mes,
      año,
      tipo,
      manualPercentage:
        manualPercentage.trim() === ""
          ? null
          : Number.parseFloat(manualPercentage),
      manualValue:
        manualValue.trim() === "" ? null : Number.parseFloat(manualValue),
    });
    onClose();
  };

  const vendedorNombre =
    vendedores.find((v) => v.id === vendedorId)?.name ?? "";
  const valueLabel =
    tipo === "directa_cruzada_usd"
      ? "Valor manual ($)"
      : "Valor manual (L)";

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Asignar Meta"
      width="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Info del período */}
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700">
          <span className="font-semibold">Período: </span>
          {MONTH_NAMES[mes - 1]} {año}
          {vendedorNombre && (
            <>
              {" · "}
              <span className="font-semibold">Vendedor: </span>
              {vendedorNombre}
            </>
          )}
        </div>

        {/* Vendedor (solo si no está preseleccionado) */}
        {!preselectedVendedorId && (
          <SelectField
            label="Vendedor"
            value={vendedorId}
            onChange={(e) => setVendedorId(e.target.value)}
            options={vendedores.map((v) => ({ value: v.id, label: v.name }))}
            required
          />
        )}

        {tiposDisponibles.length === 0 ? (
          <p className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
            Este vendedor ya tiene los 3 tipos de meta asignados para este período.
          </p>
        ) : (
          <SelectField
            label="Tipo de Meta"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as MetaTipo)}
            options={tiposDisponibles.map((t) => ({
              value: t,
              label: META_TIPO_LABELS[t],
            }))}
            required
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            label="Porcentaje manual (%)"
            type="number"
            min="0"
            step="0.01"
            value={manualPercentage}
            onChange={(event) => setManualPercentage(event.target.value)}
            placeholder="Ej. 12.5"
          />
          <InputField
            label={valueLabel}
            type="number"
            min="0"
            step="0.01"
            value={manualValue}
            onChange={(event) => setManualValue(event.target.value)}
            placeholder="Ej. 15000"
          />
        </div>

        <p className="text-xs text-slate-500">
          Si dejas estos campos vacíos, la meta seguirá usando el cálculo automático.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={tiposDisponibles.length === 0 || !tipo}
            className="rounded-lg bg-primary px-4 py-2 text-white shadow-lg shadow-primary/30 hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Asignar Meta
          </button>
        </div>
      </form>
    </Drawer>
  );
};

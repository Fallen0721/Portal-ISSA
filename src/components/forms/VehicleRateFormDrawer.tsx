import { useEffect, useState } from "react";
import { Drawer } from "./Drawer";
import { InputField, SelectField } from "./FormFields";
import {
  MODE_OPTIONS,
  VEHICLE_COMPANY_OPTIONS,
  VEHICLE_ORIGIN_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
} from "../vehiculos/constants";
import {
  VehicleComparisonMode,
  VehicleCompanyId,
  VehicleOrigin,
  VehicleRate,
  VehicleRateInput,
  VehicleTypeId,
} from "../vehiculos/types";

interface VehicleRateFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: VehicleRateInput) => Promise<void> | void;
  initialValue?: VehicleRate | null;
}

interface FormState {
  companyId: VehicleCompanyId | "";
  mode: VehicleComparisonMode;
  vehicleType: VehicleTypeId | "";
  origin: VehicleOrigin | "";
  insuredValueMin: string;
  insuredValueMax: string;
  ratePercent: string;
}

const createInitialState = (rate?: VehicleRate | null): FormState => ({
  companyId: rate?.companyId ?? "",
  mode: rate?.mode ?? "individual",
  vehicleType: rate?.vehicleType ?? "",
  origin: rate?.origin ?? "",
  insuredValueMin:
    rate?.insuredValueMin !== null && rate?.insuredValueMin !== undefined
      ? String(rate.insuredValueMin)
      : "",
  insuredValueMax:
    rate?.insuredValueMax !== null && rate?.insuredValueMax !== undefined
      ? String(rate.insuredValueMax)
      : "",
  ratePercent:
    rate?.rate !== null && rate?.rate !== undefined ? String(rate.rate * 100) : "",
});

const parseOptionalNumber = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return null;

  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) ? numericValue : Number.NaN;
};

export const VehicleRateFormDrawer = ({
  isOpen,
  onClose,
  onSubmit,
  initialValue,
}: VehicleRateFormDrawerProps) => {
  const [formData, setFormData] = useState<FormState>(createInitialState(initialValue));
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(createInitialState(initialValue));
    setError("");
  }, [initialValue, isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");

    if (!formData.companyId || !formData.vehicleType) {
      setError("Completa la compañía y el tipo de vehículo.");
      return;
    }

    const ratePercent = Number(formData.ratePercent);
    if (!Number.isFinite(ratePercent) || ratePercent <= 0) {
      setError("La tasa debe ser mayor a 0.");
      return;
    }

    const insuredValueMin = parseOptionalNumber(formData.insuredValueMin);
    const insuredValueMax = parseOptionalNumber(formData.insuredValueMax);

    if (Number.isNaN(insuredValueMin) || Number.isNaN(insuredValueMax)) {
      setError("El rango de suma asegurada debe contener valores numéricos válidos.");
      return;
    }

    if (
      insuredValueMin !== null &&
      insuredValueMax !== null &&
      insuredValueMin > insuredValueMax
    ) {
      setError("La suma asegurada mínima no puede ser mayor a la máxima.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        companyId: formData.companyId,
        mode: formData.mode,
        vehicleType: formData.vehicleType,
        origin: formData.origin || null,
        insuredValueMin,
        insuredValueMax,
        rate: ratePercent / 100,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={initialValue ? "Editar Tasa de Vehículo" : "Nueva Tasa de Vehículo"}
      width="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Compañía"
            value={formData.companyId}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                companyId: event.target.value as VehicleCompanyId | "",
              }))
            }
            options={VEHICLE_COMPANY_OPTIONS}
            required
          />

          <SelectField
            label="Modalidad"
            value={formData.mode}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                mode: event.target.value as VehicleComparisonMode,
              }))
            }
            options={MODE_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            required
          />

          <SelectField
            label="Tipo de Vehículo"
            value={formData.vehicleType}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                vehicleType: event.target.value as VehicleTypeId | "",
              }))
            }
            options={VEHICLE_TYPE_OPTIONS}
            required
          />

          <SelectField
            label="Origen Específico"
            value={formData.origin}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                origin: event.target.value as VehicleOrigin | "",
              }))
            }
            options={VEHICLE_ORIGIN_OPTIONS}
          />

          <InputField
            label="Suma Asegurada Mínima"
            type="number"
            min={0}
            step="0.01"
            value={formData.insuredValueMin}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                insuredValueMin: event.target.value,
              }))
            }
          />

          <InputField
            label="Suma Asegurada Máxima"
            type="number"
            min={0}
            step="0.01"
            value={formData.insuredValueMax}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                insuredValueMax: event.target.value,
              }))
            }
          />
        </div>

        <InputField
          label="Tasa (%)"
          type="number"
          min={0}
          step="0.0001"
          value={formData.ratePercent}
          onChange={(event) =>
            setFormData((current) => ({
              ...current,
              ratePercent: event.target.value,
            }))
          }
          required
        />

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Usa el origen y el rango de suma asegurada solo cuando la tasa aplique a
          una condición específica. Si los dejas vacíos, la tasa funcionará como
          regla general para ese tipo de vehículo.
        </div>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}

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
            {isSubmitting ? "Guardando..." : (initialValue ? "Guardar Cambios" : "Crear Tasa")}
          </button>
        </div>
      </form>
    </Drawer>
  );
};

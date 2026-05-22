import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { ConfirmDialog } from "../forms/ConfirmDialog";
import { VehicleRateFormDrawer } from "../forms/VehicleRateFormDrawer";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { VehiculosService } from "../../services/vehiculos.service";
import { formatCurrency } from "../../utils/format";
import { formatDate } from "../../utils/dates";
import {
  MODE_OPTIONS,
  VEHICLE_COMPANY_LABELS,
  VEHICLE_ORIGIN_LABELS,
  VEHICLE_TYPE_LABELS,
} from "./constants";
import { VehicleComparisonMode, VehicleCompanyId, VehicleRate, VehicleRateInput } from "./types";

interface VehicleRatesSectionProps {
  rates: VehicleRate[];
  loading: boolean;
  onRatesChanged: () => Promise<void>;
}

const formatModeLabel = (mode: VehicleComparisonMode) =>
  mode === "individual" ? "Individual" : "Colectivo";

const formatRatePercent = (rate: number) =>
  `${Number((rate * 100).toFixed(4)).toString()}%`;

const formatInsuredRange = (rate: VehicleRate) => {
  if (rate.insuredValueMin === null || rate.insuredValueMin === undefined) {
    if (rate.insuredValueMax === null || rate.insuredValueMax === undefined) {
      return "General";
    }

    return `Hasta ${formatCurrency(rate.insuredValueMax, "L")}`;
  }

  if (rate.insuredValueMax === null || rate.insuredValueMax === undefined) {
    return `Desde ${formatCurrency(rate.insuredValueMin, "L")}`;
  }

  return `${formatCurrency(rate.insuredValueMin, "L")} - ${formatCurrency(
    rate.insuredValueMax,
    "L",
  )}`;
};

export const VehicleRatesSection = ({
  rates,
  loading,
  onRatesChanged,
}: VehicleRatesSectionProps) => {
  const { permissions } = useAuth();
  const { toast } = useToast();
  const [modeFilter, setModeFilter] = useState<VehicleComparisonMode | "">("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<VehicleRate | null>(null);
  const [rateToDelete, setRateToDelete] = useState<VehicleRate | null>(null);
  const [expandedCompanyId, setExpandedCompanyId] = useState<VehicleCompanyId | null>(
    null,
  );

  const canCreate = permissions?.cotizador_vehiculo.create ?? false;
  const canEdit = permissions?.cotizador_vehiculo.edit ?? false;
  const canDelete = permissions?.cotizador_vehiculo.delete ?? false;

  const filteredRates = useMemo(
    () =>
      rates.filter((rate) => {
        if (modeFilter && rate.mode !== modeFilter) return false;
        return true;
      }),
    [modeFilter, rates],
  );

  const groupedRates = useMemo(() => {
    const groups = new Map<
      VehicleCompanyId,
      { companyId: VehicleCompanyId; rates: VehicleRate[] }
    >();

    filteredRates.forEach((rate) => {
      const group = groups.get(rate.companyId);
      if (group) {
        group.rates.push(rate);
        return;
      }

      groups.set(rate.companyId, {
        companyId: rate.companyId,
        rates: [rate],
      });
    });

    return Array.from(groups.values()).sort((left, right) =>
      VEHICLE_COMPANY_LABELS[left.companyId].localeCompare(
        VEHICLE_COMPANY_LABELS[right.companyId],
      ),
    );
  }, [filteredRates]);

  const expandedGroup =
    groupedRates.find((group) => group.companyId === expandedCompanyId) ?? null;

  const configuredCompanies = useMemo(
    () => new Set(rates.map((rate) => rate.companyId)).size,
    [rates],
  );

  const configuredTypes = useMemo(
    () => new Set(rates.map((rate) => rate.vehicleType)).size,
    [rates],
  );

  const handleCreate = () => {
    setEditingRate(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (rate: VehicleRate) => {
    setEditingRate(rate);
    setIsDrawerOpen(true);
  };

  const handleSubmit = async (input: VehicleRateInput) => {
    try {
      if (editingRate) {
        await VehiculosService.updateRate(editingRate.id, input);
        toast("Tasa actualizada", "success");
      } else {
        await VehiculosService.createRate(input);
        toast("Tasa creada", "success");
      }

      await onRatesChanged();
      setEditingRate(null);
      setExpandedCompanyId((current) =>
        current ?? input.companyId,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar la tasa";
      toast(message, "error");
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!rateToDelete) return;

    try {
      await VehiculosService.removeRate(rateToDelete.id);
      toast("Tasa eliminada", "success");
      await onRatesChanged();
      setRateToDelete(null);
      setExpandedCompanyId((current) =>
        current === rateToDelete.companyId ? rateToDelete.companyId : current,
      );
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "No se pudo eliminar la tasa",
        "error",
      );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Configuración
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Tasas del Cotizador de Vehículo
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Administra las tasas por compañía, modalidad, tipo de vehículo, origen
            y rango de suma asegurada. Los cambios aquí impactan directamente el
            cálculo del cuadro comparativo.
          </p>
        </div>

        {canCreate ? (
          <button
            type="button"
            onClick={handleCreate}
            className="btn btn-primary inline-flex items-center gap-2 self-start"
          >
            <Plus size={16} />
            Nueva tasa
          </button>
        ) : null}
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Tasas registradas" value={String(rates.length)} />
        <SummaryCard
          label="Compañías configuradas"
          value={String(configuredCompanies)}
        />
        <SummaryCard
          label="Tipos de vehículo cubiertos"
          value={String(configuredTypes)}
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[minmax(0,220px)_1fr]">
          <SelectFilter
            label="Filtrar por modalidad"
            value={modeFilter}
            onChange={(event) =>
              setModeFilter(event.target.value as VehicleComparisonMode | "")
            }
            options={MODE_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
          />
          <div className="flex items-end justify-start md:justify-end">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Mostrando {groupedRates.length} compañía(s) y {filteredRates.length} tasa(s).
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="py-14 text-center text-sm text-slate-400">
              Cargando tasas configuradas...
            </div>
          ) : filteredRates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-14 text-center">
              <p className="text-sm font-medium text-slate-600">
                No hay tasas que coincidan con el filtro actual.
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Ajusta los filtros o registra una nueva tasa para empezar.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                {groupedRates.map((group) => {
                  const vehicleTypes = new Set(
                    group.rates.map((rate) => rate.vehicleType),
                  ).size;
                  const isExpanded = expandedCompanyId === group.companyId;

                  return (
                    <article
                      key={group.companyId}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Compañía
                          </p>
                          <h3 className="mt-2 text-xl font-bold text-slate-900">
                            {VEHICLE_COMPANY_LABELS[group.companyId]}
                          </h3>
                          <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-500">
                            <span className="rounded-full bg-white px-3 py-1">
                              {group.rates.length} tasa(s)
                            </span>
                            <span className="rounded-full bg-white px-3 py-1">
                              {vehicleTypes} tipo(s)
                            </span>
                            <span className="rounded-full bg-white px-3 py-1">
                              {Array.from(new Set(group.rates.map((rate) => rate.mode)))
                                .map(formatModeLabel)
                                .join(", ")}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCompanyId((current) =>
                              current === group.companyId ? null : group.companyId,
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-primary/30 hover:text-primary"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp size={16} />
                              Ocultar tasas
                            </>
                          ) : (
                            <>
                              <ChevronDown size={16} />
                              Ver tasas
                            </>
                          )}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {expandedGroup ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Detalle de tasas
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-slate-900">
                        {VEHICLE_COMPANY_LABELS[expandedGroup.companyId]}
                      </h3>
                    </div>
                    <p className="text-sm text-slate-500">
                      {expandedGroup.rates.length} tasa(s) configuradas.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left">
                      <thead className="bg-white">
                        <tr>
                          {[
                            "Modalidad",
                            "Tipo",
                            "Origen",
                            "Rango",
                            "Tasa",
                            "Actualizado",
                            "Acciones",
                          ].map((header) => (
                            <th
                              key={header}
                              className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {expandedGroup.rates
                          .slice()
                          .sort((left, right) => {
                            const modeSort = left.mode.localeCompare(right.mode);
                            if (modeSort !== 0) return modeSort;

                            const typeSort = VEHICLE_TYPE_LABELS[
                              left.vehicleType
                            ].localeCompare(VEHICLE_TYPE_LABELS[right.vehicleType]);
                            if (typeSort !== 0) return typeSort;

                            return (left.insuredValueMin ?? 0) - (right.insuredValueMin ?? 0);
                          })
                          .map((rate) => (
                            <tr key={rate.id} className="align-top">
                              <td className="px-4 py-4 text-sm text-slate-600">
                                {formatModeLabel(rate.mode)}
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-600">
                                {VEHICLE_TYPE_LABELS[rate.vehicleType]}
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-600">
                                {rate.origin
                                  ? VEHICLE_ORIGIN_LABELS[rate.origin]
                                  : "Todos"}
                              </td>
                              <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                                {formatInsuredRange(rate)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-primary">
                                {formatRatePercent(rate.rate)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                                {formatDate(rate.updatedAt, "dd/MM/yyyy HH:mm")}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  {canEdit ? (
                                    <button
                                      type="button"
                                      onClick={() => handleEdit(rate)}
                                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-primary/30 hover:bg-slate-50 hover:text-primary"
                                    >
                                      <Pencil size={13} />
                                      Editar
                                    </button>
                                  ) : null}
                                  {canDelete ? (
                                    <button
                                      type="button"
                                      onClick={() => setRateToDelete(rate)}
                                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                                    >
                                      <Trash2 size={13} />
                                      Eliminar
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-14 text-center">
                  <p className="text-sm font-medium text-slate-600">
                    Selecciona una compañía para ver sus tasas.
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Usa el botón <span className="font-medium">Ver tasas</span> en
                    cualquiera de las compañías listadas arriba.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <VehicleRateFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingRate(null);
        }}
        onSubmit={handleSubmit}
        initialValue={editingRate}
      />

      <ConfirmDialog
        isOpen={Boolean(rateToDelete)}
        onClose={() => setRateToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar Tasa"
        message={
          rateToDelete
            ? `Se eliminará la tasa de ${VEHICLE_COMPANY_LABELS[rateToDelete.companyId]} para ${VEHICLE_TYPE_LABELS[rateToDelete.vehicleType]}.`
            : ""
        }
        confirmText="Eliminar"
        isDestructive
      />
    </div>
  );
};

const SummaryCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
      {label}
    </p>
    <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
  </div>
);

const SelectFilter = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLSelectElement>;
  options: { value: string; label: string }[];
}) => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
    <select
      value={value}
      onChange={onChange}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
    >
      <option value="">Todos</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

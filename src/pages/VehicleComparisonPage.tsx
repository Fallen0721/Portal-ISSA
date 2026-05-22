import { useEffect, useState } from "react";
import { Car, History, ListChecks } from "lucide-react";
import { NavLink, Navigate, useParams } from "react-router-dom";
import { clsx } from "clsx";
import { VehicleComparisonModule } from "../components/vehiculos/VehicleComparisonModule";
import { VehicleHistorySection } from "../components/vehiculos/VehicleHistorySection";
import { VehicleRatesSection } from "../components/vehiculos/VehicleRatesSection";
import { useToast } from "../hooks/useToast";
import { VehiculosService } from "../services/vehiculos.service";
import {
  VehicleQuoteHistory,
  VehicleRate,
} from "../components/vehiculos/types";

const sections = [
  {
    key: "cotizador",
    label: "Cotizador",
    icon: Car,
    description: "Cuadro comparativo y borrador",
  },
  {
    key: "tasas",
    label: "Tasas",
    icon: ListChecks,
    description: "Tasas por compañía",
  },
  {
    key: "historial",
    label: "Historial",
    icon: History,
    description: "Cotizaciones guardadas y PDFs",
  },
] as const;

type SectionKey = (typeof sections)[number]["key"];

export const VehicleComparisonPage = () => {
  const { section } = useParams<{ section: SectionKey }>();
  const activeSection = sections.find((item) => item.key === section);
  const { toast } = useToast();
  const [rates, setRates] = useState<VehicleRate[]>([]);
  const [history, setHistory] = useState<VehicleQuoteHistory[]>([]);
  const [loadingRates, setLoadingRates] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    void loadRates();
    void loadHistory();
  }, []);

  const loadRates = async () => {
    setLoadingRates(true);

    try {
      setRates(await VehiculosService.getRates());
    } catch (error) {
      setRates([]);
      toast(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las tasas",
        "error",
      );
    } finally {
      setLoadingRates(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);

    try {
      setHistory(await VehiculosService.getHistory());
    } catch (error) {
      setHistory([]);
      toast(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el historial de cotizaciones",
        "error",
      );
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!activeSection) {
    return <Navigate to="/cuadro-vehiculos/cotizador" replace />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Cotizador de Vehículo
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Cálculo del cuadro y mantenimiento de tasas.
            </p>
          </div>

          <nav className="flex flex-wrap gap-3">
            {sections.map((item) => (
              <NavLink
                key={item.key}
                to={`/cuadro-vehiculos/${item.key}`}
                className={({ isActive }) =>
                  clsx(
                    "block min-w-[220px] flex-1 rounded-xl border px-4 py-3 transition-colors",
                    isActive
                      ? "border-primary/20 bg-primary/5"
                      : "border-transparent hover:border-slate-200 hover:bg-slate-50",
                  )
                }
              >
                {({ isActive }) => (
                  <div className="flex items-start gap-3">
                    <div
                      className={clsx(
                        "mt-0.5 rounded-lg p-2",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      <item.icon size={16} />
                    </div>
                    <div>
                      <p
                        className={clsx(
                          "font-medium",
                          isActive ? "text-primary" : "text-slate-800",
                        )}
                      >
                        {item.label}
                      </p>
                      <p className="text-sm text-slate-500">
                        {item.description}
                      </p>
                    </div>
                  </div>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </section>

      <section className="min-w-0">
        {activeSection.key === "cotizador" ? (
          <VehicleComparisonModule
            rates={rates}
            ratesLoading={loadingRates}
            onHistoryChanged={loadHistory}
          />
        ) : activeSection.key === "tasas" ? (
          <VehicleRatesSection
            rates={rates}
            loading={loadingRates}
            onRatesChanged={loadRates}
          />
        ) : (
          <VehicleHistorySection history={history} loading={loadingHistory} />
        )}
      </section>
    </div>
  );
};

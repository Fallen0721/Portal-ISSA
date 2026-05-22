import { Building2, Layers, ListChecks, Network, Package, Target } from "lucide-react";
import { NavLink, Navigate, useParams } from "react-router-dom";
import { clsx } from "clsx";
import { MetasSection } from "./MetasPage";
import { StatusSection } from "../components/options/StatusSection";
import { CatalogSection } from "../components/options/CatalogSection";
import { ProductosService } from "../services/productos.service";
import { CompaniasService } from "../services/companias.service";
import { CanalesService } from "../services/canales.service";
import { RamosService } from "../services/ramos.service";

const sections = [
  {
    key: "metas",
    label: "Metas",
    icon: Target,
    description: "Asignación mensual por vendedor",
  },
  {
    key: "status",
    label: "Status",
    icon: ListChecks,
    description: "Estados para Nueva Gestión",
  },
  {
    key: "productos",
    label: "Productos",
    icon: Package,
    description: "Catálogo de productos de seguro",
  },
  {
    key: "ramos",
    label: "Ramos",
    icon: Layers,
    description: "Ramos de Vida y Salud",
  },
  {
    key: "companias",
    label: "Compañías",
    icon: Building2,
    description: "Compañías aseguradoras",
  },
  {
    key: "canal",
    label: "Canal",
    icon: Network,
    description: "Canales de venta",
  },
] as const;

type SectionKey = (typeof sections)[number]["key"];

export const OpcionesPage = () => {
  const { section } = useParams<{ section: SectionKey }>();
  const activeSection = sections.find((item) => item.key === section);

  if (!activeSection) {
    return <Navigate to="/opciones/metas" replace />;
  }

  const renderSection = () => {
    switch (activeSection.key) {
      case "metas":
        return <MetasSection />;
      case "status":
        return <StatusSection />;
      case "productos":
        return (
          <CatalogSection
            title="Productos"
            description="Configura los productos de seguro disponibles. Asigna un área para que aparezcan en el formulario correspondiente."
            entityLabel="Producto"
            service={ProductosService}
            badgeClassName="bg-blue-100 text-blue-800"
            areaOptions={[
              { value: "comercial", label: "Comercial" },
              { value: "vida", label: "Vida" },
              { value: "salud", label: "Salud" },
              { value: "daños", label: "Daños" },
            ]}
            areaLabels={{ comercial: "Comercial", vida: "Vida", salud: "Salud", "daños": "Daños" }}
          />
        );
      case "ramos":
        return (
          <CatalogSection
            title="Ramos"
            description="Configura los ramos disponibles en los formularios de Vida y Salud."
            entityLabel="Ramo"
            service={RamosService}
            badgeClassName="bg-amber-100 text-amber-800"
          />
        );
      case "companias":
        return (
          <CatalogSection
            title="Compañías"
            description="Configura las compañías aseguradoras disponibles en el formulario de ventas."
            entityLabel="Compañía"
            service={CompaniasService}
            badgeClassName="bg-violet-100 text-violet-800"
          />
        );
      case "canal":
        return (
          <CatalogSection
            title="Canal"
            description="Configura los canales de venta disponibles en el formulario de ventas."
            entityLabel="Canal"
            service={CanalesService}
            badgeClassName="bg-emerald-100 text-emerald-800"
          />
        );
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm h-fit">
        <div className="px-3 pb-4">
          <h2 className="text-2xl font-bold text-slate-800">Opciones</h2>
          <p className="mt-1 text-sm text-slate-500">
            Configuración interna del portal.
          </p>
        </div>

        <nav className="space-y-1">
          {sections.map((item) => (
            <NavLink
              key={item.key}
              to={`/opciones/${item.key}`}
              className={({ isActive }) =>
                clsx(
                  "block rounded-xl border px-4 py-3 transition-colors",
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
                    <p className="text-sm text-slate-500">{item.description}</p>
                  </div>
                </div>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <section className="min-w-0">{renderSection()}</section>
    </div>
  );
};

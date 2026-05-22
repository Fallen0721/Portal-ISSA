import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Calculator,
  Car,
  Shield,
  Target,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ROLE_LABELS } from "../../types/models";
import { useAuth } from "../../hooks/useAuth";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { user } = useAuth();

  if (!user) return null;

  const navItems = [
    {
      to: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["admin", "comercial", "gerente_comercial", "personas"],
    },
    {
      to: "/personas/vida",
      label: "Gestión Personas",
      icon: FileText,
      roles: ["personas"],
    },
    {
      to: "/ventas",
      label: "Gestión Comercial",
      icon: FileText,
      roles: ["admin", "comercial", "gerente_comercial"],
    },
    {
      to: "/cotizador",
      label: "Cotizador de Viaje",
      icon: Calculator,
      roles: ["admin"],
    },
    {
      to: "/cuadro-vehiculos",
      label: "Cotizador de Vehículo",
      icon: Car,
      roles: ["admin", "daños"],
    },
    {
      to: "/opciones",
      label: "Opciones",
      icon: Target,
      roles: ["gerente_comercial"],
    },
    {
      to: "/usuarios",
      label: "Usuarios",
      icon: Shield,
      roles: ["admin"],
    },
  ].filter((item) => item.roles.includes(user.role));

  const sidebarClasses = twMerge(
    "fixed inset-y-0 left-0 z-50 w-64 transform border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out md:static md:translate-x-0",
    isOpen ? "translate-x-0" : "-translate-x-full",
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={sidebarClasses}>
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-6">
          <div className="text-xl font-bold tracking-tight text-primary">
            Portal <span className="text-accent">ISSA</span>
          </div>
          <button onClick={onClose} className="text-slate-500 md:hidden">
            <X size={24} />
          </button>
        </div>

        <nav className="space-y-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => {
                if (window.innerWidth < 768) onClose();
              }}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-r-4 border-accent bg-blue-50 text-primary"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={20}
                    className={isActive ? "text-primary" : "text-slate-400"}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full border-t border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
              {getInitials(user.name)}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

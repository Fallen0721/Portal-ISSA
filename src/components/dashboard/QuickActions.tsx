import { useNavigate } from "react-router-dom";
import { Plus, FileText, Calculator, Car } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

interface QuickAction {
  label: string;
  icon: typeof FileText;
  to: string;
  roles: string[];
}

const ACTIONS: QuickAction[] = [
  {
    label: "Nueva Venta",
    icon: FileText,
    to: "/ventas",
    roles: ["admin", "comercial", "personas", "gerente_comercial"],
  },
  {
    label: "Cotizar Viaje",
    icon: Calculator,
    to: "/cotizador",
    roles: ["admin"],
  },
  {
    label: "Cotizar Vehículo",
    icon: Car,
    to: "/cuadro-vehiculos",
    roles: ["admin", "daños"],
  },
];

export const QuickActions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const visible = ACTIONS.filter((a) => a.roles.includes(user.role));
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((action) => (
        <button
          key={action.to}
          onClick={() => navigate(action.to)}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:border-primary/30 hover:text-primary"
        >
          <Plus size={12} className="text-slate-400" />
          <action.icon size={14} />
          {action.label}
        </button>
      ))}
    </div>
  );
};

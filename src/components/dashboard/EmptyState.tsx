import { LucideIcon, Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  subtitle?: string;
}

export const EmptyState = ({
  icon: Icon = Inbox,
  title = "Sin datos disponibles",
  subtitle = "No se encontraron registros para el periodo seleccionado.",
}: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
    <div className="mb-3 rounded-full bg-slate-100 p-4">
      <Icon size={28} className="text-slate-400" />
    </div>
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
  </div>
);

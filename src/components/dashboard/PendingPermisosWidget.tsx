import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, ArrowRight } from "lucide-react";
import { PermisoLaboral } from "../../types/models";
import { PermisosService } from "../../services/permisos.service";
import { useAuth } from "../../hooks/useAuth";

export const PendingPermisosWidget = () => {
  const { user } = useAuth();
  const [permisos, setPermisos] = useState<PermisoLaboral[]>([]);

  useEffect(() => {
    if (user?.role !== "admin") return;
    PermisosService.getAll().then((all) => {
      const pending = all
        .filter((p) => p.status === "SOLICITADO")
        .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
      setPermisos(pending);
    });
  }, [user]);

  if (user?.role !== "admin" || permisos.length === 0) return null;

  const displayed = permisos.slice(0, 3);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
          <CalendarClock size={16} className="text-accent" />
          Solicitudes Pendientes
        </h3>
        <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-bold text-accent">
          {permisos.length}
        </span>
      </div>

      <div className="space-y-3">
        {displayed.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium text-slate-800">
                {p.empleado}
              </p>
              <p className="text-xs text-slate-500">
                {p.tipo} &middot; {p.fechaInicio} → {p.fechaFin}
              </p>
            </div>
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-yellow-700">
              Pendiente
            </span>
          </div>
        ))}
      </div>

      <Link
        to="/permisos"
        className="mt-4 flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary"
      >
        Ver todas las solicitudes
        <ArrowRight size={14} />
      </Link>
    </div>
  );
};

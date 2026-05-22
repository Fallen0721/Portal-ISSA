import { NavLink, Outlet } from "react-router-dom";
import { Heart, Activity } from "lucide-react";
import { clsx } from "clsx";

const sections = [
  { to: "/personas/vida", label: "Gestión Vida", icon: Heart },
  { to: "/personas/salud", label: "Gestión Salud", icon: Activity },
];

export const PersonasLayout = () => {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm h-fit">
        <div className="px-3 pb-4">
          <h2 className="text-lg font-bold text-slate-800">Gestión Personas</h2>
        </div>

        <nav className="space-y-1">
          {sections.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary/20 bg-primary/5 text-primary"
                    : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={18}
                    className={isActive ? "text-primary" : "text-slate-400"}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
};

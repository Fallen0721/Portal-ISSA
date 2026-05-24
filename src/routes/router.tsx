import { Routes, Route, Navigate } from "react-router-dom";
import { Shell } from "../components/layout/Shell";
import { RequireAuth } from "../components/auth/RequireAuth";
import { DashboardPage } from "../pages/DashboardPage";
import { VentasPage } from "../pages/VentasPage";
import { CotizadorPage } from "../pages/CotizadorPage";
import { LoginPage } from "../pages/LoginPage";
import { UsuariosPage } from "../pages/UsuariosPage";
import { VehicleComparisonPage } from "../pages/VehicleComparisonPage";
import { OpcionesPage } from "../pages/OpcionesPage";
import { PersonasLayout } from "../pages/personas/PersonasLayout";
import { GestionVidaPage } from "../pages/personas/GestionVidaPage";
import { GestionSaludPage } from "../pages/personas/GestionSaludPage";
import { RiesgosGeneralesPage } from "../pages/danos/RiesgosGeneralesPage";
import { useAuth } from "../hooks/useAuth";
import { getDefaultRouteForRole } from "../services/auth.service";

const RoleBasedRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
};

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<Shell />}>
          <Route path="/" element={<RoleBasedRedirect />} />

          <Route
            element={
              <RequireAuth allowedRoles={["admin", "comercial", "gerente_comercial", "personas"]} />
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>

          <Route element={<RequireAuth allowedRoles={["personas", "admin"]} />}>
            <Route path="/personas" element={<PersonasLayout />}>
              <Route index element={<GestionVidaPage />} />
              <Route path="vida" element={<GestionVidaPage />} />
              <Route path="salud" element={<GestionSaludPage />} />
            </Route>
          </Route>

          <Route element={<RequireAuth allowedRoles={["daños", "admin"]} />}>
            <Route path="/danos" element={<RiesgosGeneralesPage />} />
          </Route>

          <Route
            element={
              <RequireAuth
                allowedRoles={["admin", "comercial", "personas", "gerente_comercial"]}
              />
            }
          >
            <Route path="/ventas" element={<VentasPage />} />
          </Route>

          <Route element={<RequireAuth allowedRoles={["admin"]} />}>
            <Route path="/cotizador" element={<CotizadorPage />} />
          </Route>

          <Route element={<RequireAuth allowedRoles={["admin", "daños"]} />}>
            <Route
              path="/cuadro-vehiculos"
              element={<Navigate to="/cuadro-vehiculos/cotizador" replace />}
            />
            <Route
              path="/cuadro-vehiculos/:section"
              element={<VehicleComparisonPage />}
            />
          </Route>

          <Route element={<RequireAuth allowedRoles={["admin"]} />}>
            <Route path="/usuarios" element={<UsuariosPage />} />
          </Route>

          <Route element={<RequireAuth allowedRoles={["gerente_comercial"]} />}>
            <Route path="/metas" element={<Navigate to="/opciones/metas" replace />} />
            <Route path="/opciones" element={<Navigate to="/opciones/metas" replace />} />
            <Route path="/opciones/:section" element={<OpcionesPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

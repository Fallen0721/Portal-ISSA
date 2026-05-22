import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AppRole } from "../../types/models";
import { getDefaultRouteForRole } from "../../services/auth.service";
import { useAuth } from "../../hooks/useAuth";

interface RequireAuthProps {
  allowedRoles?: AppRole[];
}

export const RequireAuth = ({ allowedRoles }: RequireAuthProps) => {
  const { user, initialized } = useAuth();
  const location = useLocation();

  if (!initialized) return null;

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }

  return <Outlet />;
};

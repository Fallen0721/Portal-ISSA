import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppUser, PermissionMap } from "../types/models";
import { AuthService } from "../services/auth.service";

interface AuthContextValue {
  initialized: boolean;
  user: AppUser | null;
  permissions: PermissionMap | null;
  login: (username: string, password: string) => Promise<AppUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [initialized, setInitialized] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setUser(await AuthService.getCurrentUser());
      } catch (error) {
        console.error("No se pudo inicializar la sesión", error);
        setUser(null);
      } finally {
        setInitialized(true);
      }
    })();
  }, []);

  const login = async (username: string, password: string) => {
    const nextUser = await AuthService.login(username, password);
    setUser(nextUser);
    return nextUser;
  };

  const logout = async () => {
    await AuthService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    setUser(await AuthService.getCurrentUser());
  };

  const permissions = useMemo(
    () => (user ? AuthService.getPermissionMap(user.role) : null),
    [user],
  );

  const value = useMemo(
    () => ({
      initialized,
      user,
      permissions,
      login,
      logout,
      refreshUser,
    }),
    [initialized, permissions, user],
  );

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm font-medium text-slate-600 shadow-sm">
          Inicializando portal...
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
};

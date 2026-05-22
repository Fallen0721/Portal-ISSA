import { useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { KeyRound, ShieldCheck } from "lucide-react";
import { InputField } from "../components/forms/FormFields";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { getDefaultRouteForRole } from "../services/auth.service";

export const LoginPage = () => {
  const { user, login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const redirectPath = useMemo(() => {
    return (location.state as { from?: string } | null)?.from ?? null;
  }, [location.state]);

  if (user) {
    return (
      <Navigate to={redirectPath ?? getDefaultRouteForRole(user.role)} replace />
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const nextUser = await login(username, password);
      const defaultRoute = getDefaultRouteForRole(nextUser.role);
      navigate(redirectPath ?? defaultRoute, { replace: true });
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "No se pudo iniciar sesión",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(0,90,167,0.18),_transparent_35%),linear-gradient(135deg,_#eff6ff_0%,_#f8fafc_55%,_#fff7ed_100%)]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12">
        <div className="w-full rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-2xl shadow-slate-200/70 backdrop-blur">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white">
              <KeyRound size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <ShieldCheck size={15} />
                Portal ISSA
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                Iniciar sesión
              </h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField
              label="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
            <InputField
              label="Contraseña"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 py-3 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Validando..." : "Entrar al portal"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

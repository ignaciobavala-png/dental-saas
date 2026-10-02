import { Navigate, Outlet } from "react-router-dom";
import { Loading } from "./ui";
import { useMe, useLogout } from "../lib/queries";
import type { ClinicAccess } from "../lib/api";

const PAUSED_COPY: Record<Exclude<ClinicAccess, "ok">, { title: string; body: string }> = {
  trial_expired: {
    title: "Terminó tu prueba de 30 días",
    body: "Para seguir usando el panel, la landing y la secretaría virtual, coordiná el pago con quien te dio acceso. Tus datos quedan guardados.",
  },
  payment_due: {
    title: "Tu cuenta está suspendida por falta de pago",
    body: "El panel, la landing y la secretaría vuelven a funcionar apenas se registre el pago. Tus datos quedan guardados.",
  },
  suspended: {
    title: "Tu cuenta está suspendida",
    body: "Se reactiva al registrar el pago. Contactá a quien te dio acceso al sistema. Tus datos quedan guardados.",
  },
};

function Checking() {
  return (
    <div className="grid min-h-screen place-items-center">
      <Loading label="Verificando sesión…" />
    </div>
  );
}

export function RequireAuth() {
  const { data, isLoading, error, refetch } = useMe();
  const logout = useLogout();

  if (isLoading) return <Checking />;
  if (error) return <div className="p-10" role="alert">No pudimos verificar tu sesión. <button onClick={() => void refetch()}>Reintentar</button></div>;
  if (!data?.user) return <Navigate to="/login" replace />;

  const clinic = data.memberships[0]?.clinic;
  // El master sin consultorio propio entra directo a su consola.
  if (!clinic && data.user.isPlatformAdmin) return <Navigate to="/plataforma" replace />;

  const access: ClinicAccess = clinic?.access ?? "suspended";
  if (access !== "ok") {
    const copy = PAUSED_COPY[access];
    return (
      <main className="mx-auto max-w-xl p-10">
        <h1 className="text-2xl font-semibold">{clinic ? copy.title : "No tenés un consultorio asignado"}</h1>
        <p className="my-5">{clinic ? copy.body : "Pedile a quien administra el sistema que te invite a un consultorio."}</p>
        <button onClick={() => logout.mutate()} disabled={logout.isPending}>Cerrar sesión</button>
      </main>
    );
  }
  return <Outlet />;
}

export function RequirePlatformAdmin() {
  const { data, isLoading } = useMe();
  if (isLoading) return <Checking />;
  if (!data?.user) return <Navigate to="/login" replace />;
  if (!data.user.isPlatformAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

import { Navigate, Outlet } from "react-router-dom";
import { Loading } from "./ui";
import { useMe, useLogout } from "../lib/queries";

export function RequireAuth() {
  const { data, isLoading, error, refetch } = useMe();
  const logout = useLogout();

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loading label="Verificando sesión…" />
      </div>
    );
  }

  if (error) return <div className="p-10" role="alert">No pudimos verificar tu sesión. <button onClick={() => void refetch()}>Reintentar</button></div>;
  if (!data?.user) return <Navigate to="/login" replace />;

  const clinic = data.memberships[0]?.clinic;
  if (!clinic || clinic.status === 'suspended' || (clinic.status === 'trial' && clinic.trialExpiresAt != null && clinic.trialExpiresAt <= Date.now())) {
    return <main className="mx-auto max-w-xl p-10"><h1 className="text-2xl font-semibold">Tu acceso está pausado</h1><p className="my-5">Contactá a quien te dio acceso al sistema para activar o renovar tu consultorio.</p><button onClick={() => logout.mutate()} disabled={logout.isPending}>Cerrar sesión</button></main>;
  }
  return <Outlet />;
}

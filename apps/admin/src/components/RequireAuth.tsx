import { Navigate, Outlet } from "react-router-dom";
import { Loading } from "./ui";
import { useMe } from "../lib/queries";

export function RequireAuth() {
  const { data, isLoading } = useMe();

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loading label="Verificando sesión…" />
      </div>
    );
  }

  if (!data?.user) return <Navigate to="/login" replace />;

  return <Outlet />;
}

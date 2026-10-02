import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertCircle, LogOut } from "lucide-react";
import { Button, Card, EmptyState, Loading, PageHeader, cn } from "../components/ui";
import { useLogout, useMe, usePlatformAction, usePlatformClinics } from "../lib/queries";
import type { ClinicAccess, PlatformClinicDto } from "../lib/api";

const DAY = 86_400_000;

const ACCESS_LABEL: Record<ClinicAccess, { label: string; tone: string }> = {
  ok: { label: "Habilitado", tone: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  trial_expired: { label: "Prueba vencida", tone: "bg-amber-50 text-amber-900 border-amber-200" },
  payment_due: { label: "Pago vencido", tone: "bg-amber-50 text-amber-900 border-amber-200" },
  suspended: { label: "Suspendido", tone: "bg-red-50 text-red-800 border-red-200" },
};

function formatDate(ms: number | null) {
  if (!ms) return "—";
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(ms));
}

function daysLeft(ms: number | null) {
  if (!ms) return null;
  return Math.ceil((ms - Date.now()) / DAY);
}

function Vencimiento({ clinic }: { clinic: PlatformClinicDto }) {
  const until = clinic.status === "trial" ? clinic.trialExpiresAt : clinic.status === "active" ? clinic.paidUntil : null;
  const left = daysLeft(until);
  const kind = clinic.status === "trial" ? "Prueba" : clinic.status === "active" ? "Pago" : "Suspendido";
  return (
    <div className="text-sm">
      <p className="text-ink">{kind}{until ? ` hasta ${formatDate(until)}` : clinic.status === "active" ? " sin vencimiento" : ""}</p>
      {left !== null ? <p className="text-xs text-muted">{left > 0 ? `Quedan ${left} ${left === 1 ? "día" : "días"}` : `Venció hace ${-left} ${-left === 1 ? "día" : "días"}`}</p> : null}
    </div>
  );
}

function Acciones({ clinic }: { clinic: PlatformClinicDto }) {
  const action = usePlatformAction();
  const busy = action.isPending;
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={busy} onClick={() => action.mutate({ kind: "payment", clinicId: clinic.id, periods: 1 })}>
        Registrar pago (30 días)
      </Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => action.mutate({ kind: "trial", clinicId: clinic.id, days: 7 })}>
        +7 días de prueba
      </Button>
      {clinic.status !== "suspended" ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          className="text-error"
          onClick={() => {
            if (window.confirm(`¿Suspender ${clinic.name}? Se bloquean el panel, la landing y la secretaría hasta registrar un pago.`)) {
              action.mutate({ kind: "suspend", clinicId: clinic.id });
            }
          }}
        >
          Suspender
        </Button>
      ) : null}
      {action.error ? <p className="flex w-full items-center gap-1 text-xs text-error"><AlertCircle size={12} />{action.error.message}</p> : null}
    </div>
  );
}

export function Plataforma() {
  const { data: me } = useMe();
  const { data: clinics, isLoading, error } = usePlatformClinics();
  const logout = useLogout();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"todos" | "bloqueados">("todos");
  const hasClinic = Boolean(me?.memberships[0]?.clinic);

  const rows = (clinics ?? []).filter((c) => filter === "todos" || c.access !== "ok");
  const blocked = (clinics ?? []).filter((c) => c.access !== "ok").length;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex h-16 items-center gap-3 border-b border-line bg-panel px-4 lg:px-8">
        <span className="grid size-9 place-items-center rounded-lg bg-accent text-base font-bold text-white">E</span>
        <div className="leading-tight">
          <p className="font-display text-sm font-bold">Plataforma</p>
          <p className="text-xs text-muted">{me?.user?.email}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {hasClinic ? <Link to="/" className="rounded-lg px-3 py-2 text-sm text-body hover:bg-soft">Ir al consultorio</Link> : null}
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              await logout.mutateAsync();
              navigate("/login", { replace: true });
            }}
          >
            <LogOut size={16} /> Salir
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
        <PageHeader
          title="Consultorios"
          subtitle="Prueba de 30 días. Al vencer, el consultorio queda bloqueado hasta que registres un pago."
          actions={
            <div className="inline-flex rounded-full border border-line bg-soft p-1 text-sm">
              {(["todos", "bloqueados"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={cn("rounded-full px-3 py-1 font-medium", filter === key ? "bg-panel text-ink shadow-sm" : "text-muted")}
                >
                  {key === "todos" ? `Todos (${clinics?.length ?? 0})` : `Bloqueados (${blocked})`}
                </button>
              ))}
            </div>
          }
        />

        {isLoading ? <Loading /> : null}
        {error ? <p className="text-sm text-error" role="alert">{error.message}</p> : null}
        {clinics && rows.length === 0 ? <EmptyState title="No hay consultorios en esta vista." /> : null}

        <div className="space-y-3">
          {rows.map((clinic) => (
            <Card key={clinic.id} className="grid gap-4 p-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.6fr)] md:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold text-ink">{clinic.name}</p>
                  <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", ACCESS_LABEL[clinic.access].tone)}>
                    {ACCESS_LABEL[clinic.access].label}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-muted">
                  {clinic.ownerName ?? "Sin dueño"} · {clinic.ownerEmail ?? "—"} · alta {formatDate(clinic.createdAt)}
                </p>
              </div>
              <Vencimiento clinic={clinic} />
              <Acciones clinic={clinic} />
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

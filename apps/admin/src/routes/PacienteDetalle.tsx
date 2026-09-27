import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarPlus, Pencil } from "lucide-react";
import { Odontogram } from "react-odontogram";
import "react-odontogram/style.css";
import type { TreatmentPlanStatus } from "@dental/contracts";
import { Avatar, Button, Card, EmptyState, Loading, StatusPill, cn } from "../components/ui";
import { usePatient } from "../lib/queries";
import {
  ageFromBirthdate,
  formatLongDate,
  formatMoney,
  formatShortDate,
  formatTimeRange,
} from "../lib/format";
import { doctorName, serviceName } from "../lib/mock";

type Tab = "resumen" | "odontograma" | "plan" | "evolucion" | "turnos";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "resumen", label: "Resumen" },
  { id: "odontograma", label: "Odontograma" },
  { id: "plan", label: "Plan de tratamiento" },
  { id: "evolucion", label: "Evolución" },
  { id: "turnos", label: "Turnos" },
];

const CONDITION_META: Record<string, { label: string; fill: string; outline: string }> = {
  caries: { label: "Caries", fill: "#fde3e6", outline: "#be123c" },
  restoration: { label: "Restauración", fill: "#e3edfd", outline: "#1d4ed8" },
  crown: { label: "Corona", fill: "#fbeed6", outline: "#b45309" },
  missing: { label: "Ausente", fill: "#eef0f2", outline: "#6b7280" },
  implant: { label: "Implante", fill: "#f0e9fd", outline: "#6d28d9" },
  endo: { label: "Endodoncia", fill: "#fdeade", outline: "#c2410c" },
};

const PLAN_STYLE: Record<TreatmentPlanStatus, { bg: string; fg: string; label: string }> = {
  planned: { bg: "#f3f4f6", fg: "#4b5563", label: "Planeado" },
  accepted: { bg: "#fdeee0", fg: "#b45309", label: "Aceptado" },
  completed: { bg: "#e7f7f0", fg: "#0b6b4f", label: "Completado" },
  declined: { bg: "#fdeaf3", fg: "#be185d", label: "Rechazado" },
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-sm">{value}</p>
    </div>
  );
}

export function PacienteDetalle() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const rawTab = params.get("tab") as Tab | null;
  const tab: Tab = TABS.some((t) => t.id === rawTab) ? (rawTab as Tab) : "resumen";
  const setTab = (next: Tab) => setParams(next === "resumen" ? {} : { tab: next }, { replace: true });
  const { data, isLoading } = usePatient(id);

  if (isLoading) return <Loading />;
  if (!data?.patient) {
    return (
      <div>
        <EmptyState title="No encontramos ese paciente" hint="Volvé al listado para elegir otro." />
        <div className="mt-4">
          <Link to="/pacientes" className="text-sm text-accent hover:underline">
            ← Volver a pacientes
          </Link>
        </div>
      </div>
    );
  }

  const p = data.patient;
  const age = ageFromBirthdate(p.birthdate);
  const now = Date.now();
  const next = data.appointments
    .filter((a) => a.kind === "patient" && a.startsAt >= now && a.status !== "cancelled")
    .sort((a, b) => a.startsAt - b.startsAt)[0];

  const groups = Object.entries(
    data.conditions.reduce<Record<string, string[]>>((acc, c) => {
      (acc[c.condition] ??= []).push(c.tooth);
      return acc;
    }, {}),
  ).map(([condition, teeth]) => ({
    condition,
    teeth: [...new Set(teeth)],
    ...(CONDITION_META[condition] ?? CONDITION_META.caries),
  }));

  const planTotal = data.plan.reduce((acc, t) => acc + t.feeCents, 0);
  const planDone = data.plan.filter((t) => t.status === "completed").length;

  return (
    <div>
      <Link to="/pacientes" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={16} /> Pacientes
      </Link>

      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={p.fullName} size={56} />
            <div>
              <h1 className="font-display text-2xl font-bold">{p.fullName}</h1>
              <p className="mt-1 text-sm text-muted">
                {age === null ? "Edad sin dato" : `${age} años`}
                {p.document ? ` · DNI ${p.document}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Pencil size={16} /> Editar
            </Button>
            <Button size="sm">
              <CalendarPlus size={16} /> Nuevo turno
            </Button>
          </div>
        </div>
      </Card>

      <div className="mb-6 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t.id ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "resumen" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold">Datos de contacto</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Teléfono" value={p.phone ?? "—"} />
              <Field label="Email" value={p.email ?? "—"} />
              <Field label="Documento" value={p.document ?? "—"} />
              <Field label="Nacimiento" value={p.birthdate ?? "—"} />
            </div>
            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Notas</p>
              <p className="mt-1 text-sm">{p.notes ?? "Sin observaciones."}</p>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold">Próximo turno</h2>
              {next ? (
                <div>
                  <p className="font-display text-lg font-bold capitalize">{formatShortDate(next.startsAt)}</p>
                  <p className="text-sm text-muted">{formatTimeRange(next.startsAt, next.endsAt)}</p>
                  <p className="mt-2 text-sm">{serviceName(next.serviceId)}</p>
                  <p className="text-xs text-muted">{doctorName(next.doctorId)}</p>
                </div>
              ) : (
                <p className="text-sm text-muted">Sin turnos agendados.</p>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold">Plan de tratamiento</h2>
              <p className="font-display text-2xl font-bold">
                {planDone}/{data.plan.length}
              </p>
              <p className="text-xs text-muted">procedimientos completados</p>
              <p className="mt-3 text-sm">
                Presupuesto: <span className="font-medium">{formatMoney(planTotal)}</span>
              </p>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === "odontograma" ? (
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {groups.map((g) => (
              <span key={g.condition} className="inline-flex items-center gap-1.5 text-xs text-muted">
                <span className="size-3 rounded-full" style={{ backgroundColor: g.fill, border: `1.5px solid ${g.outline}` }} />
                {g.label}
              </span>
            ))}
          </div>
          <div className="mx-auto max-w-2xl">
            <Odontogram
              notation="FDI"
              layout="square"
              showHalf="full"
              readOnly
              showTooltip
              defaultSelected={[]}
              teethConditions={groups.map((g) => ({
                label: g.label,
                teeth: g.teeth.map((t) => `teeth-${t}`),
                fillColor: g.fill,
                outlineColor: g.outline,
              }))}
            />
          </div>
          {groups.length === 0 ? (
            <p className="mt-4 text-center text-sm text-muted">Sin hallazgos registrados.</p>
          ) : (
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {groups.map((g) => (
                <li key={g.condition} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                  <span>{g.label}</span>
                  <span className="text-muted tabular-nums">{g.teeth.join(", ")}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {tab === "plan" ? (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[2fr_0.7fr_0.9fr_0.9fr] gap-3 border-b border-line px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted sm:grid">
            <span>Tratamiento</span>
            <span>Pieza</span>
            <span>Honorario</span>
            <span>Estado</span>
          </div>
          {data.plan.length === 0 ? (
            <div className="p-4">
              <EmptyState title="Sin plan cargado" />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {data.plan.map((t) => {
                const style = PLAN_STYLE[t.status];
                return (
                  <li key={t.id} className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[2fr_0.7fr_0.9fr_0.9fr] sm:items-center sm:gap-3">
                    <div>
                      <p className="text-sm font-medium">{serviceName(t.serviceId)}</p>
                      {t.notes ? <p className="text-xs text-muted">{t.notes}</p> : null}
                    </div>
                    <span className="text-sm text-muted">{t.tooth ?? "—"}{t.surface ? ` · ${t.surface}` : ""}</span>
                    <span className="text-sm tabular-nums">{formatMoney(t.feeCents)}</span>
                    <span>
                      <span
                        className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{ backgroundColor: style.bg, color: style.fg }}
                      >
                        {style.label}
                      </span>
                    </span>
                  </li>
                );
              })}
              <li className="flex items-center justify-between px-4 py-3 text-sm font-medium">
                <span>Total presupuestado</span>
                <span className="tabular-nums">{formatMoney(planTotal)}</span>
              </li>
            </ul>
          )}
        </Card>
      ) : null}

      {tab === "evolucion" ? (
        <div className="space-y-4">
          {data.notes.length === 0 ? (
            <EmptyState title="Sin notas de evolución" />
          ) : (
            data.notes.map((n) => (
              <Card key={n.id} className="p-5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold capitalize">{formatLongDate(n.noteDate)}</p>
                  <p className="text-xs text-muted">{doctorName(n.doctorId)}</p>
                </div>
                <p className="text-sm leading-relaxed">{n.body}</p>
              </Card>
            ))
          )}
        </div>
      ) : null}

      {tab === "turnos" ? (
        <Card className="overflow-hidden">
          {data.appointments.length === 0 ? (
            <div className="p-4">
              <EmptyState title="Sin turnos" />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {data.appointments.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="w-28 shrink-0">
                    <p className="text-sm capitalize">{formatShortDate(a.startsAt)}</p>
                    <p className="text-xs text-muted tabular-nums">{formatTimeRange(a.startsAt, a.endsAt)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{serviceName(a.serviceId)}</p>
                    <p className="truncate text-xs text-muted">{doctorName(a.doctorId)}</p>
                  </div>
                  <StatusPill status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}
    </div>
  );
}

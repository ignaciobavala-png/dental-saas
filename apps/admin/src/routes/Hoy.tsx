import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, CalendarPlus, Clock, Sparkles, UserPlus } from "lucide-react";
import { Avatar, Button, Card, EmptyState, Loading, PageHeader, StatusPill, ToneChip } from "../components/ui";
import { AppointmentForm, Modal, PatientForm } from "../components/forms";
import {
  useAiInquiries,
  useAppointments,
  useCreateAppointment,
  useCreatePatient,
  useDaySummary,
  useDirectory,
  useDoctors,
  usePatients,
  useRecalls,
  useServices,
  useWaitingList,
} from "../lib/queries";
import { formatMoney, formatTime, startOfToday } from "../lib/format";

function Stat({
  label,
  value,
  hint,
  tone = "#34d399",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <Card variant="filled" className="p-4">
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full" style={{ backgroundColor: tone }} />
        <p className="text-xs font-medium text-muted">{label}</p>
      </div>
      <p className="mt-3 font-display text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}

export function Hoy() {
  const today = startOfToday();
  const summary = useDaySummary(today);
  const appts = useAppointments(today);
  const doctors = useDoctors();
  const recalls = useRecalls();
  const waiting = useWaitingList();
  const inquiries = useAiInquiries();
  const { patientName, serviceName } = useDirectory();
  const patients = usePatients();
  const services = useServices();
  const createAppointment = useCreateAppointment();
  const createPatient = useCreatePatient();
  const [modal, setModal] = useState<"none" | "appt" | "patient">("none");

  const doctorName = (id: string | null) => doctors.data?.find((d) => d.id === id)?.name ?? "—";
  const now = Date.now();
  const upcoming = (appts.data ?? [])
    .filter((a) => a.kind === "patient" && (a.status === "pending" || a.status === "confirmed"))
    .filter((a) => a.startsAt >= now)
    .slice(0, 6);
  const upcomingFallback = upcoming.length
    ? upcoming
    : (appts.data ?? []).filter((a) => a.kind === "patient").slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Hoy"
        subtitle="Turnos, consultas nuevas y pendientes del consultorio"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setModal("patient")}>
              <UserPlus size={16} /> Paciente
            </Button>
            <Button size="sm" onClick={() => setModal("appt")}>
              <CalendarPlus size={16} /> Nuevo turno
            </Button>
          </>
        }
      />

      {summary.isLoading ? (
        <Loading />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Turnos hoy"
            value={String(summary.data?.total ?? 0)}
            hint={`${summary.data?.confirmed ?? 0} confirmados · ${summary.data?.pending ?? 0} a confirmar`}
          />
          <Stat
            label="Atendidos"
            value={String(summary.data?.completed ?? 0)}
            hint={`${summary.data?.noShow ?? 0} ausencias`}
            tone="#f59e0b"
          />
          <Stat
            label="Facturado"
            value={formatMoney(summary.data?.billedCents ?? 0)}
            hint={`Agenda del día: ${formatMoney(summary.data?.scheduledCents ?? 0)}`}
            tone="#3b82f6"
          />
          <Stat
            label="Pendientes"
            value={String((summary.data?.openRecalls ?? 0) + (summary.data?.waiting ?? 0))}
            hint={`${summary.data?.openRecalls ?? 0} recalls · ${summary.data?.waiting ?? 0} en espera`}
            tone="#ec4899"
          />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="min-w-0 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Próximos turnos</h2>
            <Link to="/agenda" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
              Ver agenda <ArrowRight size={14} />
            </Link>
          </div>
          <Card className="divide-y divide-line">
            {appts.isLoading ? (
              <Loading />
            ) : upcomingFallback.length === 0 ? (
              <div className="p-4">
                <EmptyState title="No quedan turnos por delante" hint="La agenda del día está completa." />
              </div>
            ) : (
              upcomingFallback.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-4">
                  <div className="w-14 shrink-0 text-center">
                    <p className="font-display text-lg font-bold leading-none">{formatTime(a.startsAt)}</p>
                    <p className="mt-1 text-xs text-muted">{formatTime(a.endsAt)}</p>
                  </div>
                  <Avatar name={patientName(a.patientId)} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{patientName(a.patientId)}</p>
                    <p className="truncate text-xs text-muted">
                      {serviceName(a.serviceId)} · {doctorName(a.doctorId)}
                    </p>
                  </div>
                  <div className="hidden shrink-0 items-center gap-2 sm:flex">
                    {a.source === "ai" ? <ToneChip color="violet">IA</ToneChip> : null}
                    <StatusPill status={a.status} />
                  </div>
                </div>
              ))
            )}
          </Card>
        </section>

        <div className="min-w-0 space-y-6">
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock size={16} className="text-accent" />
              <h2 className="text-sm font-semibold">Recalls abiertos</h2>
            </div>
            <ul className="space-y-3">
              {(recalls.data ?? []).slice(0, 4).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{patientName(r.patientId)}</p>
                    <p className="truncate text-xs text-muted">{serviceName(r.serviceId)}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">{r.dueAfter}</span>
                </li>
              ))}
              {recalls.data?.length === 0 ? <EmptyState title="Sin recalls" /> : null}
            </ul>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-accent" />
              <h2 className="text-sm font-semibold">Consultas de la secretaría IA</h2>
            </div>
            <ul className="space-y-3">
              {(inquiries.data ?? []).map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{i.patientName}</p>
                    <p className="truncate text-xs text-muted">{i.topic}</p>
                  </div>
                  <ToneChip color={i.status === "new" ? "amber" : "accent"}>
                    {i.status === "new" ? "Nueva" : "Contactada"}
                  </ToneChip>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <BadgeCheck size={16} className="text-accent" />
              <h2 className="text-sm font-semibold">Lista de espera</h2>
            </div>
            <ul className="space-y-3">
              {(waiting.data ?? []).map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{patientName(w.patientId)}</p>
                    <p className="truncate text-xs text-muted">{serviceName(w.serviceId)}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">{w.durationMin} min</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
      <Modal open={modal === "patient"} onClose={() => setModal("none")} title="Nuevo paciente">
        <PatientForm
          pending={createPatient.isPending}
          onCancel={() => setModal("none")}
          onSubmit={(values) =>
            createPatient.mutate(
              { full_name: values.full_name, phone: values.phone, email: values.email, document: values.document, birthdate: values.birthdate, notes: values.notes },
              { onSuccess: () => setModal("none") },
            )
          }
        />
      </Modal>

      <Modal open={modal === "appt"} onClose={() => setModal("none")} title="Nuevo turno">
        <AppointmentForm
          patients={patients.data ?? []}
          services={services.data ?? []}
          doctors={doctors.data ?? []}
          pending={createAppointment.isPending}
          onCancel={() => setModal("none")}
          onSubmit={(values) => createAppointment.mutate(values, { onSuccess: () => setModal("none") })}
        />
      </Modal>
    </div>
  );
}

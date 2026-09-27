import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Appointment } from "@dental/contracts";
import { Button, Card, Loading, PageHeader, Segmented, StatusPill, cn, toneStyle } from "../components/ui";
import { useAppointments, useDoctors, useServices, useWeekAppointments } from "../lib/queries";
import {
  addDays,
  dateKey,
  formatShortDate,
  formatTime,
  formatTimeRange,
  minutesSinceMidnight,
  startOfToday,
  startOfWeek,
} from "../lib/format";
import { patientName, serviceName } from "../lib/mock";

const DAY_MIN = 8 * 60;
const DAY_MAX = 19 * 60;
const PX_PER_MIN = 1.15;
const GRID_HEIGHT = (DAY_MAX - DAY_MIN) * PX_PER_MIN;
const HOURS = Array.from({ length: (DAY_MAX - DAY_MIN) / 60 + 1 }, (_, i) => DAY_MIN / 60 + i);

function patientAppointments(list: Appointment[]): Appointment[] {
  return list.filter((a) => a.kind === "patient");
}

function DayColumn({
  appointments,
  nowMs,
  isToday,
  serviceColor,
}: {
  appointments: Appointment[];
  nowMs: number;
  isToday: boolean;
  serviceColor: (id: string | null) => string;
}) {
  const nowTop = (minutesSinceMidnight(nowMs) - DAY_MIN) * PX_PER_MIN;

  return (
    <div className="relative flex-1 border-l border-line" style={{ height: GRID_HEIGHT }}>
      {appointments.map((a) => {
        if (a.kind !== "patient") {
          return (
            <div
              key={a.id}
              className="absolute inset-x-1 overflow-hidden rounded-md border border-dashed border-line bg-[repeating-linear-gradient(45deg,#e9ecef_0,#e9ecef_6px,#f8f9fa_6px,#f8f9fa_12px)] px-2 py-1 text-[11px] text-muted"
              style={{
                top: (minutesSinceMidnight(a.startsAt) - DAY_MIN) * PX_PER_MIN,
                height: Math.max(16, ((a.endsAt - a.startsAt) / 60_000) * PX_PER_MIN),
              }}
            >
              {a.kind === "lunch" ? "Almuerzo" : a.kind === "break" ? "Descanso" : "Bloqueo"}
            </div>
          );
        }
        const tone = toneStyle(serviceColor(a.serviceId));
        const height = Math.max(20, ((a.endsAt - a.startsAt) / 60_000) * PX_PER_MIN);
        const dim = a.status === "cancelled" || a.status === "no_show";
        return (
          <div
            key={a.id}
            className={cn(
              "absolute inset-x-1 overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-xs shadow-sm",
              dim && "opacity-55",
            )}
            style={{
              top: (minutesSinceMidnight(a.startsAt) - DAY_MIN) * PX_PER_MIN,
              height,
              backgroundColor: tone.bg,
              color: tone.fg,
              borderLeftColor: tone.fg,
            }}
            title={`${formatTimeRange(a.startsAt, a.endsAt)} · ${patientName(a.patientId)}`}
          >
            <p className="truncate font-semibold">{patientName(a.patientId)}</p>
            {height > 34 ? <p className="truncate text-[11px] opacity-80">{serviceName(a.serviceId)}</p> : null}
          </div>
        );
      })}
      {isToday && nowTop >= 0 && nowTop <= GRID_HEIGHT ? (
        <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: nowTop }}>
          <div className="h-0.5 bg-accent" />
          <span className="absolute -top-2 left-0 rounded bg-accent px-1 text-[10px] font-medium text-bone">
            ahora
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function Agenda() {
  const [view, setView] = useState<"day" | "week">("day");
  const [dayMs, setDayMs] = useState(startOfToday());
  const doctors = useDoctors();
  const services = useServices();
  const dayAppts = useAppointments(dayMs);
  const weekStart = startOfWeek(dayMs);
  const weekAppts = useWeekAppointments(weekStart);

  const serviceColor = (id: string | null) => services.data?.find((s) => s.id === id)?.color ?? "accent";
  const nowMs = Date.now();
  const isToday = dateKey(dayMs) === dateKey(nowMs);

  const byDoctor = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const d of doctors.data ?? []) map.set(d.id, []);
    for (const a of patientAppointments(dayAppts.data ?? []).concat((dayAppts.data ?? []).filter((a) => a.kind !== "patient"))) {
      if (a.doctorId && map.has(a.doctorId)) map.get(a.doctorId)!.push(a);
    }
    return map;
  }, [doctors.data, dayAppts.data]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle={`${(dayAppts.data ?? []).filter((a) => a.kind === "patient").length} turnos · ${formatShortDate(dayMs)}`}
        actions={
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: "day", label: "Día" },
              { value: "week", label: "Semana" },
            ]}
          />
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setDayMs((d) => addDays(d, view === "week" ? -7 : -1))}>
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDayMs(startOfToday())}
          >
            Hoy
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDayMs((d) => addDays(d, view === "week" ? 7 : 1))}>
            <ChevronRight size={16} />
          </Button>
        </div>
        <p className="text-sm font-medium">
          {view === "day"
            ? formatShortDate(dayMs)
            : `${formatShortDate(weekStart)} — ${formatShortDate(addDays(weekStart, 6))}`}
        </p>
        {isToday ? <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">Hoy</span> : null}
      </div>

      {doctors.isLoading || dayAppts.isLoading ? (
        <Loading />
      ) : view === "day" ? (
        <Card className="overflow-x-auto p-0">
          <div className="min-w-[720px]">
            <div className="flex border-b border-line">
              <div className="w-16 shrink-0" />
              {(doctors.data ?? []).map((d) => (
                <div key={d.id} className="flex-1 border-l border-line px-3 py-3 text-center">
                  <p className="text-sm font-semibold">{d.name}</p>
                  <p className="text-xs text-muted">{d.specialty}</p>
                </div>
              ))}
            </div>
            <div className="flex">
              <div className="relative w-16 shrink-0" style={{ height: GRID_HEIGHT }}>
                {HOURS.map((h) => (
                  <span
                    key={h}
                    className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-muted"
                    style={{ top: (h * 60 - DAY_MIN) * PX_PER_MIN }}
                  >
                    {String(h).padStart(2, "0")}:00
                  </span>
                ))}
              </div>
              {(doctors.data ?? []).map((d) => (
                <DayColumn
                  key={d.id}
                  appointments={byDoctor.get(d.id) ?? []}
                  nowMs={nowMs}
                  isToday={isToday}
                  serviceColor={serviceColor}
                />
              ))}
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {weekDays.map((d) => {
            const items = patientAppointments(weekAppts.data ?? []).filter(
              (a) => dateKey(a.startsAt) === dateKey(d),
            );
            const isCurrent = dateKey(d) === dateKey(nowMs);
            return (
              <Card key={d} className={cn("p-3", isCurrent && "ring-2 ring-accent")}>
                <p className={cn("text-xs font-semibold capitalize", isCurrent ? "text-accent" : "text-muted")}>
                  {formatShortDate(d)}
                </p>
                <div className="mt-2 space-y-2">
                  {items.length === 0 ? (
                    <p className="text-xs text-muted">Sin turnos</p>
                  ) : (
                    items.map((a) => {
                      const tone = toneStyle(serviceColor(a.serviceId));
                      return (
                        <div
                          key={a.id}
                          className="rounded-lg border-l-[3px] px-2 py-1.5 text-xs"
                          style={{ backgroundColor: tone.bg, color: tone.fg, borderLeftColor: tone.fg }}
                        >
                          <p className="font-medium tabular-nums">{formatTime(a.startsAt)}</p>
                          <p className="truncate">{patientName(a.patientId)}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-line bg-card" /> Turno de paciente
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-dashed border-line bg-[repeating-linear-gradient(45deg,#e9ecef_0,#e9ecef_4px,#f8f9fa_4px,#f8f9fa_8px)]" />
          Bloqueo / almuerzo
        </span>
        <StatusPill status="pending" />
        <StatusPill status="confirmed" />
        <StatusPill status="no_show" />
      </div>
    </div>
  );
}

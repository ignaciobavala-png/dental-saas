import { useState } from "react";
import type { ClinicSettings } from "@dental/contracts";
import { Button, Card, Loading, PageHeader } from "../components/ui";
import { useSaveSettings, useSettings } from "../lib/queries";
import { minutesToTime, weekdayLabel } from "../lib/format";

function parseTime(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function SettingsForm({
  initial,
  pending,
  saved,
  onSubmit,
}: {
  initial: ClinicSettings;
  pending: boolean;
  saved: boolean;
  onSubmit: (settings: ClinicSettings) => void;
}) {
  const [form, setForm] = useState(initial);

  const updateContact = (key: keyof ClinicSettings["contact"], value: string) =>
    setForm((f) => ({ ...f, contact: { ...f.contact, [key]: value } }));

  const updateHour = (weekday: number, key: "openMin" | "closeMin", value: string) =>
    setForm((f) => ({
      ...f,
      openingHours: f.openingHours.map((h) => (h.weekday === weekday ? { ...h, [key]: parseTime(value) } : h)),
    }));

  const hoursByWeekday = new Map(form.openingHours.map((h) => [h.weekday, h]));

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold">Datos del consultorio</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(
            [
              ["phone", "Teléfono"],
              ["whatsapp", "WhatsApp"],
              ["email", "Email"],
              ["address", "Dirección"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
              <input
                value={form.contact[key] ?? ""}
                onChange={(e) => updateContact(key, e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold">Horarios de atención</h2>
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, weekday) => {
            const h = hoursByWeekday.get(weekday);
            return (
              <div key={weekday} className="flex items-center gap-3">
                <span className="w-12 text-sm capitalize text-muted">{weekdayLabel(weekday)}</span>
                {h ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={minutesToTime(h.openMin)}
                      onChange={(e) => updateHour(weekday, "openMin", e.target.value)}
                      className="rounded-lg border border-line bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent"
                    />
                    <span className="text-muted">a</span>
                    <input
                      type="time"
                      value={minutesToTime(h.closeMin)}
                      onChange={(e) => updateHour(weekday, "closeMin", e.target.value)}
                      className="rounded-lg border border-line bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted">Cerrado</span>
                )}
              </div>
            );
          })}
        </div>
        <label className="mt-5 block max-w-[12rem]">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Duración del slot (min)</span>
          <input
            type="number"
            min={5}
            step={5}
            value={form.slotMinutes}
            onChange={(e) => setForm((f) => ({ ...f, slotMinutes: Number(e.target.value) }))}
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
        {saved ? <span className="text-sm text-accent">Cambios guardados.</span> : null}
      </div>
    </form>
  );
}

export function Configuracion() {
  const settings = useSettings();
  const save = useSaveSettings();
  const [saved, setSaved] = useState(false);

  return (
    <div>
      <PageHeader title="Configuración" subtitle="Datos de la clínica, contacto y horarios" />
      {settings.isLoading || !settings.data ? (
        <Loading />
      ) : (
        <SettingsForm
          initial={settings.data}
          pending={save.isPending}
          saved={saved}
          onSubmit={(form) =>
            save.mutate(form, {
              onSuccess: () => {
                setSaved(true);
                setTimeout(() => setSaved(false), 2500);
              },
            })
          }
        />
      )}
    </div>
  );
}

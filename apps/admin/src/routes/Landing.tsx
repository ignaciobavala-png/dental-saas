import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Card, Loading, PageHeader, cn } from "../components/ui";
import { useMe, useClinicSettings, useSaveClinicSettings } from "../lib/queries";

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

type Hours = { weekday: number; open: string; close: string; enabled: boolean };
type Faq = { q: string; a: string };
type Testimonial = { name: string; text: string };

type FormState = {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  hours: Hours[];
  obrasSociales: string;
  faqs: Faq[];
  testimonials: Testimonial[];
};

function minutesToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + (m || 0);
}

function defaultForm(): FormState {
  return {
    name: "",
    tagline: "",
    address: "",
    phone: "",
    whatsapp: "",
    email: "",
    hours: WEEKDAYS.map((_, weekday) => ({ weekday, open: "09:00", close: "19:00", enabled: false })),
    obrasSociales: "",
    faqs: [],
    testimonials: [],
  };
}

function fromContent(content: Record<string, unknown> | null): FormState {
  const base = defaultForm();
  if (!content) return base;
  const c = content as Record<string, unknown>;
  const openingHours = (c.openingHours as Array<{ weekday: number; openMin: number; closeMin: number }>) ?? [];
  const hours = base.hours.map((h) => {
    const found = openingHours.find((o) => o.weekday === h.weekday);
    return found
      ? { weekday: h.weekday, open: minutesToTime(found.openMin), close: minutesToTime(found.closeMin), enabled: true }
      : h;
  });
  return {
    name: (c.name as string) ?? "",
    tagline: (c.tagline as string) ?? "",
    address: (c.address as string) ?? "",
    phone: (c.phone as string) ?? "",
    whatsapp: (c.whatsapp as string) ?? "",
    email: (c.email as string) ?? "",
    hours,
    obrasSociales: ((c.obrasSociales as string[]) ?? []).join(", "),
    faqs: (c.faqs as Faq[]) ?? [],
    testimonials: (c.testimonials as Testimonial[]) ?? [],
  };
}

function toContent(form: FormState): Record<string, unknown> {
  return {
    name: form.name,
    tagline: form.tagline || undefined,
    address: form.address || undefined,
    phone: form.phone || undefined,
    whatsapp: form.whatsapp || undefined,
    email: form.email || undefined,
    openingHours: form.hours
      .filter((h) => h.enabled)
      .map((h) => ({ weekday: h.weekday, openMin: timeToMinutes(h.open), closeMin: timeToMinutes(h.close) })),

    obrasSociales: form.obrasSociales
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    faqs: form.faqs.filter((f) => f.q.trim() && f.a.trim()),
    testimonials: form.testimonials.filter((t) => t.name.trim() && t.text.trim()),
  };
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink">{label}</span>
      <input
        {...props}
        className="h-10 w-full rounded-lg border border-line bg-panel px-3 text-sm outline-none placeholder:text-muted focus:border-accent"
      />
    </label>
  );
}

export function Landing() {
  const { data, isLoading } = useClinicSettings();
  const save = useSaveClinicSettings();
  const me = useMe();
  const publicUrl = me.data?.memberships[0]?.clinic?.publicUrl;
  const [form, setForm] = useState<FormState>(defaultForm());
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (data) setForm(fromContent(data.content));
  }, [data]);

  if (isLoading) return <Loading label="Cargando tu landing…" />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavedAt(null);
    try { await save.mutateAsync({ content: { ...data?.content, ...toContent(form) } }); } catch { return; }
    setSavedAt(Date.now());
  }

  function updateHour(weekday: number, patch: Partial<Hours>) {
    setForm((f) => ({
      ...f,
      hours: f.hours.map((h) => (h.weekday === weekday ? { ...h, ...patch } : h)),
    }));
  }

  return (
    <div>
      <PageHeader
        title="Landing"
        subtitle="Lo que ve un paciente en tu web pública: contacto, horarios, obras sociales, preguntas frecuentes y opiniones."
        actions={
          <Button type="submit" form="landing-form" disabled={save.isPending}>
            {save.isPending ? "Guardando…" : "Guardar y publicar"}
          </Button>
        }
      />

      {publicUrl ? <a className="mb-5 inline-block text-sm font-semibold text-accent underline" href={publicUrl} target="_blank" rel="noreferrer">Abrir la web de mi consultorio ↗</a> : <p className="mb-5 text-sm text-muted">El enlace público estará disponible cuando se configure el despliegue.</p>}
      {savedAt ? (
        <p className="mb-4 rounded-lg bg-soft px-3 py-2 text-sm text-body">
          Guardado. Los cambios ya están publicados en tu web.
        </p>
      ) : null}

      <form id="landing-form" onSubmit={onSubmit} className="space-y-6">
        <Card className="p-5">
          <h2 className="mb-4 font-display text-base font-semibold">Datos del consultorio</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nombre público"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              label="Frase corta (tagline)"
              value={form.tagline}
              onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
              placeholder="Ej. Odontología cálida para toda la familia"
            />
            <Input
              label="Dirección"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
            <Input
              label="Teléfono"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <Input
              label="WhatsApp"
              value={form.whatsapp}
              onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
            />
            <Input
              label="Email de contacto"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-display text-base font-semibold">Horarios de atención</h2>
          <div className="space-y-2">
            {form.hours.map((h) => (
              <div key={h.weekday} className="flex flex-wrap items-center gap-3">
                <label className="flex w-32 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={h.enabled}
                    onChange={(e) => updateHour(h.weekday, { enabled: e.target.checked })}
                  />
                  {WEEKDAYS[h.weekday]}
                </label>
                <input
                  type="time"
                  disabled={!h.enabled}
                  value={h.open}
                  onChange={(e) => updateHour(h.weekday, { open: e.target.value })}
                  className={cn(
                    "h-9 rounded-lg border border-line bg-panel px-2.5 text-sm outline-none focus:border-accent",
                    !h.enabled && "opacity-40",
                  )}
                />
                <span className="text-muted">a</span>
                <input
                  type="time"
                  disabled={!h.enabled}
                  value={h.close}
                  onChange={(e) => updateHour(h.weekday, { close: e.target.value })}
                  className={cn(
                    "h-9 rounded-lg border border-line bg-panel px-2.5 text-sm outline-none focus:border-accent",
                    !h.enabled && "opacity-40",
                  )}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-display text-base font-semibold">Obras sociales</h2>
          <Input
            label="Separadas por coma"
            value={form.obrasSociales}
            onChange={(e) => setForm((f) => ({ ...f, obrasSociales: e.target.value }))}
            placeholder="OSDE, Swiss Medical, Galeno"
          />
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Preguntas frecuentes</h2>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setForm((f) => ({ ...f, faqs: [...f.faqs, { q: "", a: "" }] }))}
            >
              <Plus size={14} /> Agregar
            </Button>
          </div>
          <div className="space-y-3">
            {form.faqs.map((faq, i) => (
              <div key={i} className="flex gap-2 rounded-lg border border-line p-3">
                <div className="flex-1 space-y-2">
                  <input
                    value={faq.q}
                    placeholder="Pregunta"
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        faqs: f.faqs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)),
                      }))
                    }
                    className="h-9 w-full rounded-lg border border-line bg-panel px-3 text-sm outline-none focus:border-accent"
                  />
                  <textarea
                    value={faq.a}
                    placeholder="Respuesta"
                    rows={2}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        faqs: f.faqs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)),
                      }))
                    }
                    className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Eliminar"
                  onClick={() => setForm((f) => ({ ...f, faqs: f.faqs.filter((_, j) => j !== i) }))}
                  className="h-9 shrink-0 rounded-lg p-2 text-muted hover:bg-soft hover:text-error"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Opiniones de pacientes</h2>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setForm((f) => ({ ...f, testimonials: [...f.testimonials, { name: "", text: "" }] }))}
            >
              <Plus size={14} /> Agregar
            </Button>
          </div>
          <div className="space-y-3">
            {form.testimonials.map((t, i) => (
              <div key={i} className="flex gap-2 rounded-lg border border-line p-3">
                <div className="flex-1 space-y-2">
                  <input
                    value={t.name}
                    placeholder="Nombre del paciente"
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        testimonials: f.testimonials.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                      }))
                    }
                    className="h-9 w-full rounded-lg border border-line bg-panel px-3 text-sm outline-none focus:border-accent"
                  />
                  <textarea
                    value={t.text}
                    placeholder="Opinión"
                    rows={2}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        testimonials: f.testimonials.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)),
                      }))
                    }
                    className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Eliminar"
                  onClick={() => setForm((f) => ({ ...f, testimonials: f.testimonials.filter((_, j) => j !== i) }))}
                  className="h-9 shrink-0 rounded-lg p-2 text-muted hover:bg-soft hover:text-error"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </form>
    </div>
  );
}

import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import type { Doctor, Patient, Service } from "@dental/contracts";
import { Button, cn } from "./ui";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button aria-label="Cerrar" className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-panel p-5 shadow-xl sm:max-w-lg sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-soft">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none transition-colors focus:border-accent";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function FormActions({ pending, onCancel, submitLabel = "Guardar" }: { pending: boolean; onCancel: () => void; submitLabel?: string }) {
  return (
    <div className="mt-5 flex items-center justify-end gap-2">
      <Button variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
        Cancelar
      </Button>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Guardando…" : submitLabel}
      </Button>
    </div>
  );
}

/* ------------------------------ Paciente ---------------------------------- */

export function PatientForm({
  initial,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: Patient | null;
  pending: boolean;
  onSubmit: (values: {
    full_name: string;
    phone: string | null;
    email: string | null;
    document: string | null;
    birthdate: string | null;
    notes: string | null;
  }) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    full_name: initial?.fullName ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    document: initial?.document ?? "",
    birthdate: initial?.birthdate ?? "",
    notes: initial?.notes ?? "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          full_name: form.full_name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          document: form.document.trim() || null,
          birthdate: form.birthdate || null,
          notes: form.notes.trim() || null,
        });
      }}
      className="space-y-4"
    >
      <Field label="Nombre y apellido">
        <input required value={form.full_name} onChange={set("full_name")} className={inputCls} />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Teléfono">
          <input value={form.phone} onChange={set("phone")} className={inputCls} />
        </Field>
        <Field label="Email">
          <input type="email" value={form.email} onChange={set("email")} className={inputCls} />
        </Field>
        <Field label="Documento">
          <input value={form.document} onChange={set("document")} className={inputCls} />
        </Field>
        <Field label="Nacimiento">
          <input type="date" value={form.birthdate} onChange={set("birthdate")} className={inputCls} />
        </Field>
      </div>
      <Field label="Notas">
        <textarea value={form.notes} onChange={set("notes")} rows={3} className={inputCls} />
      </Field>
      <FormActions pending={pending} onCancel={onCancel} />
    </form>
  );
}

/* ------------------------------ Tratamiento -------------------------------- */

export function ServiceForm({
  initial,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: Service | null;
  pending: boolean;
  onSubmit: (values: {
    name: string;
    description: string | null;
    duration_min: number;
    price_cents: number | null;
    color: string;
    active: boolean;
  }) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    duration_min: String(initial?.durationMin ?? 30),
    price: initial?.priceCents != null ? String(Math.round(initial.priceCents / 100)) : "",
    color: initial?.color ?? "accent",
    active: initial?.active ?? true,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name: form.name.trim(),
          description: form.description.trim() || null,
          duration_min: Number(form.duration_min) || 30,
          price_cents: form.price.trim() ? Math.round(Number(form.price) * 100) : null,
          color: form.color,
          active: form.active,
        });
      }}
      className="space-y-4"
    >
      <Field label="Nombre">
        <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
      </Field>
      <Field label="Descripción">
        <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Duración (min)">
          <input
            type="number"
            min={5}
            step={5}
            value={form.duration_min}
            onChange={(e) => setForm((f) => ({ ...f, duration_min: e.target.value }))}
            className={inputCls}
          />
        </Field>
        <Field label="Honorario (ARS)">
          <input
            type="number"
            min={0}
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            className={inputCls}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Color">
          <select value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className={inputCls}>
            {["accent", "sky", "violet", "amber", "rose"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <label className="mt-6 inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="size-4" />
          Activo
        </label>
      </div>
      <FormActions pending={pending} onCancel={onCancel} />
    </form>
  );
}

/* ------------------------------ Profesional -------------------------------- */

export function DoctorForm({
  initial,
  services,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: Doctor | null;
  services: Service[];
  pending: boolean;
  onSubmit: (values: {
    name: string;
    specialty: string | null;
    bio: string | null;
    active: boolean;
    serviceIds: string[];
  }) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    specialty: initial?.specialty ?? "",
    bio: initial?.bio ?? "",
    active: initial?.active ?? true,
    serviceIds: initial?.serviceIds ?? [],
  });

  const toggle = (id: string) =>
    setForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter((s) => s !== id) : [...f.serviceIds, id],
    }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name: form.name.trim(),
          specialty: form.specialty.trim() || null,
          bio: form.bio.trim() || null,
          active: form.active,
          serviceIds: form.serviceIds,
        });
      }}
      className="space-y-4"
    >
      <Field label="Nombre">
        <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
      </Field>
      <Field label="Especialidad">
        <input value={form.specialty} onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))} className={inputCls} />
      </Field>
      <Field label="Bio">
        <textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} rows={2} className={inputCls} />
      </Field>
      <div>
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Tratamientos que atiende</span>
        <div className="mt-2 grid max-h-40 grid-cols-1 gap-1.5 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-2">
          {services.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.serviceIds.includes(s.id)} onChange={() => toggle(s.id)} className="size-4" />
              {s.name}
            </label>
          ))}
        </div>
      </div>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="size-4" />
        Activo
      </label>
      <FormActions pending={pending} onCancel={onCancel} />
    </form>
  );
}

/* -------------------------------- Turno ----------------------------------- */

function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AppointmentForm({
  patients,
  services,
  doctors,
  initialPatientId,
  pending,
  onSubmit,
  onCancel,
}: {
  patients: Patient[];
  services: Service[];
  doctors: Doctor[];
  initialPatientId?: string;
  pending: boolean;
  onSubmit: (values: { patient_id: string; doctor_id: string; service_id: string; starts_at: number; ends_at: number; notes: string | null }) => void;
  onCancel: () => void;
}) {
  const [patientId, setPatientId] = useState(initialPatientId ?? patients[0]?.id ?? "");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? "");
  const [when, setWhen] = useState(toLocalInput(Date.now() + 3_600_000));
  const [notes, setNotes] = useState("");

  const duration = services.find((s) => s.id === serviceId)?.durationMin ?? 30;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const starts = new Date(when).getTime();
        onSubmit({
          patient_id: patientId,
          doctor_id: doctorId,
          service_id: serviceId,
          starts_at: starts,
          ends_at: starts + duration * 60_000,
          notes: notes.trim() || null,
        });
      }}
      className="space-y-4"
    >
      <Field label="Paciente">
        <select required value={patientId} onChange={(e) => setPatientId(e.target.value)} className={inputCls}>
          <option value="" disabled>
            Elegí un paciente
          </option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Tratamiento">
          <select required value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={inputCls}>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Profesional">
          <select required value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className={inputCls}>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Fecha y hora">
        <input type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Notas">
        <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
      </Field>
      <p className={cn("text-xs text-muted")}>Duración estimada: {duration} min</p>
      <FormActions pending={pending} onCancel={onCancel} submitLabel="Crear turno" />
    </form>
  );
}

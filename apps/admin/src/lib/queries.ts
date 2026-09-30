import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAppointment,
  createClinicalNote,
  createDoctor,
  createPatient,
  createPlanItem,
  createRecall,
  createService,
  createWaiting,
  fetchAppointments,
  fetchAudit,
  fetchClinicSettings,
  fetchDoctors,
  fetchInquiries,
  fetchMe,
  fetchPatientBundle,
  fetchPatients,
  fetchRecalls,
  fetchServices,
  fetchWaiting,
  login as apiLogin,
  logout as apiLogout,
  recordToothCondition,
  saveClinicSettings,
  signup as apiSignup,
  updateAppointment,
  updateDoctor,
  updateInquiry,
  updatePatient,
  updateRecall,
  updateService,
  updateWaiting,
  type AppointmentDto,
  type ClinicalNoteDto,
  type DoctorDto,
  type PatientDto,
  type PlanItemDto,
  type RecallDto,
  type ServiceDto,
  type ToothConditionDto,
  type WaitingDto,
} from "./api";
import type {
  Appointment,
  AppointmentKind,
  AppointmentSource,
  AppointmentStatus,
  AiInquiry,
  ClinicSettings,
  ClinicalNote,
  Doctor,
  Patient,
  Recall,
  Service,
  ToothConditionRecord,
  TreatmentPlanItem,
  TreatmentPlanStatus,
  WaitingListItem,
} from "@dental/contracts";
import { dateKey } from "./format";

/* ------------------------------- Mapeos ---------------------------------- */

function toPatient(d: PatientDto): Patient {
  return {
    id: d.id,
    clinicId: "",
    fullName: d.full_name,
    phone: d.phone,
    email: d.email,
    document: d.document,
    birthdate: d.birthdate,
    notes: d.notes,
    createdAt: 0,
  };
}

function toService(d: ServiceDto): Service {
  return {
    id: d.id,
    clinicId: "",
    code: d.code,
    name: d.name,
    description: d.description,
    durationMin: d.duration_min,
    priceCents: d.price_cents,
    color: d.color,
    active: d.active === 1,
  };
}

function toDoctor(d: DoctorDto): Doctor {
  return {
    id: d.id,
    clinicId: "",
    name: d.name,
    specialty: d.specialty,
    bio: d.bio,
    photoUrl: d.photo_url,
    active: d.active === 1,
    serviceIds: d.serviceIds,
  };
}

function toAppointment(d: AppointmentDto): Appointment {
  return {
    id: d.id,
    clinicId: "",
    patientId: d.patient_id,
    doctorId: d.doctor_id,
    serviceId: d.service_id,
    operatoryId: d.operatory_id,
    startsAt: d.starts_at,
    endsAt: d.ends_at,
    status: d.status as AppointmentStatus,
    kind: d.kind as AppointmentKind,
    source: d.source as AppointmentSource,
    notes: d.notes,
  };
}

function toPlanItem(d: PlanItemDto): TreatmentPlanItem {
  return {
    id: d.id,
    clinicId: "",
    patientId: d.patient_id,
    serviceId: d.service_id,
    tooth: d.tooth,
    surface: d.surface,
    feeCents: d.fee_cents,
    status: d.status as TreatmentPlanStatus,
    notes: d.notes,
    sortOrder: d.sort_order,
  };
}

function toCondition(d: ToothConditionDto): ToothConditionRecord {
  return {
    id: d.id,
    clinicId: "",
    patientId: d.patient_id,
    tooth: d.tooth,
    surface: d.surface,
    condition: d.condition as ToothConditionRecord["condition"],
    recordedBy: d.recorded_by,
    recordedAt: d.recorded_at,
  };
}

function toClinicalNote(d: ClinicalNoteDto): ClinicalNote {
  return {
    id: d.id,
    clinicId: "",
    patientId: d.patient_id,
    doctorId: d.doctor_id,
    noteDate: d.note_date,
    body: d.body,
    createdBy: d.created_by,
  };
}

function toRecall(d: RecallDto): Recall {
  return {
    id: d.id,
    clinicId: "",
    patientId: d.patient_id,
    serviceId: d.service_id,
    dueAfter: d.due_after,
    source: d.source as Recall["source"],
    status: d.status as Recall["status"],
    notes: d.notes,
  };
}

function toWaiting(d: WaitingDto): WaitingListItem {
  return {
    id: d.id,
    clinicId: "",
    patientId: d.patient_id,
    serviceId: d.service_id,
    doctorId: d.doctor_id,
    durationMin: d.duration_min,
    status: d.status as WaitingListItem["status"],
    notes: d.notes,
    createdAt: d.created_at,
  };
}

/* ------------------------- Lectura de operación diaria -------------------- */

const clampAppointments = (list: Appointment[]) => list.slice().sort((a, b) => a.startsAt - b.startsAt);

export function useDoctors() {
  return useQuery({ queryKey: ["doctors"], queryFn: async () => (await fetchDoctors()).map(toDoctor) });
}

export function useServices() {
  return useQuery({ queryKey: ["services"], queryFn: async () => (await fetchServices()).map(toService) });
}

export function usePatients(query = "") {
  return useQuery({
    queryKey: ["patients"],
    queryFn: async () => (await fetchPatients()).map(toPatient),
    select: (list) => {
      const q = query.trim().toLowerCase();
      if (!q) return list;
      return list.filter(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          (p.phone ?? "").includes(q) ||
          (p.email ?? "").toLowerCase().includes(q) ||
          (p.document ?? "").includes(q),
      );
    },
  });
}

export function useAppointments(dayMs: number) {
  return useQuery({
    queryKey: ["appointments"],
    queryFn: async () => clampAppointments((await fetchAppointments()).map(toAppointment)),
    select: (list) => list.filter((a) => dateKey(a.startsAt) === dateKey(dayMs)),
  });
}

export function useWeekAppointments(startMs: number) {
  const days = Array.from({ length: 7 }, (_, i) => dateKey(startMs + i * 86_400_000));
  return useQuery({
    queryKey: ["appointments"],
    queryFn: async () => clampAppointments((await fetchAppointments()).map(toAppointment)),
    select: (list) => list.filter((a) => days.includes(dateKey(a.startsAt))),
  });
}

export type DaySummary = {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  noShow: number;
  scheduledCents: number;
  billedCents: number;
  freeMinutes: number;
  openRecalls: number;
  waiting: number;
  newInquiries: number;
};

export function useDaySummary(dayMs: number) {
  const appts = useAppointments(dayMs);
  const services = useServices();
  const recalls = useRecalls();
  const waiting = useWaitingList();
  const inquiries = useAiInquiries();

  const dayAppointments = (appts.data ?? []).filter((a) => a.kind === "patient");
  const priceOf = (a: Appointment) => services.data?.find((s) => s.id === a.serviceId)?.priceCents ?? 0;
  const scheduled = dayAppointments.filter((a) => a.status !== "cancelled" && a.status !== "no_show");
  const billed = dayAppointments.filter((a) => a.status === "completed");
  const busyMinutes = scheduled.reduce((acc, a) => acc + (a.endsAt - a.startsAt) / 60_000, 0);

  const data: DaySummary = {
    total: dayAppointments.length,
    pending: dayAppointments.filter((a) => a.status === "pending").length,
    confirmed: dayAppointments.filter((a) => a.status === "confirmed").length,
    completed: dayAppointments.filter((a) => a.status === "completed").length,
    cancelled: dayAppointments.filter((a) => a.status === "cancelled").length,
    noShow: dayAppointments.filter((a) => a.status === "no_show").length,
    scheduledCents: scheduled.reduce((acc, a) => acc + priceOf(a), 0),
    billedCents: billed.reduce((acc, a) => acc + priceOf(a), 0),
    freeMinutes: Math.max(0, 10 * 60 - busyMinutes),
    openRecalls: (recalls.data ?? []).length,
    waiting: (waiting.data ?? []).length,
    newInquiries: (inquiries.data ?? []).filter((i) => i.status === "new").length,
  };

  return {
    data,
    isLoading: appts.isLoading || services.isLoading,
  };
}

export type PatientBundle = {
  patient: Patient | null;
  appointments: Appointment[];
  plan: TreatmentPlanItem[];
  conditions: ToothConditionRecord[];
  notes: ClinicalNote[];
};

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: ["patient", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<PatientBundle> => {
      const bundle = await fetchPatientBundle(id!);
      return {
        patient: bundle.patient ? toPatient(bundle.patient) : null,
        appointments: clampAppointments(bundle.appointments.map(toAppointment)),
        plan: bundle.plan.map(toPlanItem),
        conditions: bundle.conditions.map(toCondition),
        notes: bundle.notes.map(toClinicalNote),
      };
    },
  });
}

export function useRecalls() {
  return useQuery({ queryKey: ["recalls"], queryFn: async () => (await fetchRecalls("open")).map(toRecall) });
}

export function useWaitingList() {
  return useQuery({ queryKey: ["waiting"], queryFn: async () => (await fetchWaiting("open")).map(toWaiting) });
}

export function useAiInquiries() {
  return useQuery({ queryKey: ["ai-inquiries"], queryFn: async () => (await fetchInquiries()).map(toInquiry) });
}

function toInquiry(d: { id: string; patient_name: string; topic: string; channel: string; at: number; status: string }): AiInquiry {
  return {
    id: d.id,
    patientName: d.patient_name,
    topic: d.topic,
    channel: d.channel as AiInquiry["channel"],
    at: d.at,
    status: d.status as AiInquiry["status"],
  };
}

/* ---------------------------------- Lookups ------------------------------- */

/** Nombres para mostrar en agenda/Hoy sin depender de los mocks. */
export function useDirectory() {
  const patients = usePatients();
  const services = useServices();
  const doctors = useDoctors();

  return {
    patientName: (id: string | null) => patients.data?.find((p) => p.id === id)?.fullName ?? "—",
    serviceName: (id: string | null) => services.data?.find((s) => s.id === id)?.name ?? "—",
    doctorName: (id: string | null) => doctors.data?.find((d) => d.id === id)?.name ?? "—",
  };
}

/* -------------------------------- Mutaciones ------------------------------ */

export function useCreatePatient() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createPatient,
    onSuccess: () => client.invalidateQueries({ queryKey: ["patients"] }),
  });
}

export function useUpdatePatient() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updatePatient>[1] }) => updatePatient(id, input),
    onSuccess: (_data, vars) => {
      client.invalidateQueries({ queryKey: ["patients"] });
      client.invalidateQueries({ queryKey: ["patient", vars.id] });
    },
  });
}

export function useCreateAppointment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createAppointment,
    onSuccess: () => client.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export function useUpdateAppointment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateAppointment>[1] }) => updateAppointment(id, input),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["appointments"] });
      client.invalidateQueries({ queryKey: ["patient"] });
    },
  });
}

export function useCreateService() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createService,
    onSuccess: () => client.invalidateQueries({ queryKey: ["services"] }),
  });
}

export function useUpdateService() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateService>[1] }) => updateService(id, input),
    onSuccess: () => client.invalidateQueries({ queryKey: ["services"] }),
  });
}

export function useCreateDoctor() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createDoctor,
    onSuccess: () => client.invalidateQueries({ queryKey: ["doctors"] }),
  });
}

export function useUpdateDoctor() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateDoctor>[1] }) => updateDoctor(id, input),
    onSuccess: () => client.invalidateQueries({ queryKey: ["doctors"] }),
  });
}

export function useCreatePlanItem() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createPlanItem,
    onSuccess: () => client.invalidateQueries({ queryKey: ["patient"] }),
  });
}

export function useCreateClinicalNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createClinicalNote,
    onSuccess: () => client.invalidateQueries({ queryKey: ["patient"] }),
  });
}

export function useRecordToothCondition() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: recordToothCondition,
    onSuccess: () => client.invalidateQueries({ queryKey: ["patient"] }),
  });
}

export function useCreateRecall() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createRecall,
    onSuccess: () => client.invalidateQueries({ queryKey: ["recalls"] }),
  });
}

export function useUpdateRecall() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateRecall>[1] }) => updateRecall(id, input),
    onSuccess: () => client.invalidateQueries({ queryKey: ["recalls"] }),
  });
}

export function useCreateWaiting() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createWaiting,
    onSuccess: () => client.invalidateQueries({ queryKey: ["waiting"] }),
  });
}

export function useUpdateWaiting() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateWaiting>[1] }) => updateWaiting(id, input),
    onSuccess: () => client.invalidateQueries({ queryKey: ["waiting"] }),
  });
}

export function useUpdateInquiry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateInquiry(id, status),
    onSuccess: () => client.invalidateQueries({ queryKey: ["ai-inquiries"] }),
  });
}

export function useAuditLog() {
  return useQuery({ queryKey: ["audit"], queryFn: fetchAudit });
}

/* ------------------------------ Configuración ----------------------------- */

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async (): Promise<ClinicSettings> => {
      const { content } = await fetchClinicSettings();
      const c = (content ?? {}) as Record<string, unknown>;
      return {
        clinicId: "clinic",
        timezone: "America/Argentina/Buenos_Aires",
        locale: "es-AR",
        contact: {
          phone: (c.phone as string) ?? null,
          whatsapp: (c.whatsapp as string) ?? null,
          email: (c.email as string) ?? null,
          address: (c.address as string) ?? null,
        },
        openingHours: (c.openingHours as ClinicSettings["openingHours"]) ?? [],
        slotMinutes: (c.slotMinutes as number) ?? 30,
        updatedAt: Date.now(),
      };
    },
  });
}

export function useSaveSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (settings: ClinicSettings) => {
      const existing = await fetchClinicSettings();
      const content = (existing.content ?? {}) as Record<string, unknown>;
      await saveClinicSettings({
        content: {
          ...content,
          phone: settings.contact.phone ?? undefined,
          whatsapp: settings.contact.whatsapp ?? undefined,
          email: settings.contact.email ?? undefined,
          address: settings.contact.address ?? undefined,
          openingHours: settings.openingHours,
          slotMinutes: settings.slotMinutes,
        },
      });
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["settings"] });
      client.invalidateQueries({ queryKey: ["clinic-settings"] });
    },
  });
}

/* ----------------------- Sesión real (auth) ------------------------------- */

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: fetchMe, retry: false });
}

export function useLogin() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) => apiLogin(input.email, input.password),
    onSuccess: () => client.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useSignup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: apiSignup,
    onSuccess: () => client.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useLogout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: apiLogout,
    onSuccess: () => client.invalidateQueries({ queryKey: ["me"] }),
  });
}

/* ------------------- Landing del consultorio (settings) ------------------- */

export function useClinicSettings() {
  return useQuery({ queryKey: ["clinic-settings"], queryFn: fetchClinicSettings });
}

export function useSaveClinicSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: saveClinicSettings,
    onSuccess: () => client.invalidateQueries({ queryKey: ["clinic-settings"] }),
  });
}

import { API_URL } from "./ai";

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(detail?.error ?? `La API respondió ${res.status}.`);
  }
  return res.json() as Promise<T>;
}

export type SessionUser = { id: string; name: string; email: string; isPlatformAdmin?: boolean };
export type ClinicAccess = "ok" | "trial_expired" | "payment_due" | "suspended";
export type Membership = {
  id: string;
  user_id: string;
  clinic_id: string;
  role: "owner" | "admin" | "dentist" | "receptionist";
  status: string;
  clinic: {
    id: string;
    name: string;
    slug: string;
    status?: string;
    access?: ClinicAccess;
    publicUrl?: string | null;
    trialExpiresAt?: number | null;
    paidUntil?: number | null;
  } | null;
};

export async function fetchMe(): Promise<{ user: SessionUser | null; memberships: Membership[] }> {
  return request("/api/auth/me");
}

export async function login(email: string, password: string): Promise<{ user: SessionUser }> {
  return request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export async function signup(input: {
  name: string;
  email: string;
  password: string;
  clinicName: string;
}): Promise<{ user: SessionUser; clinic: { id: string; slug: string; name: string } }> {
  return request("/api/auth/signup", { method: "POST", body: JSON.stringify(input) });
}

export async function logout(): Promise<void> {
  await request("/api/auth/logout", { method: "POST" });
}

/* ------------------------------ Master (plataforma) ------------------------------ */

export type PlatformClinicDto = {
  id: string;
  name: string;
  slug: string;
  status: "trial" | "active" | "suspended";
  access: ClinicAccess;
  trialExpiresAt: number | null;
  paidUntil: number | null;
  createdAt: number;
  ownerName: string | null;
  ownerEmail: string | null;
};

export async function fetchPlatformClinics(): Promise<PlatformClinicDto[]> {
  const { clinics } = await request<{ clinics: PlatformClinicDto[] }>("/api/platform/clinics");
  return clinics;
}

export type PlatformAction =
  | { kind: "trial"; clinicId: string; days: number }
  | { kind: "payment"; clinicId: string; periods: number }
  | { kind: "suspend"; clinicId: string };

export async function runPlatformAction(action: PlatformAction): Promise<void> {
  const body = action.kind === "trial" ? { days: action.days } : action.kind === "payment" ? { periods: action.periods } : {};
  await request(`/api/platform/clinics/${action.clinicId}/${action.kind}`, { method: "POST", body: JSON.stringify(body) });
}

export type DoctorDto = {
  id: string;
  name: string;
  specialty: string | null;
  bio: string | null;
  photo_url: string | null;
  active: number;
  serviceIds: string[];
};

export async function fetchDoctors(): Promise<DoctorDto[]> {
  const { doctors } = await request<{ doctors: DoctorDto[] }>("/api/doctors");
  return doctors;
}

export type ServiceDto = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  duration_min: number;
  price_cents: number | null;
  color: string;
  active: number;
};

export async function fetchServices(): Promise<ServiceDto[]> {
  const { services } = await request<{ services: ServiceDto[] }>("/api/services");
  return services;
}

export type PatientDto = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  birthdate: string | null;
  notes: string | null;
};

export async function fetchPatients(): Promise<PatientDto[]> {
  const { patients } = await request<{ patients: PatientDto[] }>("/api/patients");
  return patients;
}

export type AppointmentDto = {
  id: string;
  patient_id: string | null;
  doctor_id: string | null;
  service_id: string | null;
  operatory_id: string | null;
  starts_at: number;
  ends_at: number;
  status: string;
  kind: string;
  source: string;
  notes: string | null;
};

export async function fetchAppointments(): Promise<AppointmentDto[]> {
  const { appointments } = await request<{ appointments: AppointmentDto[] }>("/api/appointments");
  return appointments;
}

/* ----------------------------- Escrituras CRUD ---------------------------- */

export async function createPatient(input: Partial<PatientDto> & { full_name: string }): Promise<PatientDto> {
  const { patient } = await request<{ patient: PatientDto }>("/api/patients", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return patient;
}

export async function updatePatient(id: string, input: Partial<PatientDto>): Promise<PatientDto> {
  const { patient } = await request<{ patient: PatientDto }>(`/api/patients/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return patient;
}

export type ServiceInput = {
  name: string;
  description?: string | null;
  duration_min: number;
  price_cents?: number | null;
  code?: string | null;
  color?: string;
  active?: boolean;
};

export async function createService(input: ServiceInput): Promise<ServiceDto> {
  const { service } = await request<{ service: ServiceDto }>("/api/services", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return service;
}

export async function updateService(id: string, input: Partial<ServiceInput>): Promise<ServiceDto> {
  const { service } = await request<{ service: ServiceDto }>(`/api/services/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return service;
}

export type DoctorInput = {
  name: string;
  specialty?: string | null;
  bio?: string | null;
  photo_url?: string | null;
  active?: boolean;
  serviceIds?: string[];
};

export async function createDoctor(input: DoctorInput): Promise<DoctorDto> {
  const { doctor } = await request<{ doctor: DoctorDto }>("/api/doctors", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return doctor;
}

export async function updateDoctor(id: string, input: Partial<DoctorInput>): Promise<DoctorDto> {
  const { doctor } = await request<{ doctor: DoctorDto }>(`/api/doctors/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return doctor;
}

export async function createAppointment(input: {
  patient_id: string;
  doctor_id: string;
  service_id: string;
  starts_at: number;
  ends_at: number;
  status?: string;
  notes?: string | null;
}): Promise<AppointmentDto> {
  const { appointment } = await request<{ appointment: AppointmentDto }>("/api/appointments", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return appointment;
}

export async function updateAppointment(id: string, input: Partial<AppointmentDto>): Promise<AppointmentDto> {
  const { appointment } = await request<{ appointment: AppointmentDto }>(`/api/appointments/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return appointment;
}

/* ----------------------------- Núcleo clínico ----------------------------- */

export type PlanItemDto = {
  id: string;
  patient_id: string;
  service_id: string | null;
  tooth: string | null;
  surface: string | null;
  fee_cents: number;
  status: string;
  notes: string | null;
  sort_order: number;
};

export type ToothConditionDto = {
  id: string;
  patient_id: string;
  tooth: string;
  surface: string | null;
  condition: string;
  recorded_by: string | null;
  recorded_at: number;
};

export type ClinicalNoteDto = {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  note_date: number;
  body: string;
  created_by: string | null;
};

export type PatientBundleDto = {
  patient: PatientDto | null;
  appointments: AppointmentDto[];
  plan: PlanItemDto[];
  conditions: ToothConditionDto[];
  notes: ClinicalNoteDto[];
};

export async function fetchPatientBundle(id: string): Promise<PatientBundleDto> {
  return request(`/api/patients/${id}/bundle`);
}

export async function createPlanItem(input: {
  patientId: string;
  serviceId?: string | null;
  tooth?: string | null;
  surface?: string | null;
  feeCents?: number;
  notes?: string | null;
}): Promise<PlanItemDto> {
  const { item } = await request<{ item: PlanItemDto }>("/api/treatment-plan", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return item;
}

export async function createClinicalNote(input: {
  patientId: string;
  doctorId?: string | null;
  body: string;
}): Promise<ClinicalNoteDto> {
  const { note } = await request<{ note: ClinicalNoteDto }>("/api/clinical-notes", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return note;
}

export async function recordToothCondition(input: {
  patientId: string;
  tooth: string;
  surface?: string | null;
  condition: string;
}): Promise<ToothConditionDto> {
  const { condition } = await request<{ condition: ToothConditionDto }>("/api/tooth-conditions", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return condition;
}

/* ------------------------- Recalls / espera / IA -------------------------- */

export type RecallDto = {
  id: string;
  patient_id: string;
  service_id: string | null;
  due_after: string | null;
  source: string;
  status: string;
  notes: string | null;
};

export type WaitingDto = {
  id: string;
  patient_id: string;
  service_id: string | null;
  doctor_id: string | null;
  duration_min: number;
  status: string;
  notes: string | null;
  created_at: number;
};

export type InquiryDto = {
  id: string;
  patient_name: string;
  topic: string;
  channel: string;
  at: number;
  status: string;
};

export async function fetchRecalls(status?: string): Promise<RecallDto[]> {
  const qs = status ? `?status=${status}` : "";
  const { recalls } = await request<{ recalls: RecallDto[] }>(`/api/recalls${qs}`);
  return recalls;
}

export async function createRecall(input: {
  patientId: string;
  serviceId?: string | null;
  dueAfter?: string | null;
  notes?: string | null;
}): Promise<RecallDto> {
  const { recall } = await request<{ recall: RecallDto }>("/api/recalls", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return recall;
}

export async function updateRecall(id: string, input: { status?: string; notes?: string | null }): Promise<RecallDto> {
  const { recall } = await request<{ recall: RecallDto }>(`/api/recalls/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return recall;
}

export async function fetchWaiting(status?: string): Promise<WaitingDto[]> {
  const qs = status ? `?status=${status}` : "";
  const { waiting } = await request<{ waiting: WaitingDto[] }>(`/api/waiting-list${qs}`);
  return waiting;
}

export async function createWaiting(input: {
  patientId: string;
  serviceId?: string | null;
  doctorId?: string | null;
  durationMin?: number;
  notes?: string | null;
}): Promise<WaitingDto> {
  const { item } = await request<{ item: WaitingDto }>("/api/waiting-list", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return item;
}

export async function updateWaiting(id: string, input: { status?: string; notes?: string | null }): Promise<WaitingDto> {
  const { item } = await request<{ item: WaitingDto }>(`/api/waiting-list/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return item;
}

export async function fetchInquiries(status?: string): Promise<InquiryDto[]> {
  const qs = status ? `?status=${status}` : "";
  const { inquiries } = await request<{ inquiries: InquiryDto[] }>(`/api/ai-inquiries${qs}`);
  return inquiries;
}

export async function updateInquiry(id: string, status: string): Promise<InquiryDto> {
  const { inquiry } = await request<{ inquiry: InquiryDto }>(`/api/ai-inquiries/${id}`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
  return inquiry;
}

export type AuditEntryDto = {
  id: string;
  actor_user_id: string | null;
  actor_type: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  at: number;
};

export async function fetchAudit(): Promise<AuditEntryDto[]> {
  const { entries } = await request<{ entries: AuditEntryDto[] }>("/api/audit");
  return entries;
}

export type ClinicSettingsDto = {
  content: Record<string, unknown> | null;
  theme: Record<string, unknown> | null;
};

export async function fetchClinicSettings(): Promise<ClinicSettingsDto> {
  return request("/api/clinic/settings");
}

export async function saveClinicSettings(input: {
  content: Record<string, unknown>;
  theme?: Record<string, unknown>;
}): Promise<void> {
  await request("/api/clinic/settings", { method: "PUT", body: JSON.stringify(input) });
}

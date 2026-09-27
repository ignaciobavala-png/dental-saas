import { API_URL } from "./ai";

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(detail?.error ?? `La API respondió ${res.status}.`);
  }
  return res.json() as Promise<T>;
}

export type SessionUser = { id: string; name: string; email: string };
export type Membership = {
  id: string;
  user_id: string;
  clinic_id: string;
  role: "owner" | "admin" | "dentist" | "receptionist";
  status: string;
  clinic: { id: string; name: string; slug: string } | null;
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

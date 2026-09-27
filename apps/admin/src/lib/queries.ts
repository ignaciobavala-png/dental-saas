import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchClinicSettings,
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  saveClinicSettings,
  signup as apiSignup,
} from "./api";
import type {
  AiInquiry,
  Appointment,
  ClinicSettings,
  ClinicalNote,
  Doctor,
  Operatory,
  Patient,
  Recall,
  Service,
  ToothConditionRecord,
  TreatmentPlanItem,
  WaitingListItem,
} from "@dental/contracts";
import { dateKey } from "./format";
import {
  aiInquiries,
  appointments,
  clinicalNotes,
  doctors,
  operatories,
  patients,
  recalls,
  services,
  settings,
  toothConditions,
  treatmentPlan,
  waitingList,
} from "./mock";

function delay<T>(value: T, ms = 140): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
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

function summarizeDay(dayMs: number): DaySummary {
  const dayAppointments = appointments.filter(
    (a) => a.kind === "patient" && dateKey(a.startsAt) === dateKey(dayMs),
  );
  const priceOf = (a: Appointment): number =>
    services.find((s) => s.id === a.serviceId)?.priceCents ?? 0;

  const scheduled = dayAppointments.filter((a) => a.status !== "cancelled" && a.status !== "no_show");
  const billed = dayAppointments.filter((a) => a.status === "completed");
  const busyMinutes = scheduled.reduce((acc, a) => acc + (a.endsAt - a.startsAt) / 60_000, 0);

  return {
    total: dayAppointments.length,
    pending: dayAppointments.filter((a) => a.status === "pending").length,
    confirmed: dayAppointments.filter((a) => a.status === "confirmed").length,
    completed: dayAppointments.filter((a) => a.status === "completed").length,
    cancelled: dayAppointments.filter((a) => a.status === "cancelled").length,
    noShow: dayAppointments.filter((a) => a.status === "no_show").length,
    scheduledCents: scheduled.reduce((acc, a) => acc + priceOf(a), 0),
    billedCents: billed.reduce((acc, a) => acc + priceOf(a), 0),
    freeMinutes: Math.max(0, (10 * 60 - busyMinutes) as number),
    openRecalls: recalls.filter((r) => r.status === "open").length,
    waiting: waitingList.filter((w) => w.status === "open").length,
    newInquiries: aiInquiries.filter((i) => i.status === "new").length,
  };
}

export function useDaySummary(dayMs: number) {
  return useQuery({
    queryKey: ["summary", dateKey(dayMs)],
    queryFn: () => delay(summarizeDay(dayMs)),
  });
}

export function useAppointments(dayMs: number) {
  return useQuery({
    queryKey: ["appointments", dateKey(dayMs)],
    queryFn: () =>
      delay(
        appointments
          .filter((a) => dateKey(a.startsAt) === dateKey(dayMs))
          .sort((a, b) => a.startsAt - b.startsAt),
      ),
  });
}

export function useWeekAppointments(startMs: number) {
  const days = Array.from({ length: 7 }, (_, i) => dateKey(startMs + i * 86_400_000));
  return useQuery({
    queryKey: ["appointments-week", days[0]],
    queryFn: () =>
      delay(
        appointments
          .filter((a) => days.includes(dateKey(a.startsAt)))
          .sort((a, b) => a.startsAt - b.startsAt),
      ),
  });
}

export function useDoctors() {
  return useQuery({
    queryKey: ["doctors"],
    queryFn: () => delay<Doctor[]>(doctors),
  });
}

export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: () => delay<Service[]>(services),
  });
}

export function useOperatories() {
  return useQuery({
    queryKey: ["operatories"],
    queryFn: () => delay<Operatory[]>(operatories.sort((a, b) => a.sortOrder - b.sortOrder)),
  });
}

export function usePatients(query: string) {
  return useQuery({
    queryKey: ["patients", query],
    queryFn: () => {
      const q = query.trim().toLowerCase();
      const list = patients.filter((p) => {
        if (!q) return true;
        return (
          p.fullName.toLowerCase().includes(q) ||
          (p.phone ?? "").includes(q) ||
          (p.email ?? "").toLowerCase().includes(q) ||
          (p.document ?? "").includes(q)
        );
      });
      return delay(list);
    },
  });
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
    queryFn: () =>
      delay<PatientBundle>({
        patient: patients.find((p) => p.id === id) ?? null,
        appointments: appointments
          .filter((a) => a.patientId === id)
          .sort((a, b) => b.startsAt - a.startsAt),
        plan: treatmentPlan.filter((t) => t.patientId === id).sort((a, b) => a.sortOrder - b.sortOrder),
        conditions: toothConditions.filter((t) => t.patientId === id),
        notes: clinicalNotes
          .filter((n) => n.patientId === id)
          .sort((a, b) => b.noteDate - a.noteDate),
      }),
  });
}

export function useRecalls() {
  return useQuery({
    queryKey: ["recalls"],
    queryFn: () => delay<Recall[]>(recalls.filter((r) => r.status === "open")),
  });
}

export function useWaitingList() {
  return useQuery({
    queryKey: ["waiting"],
    queryFn: () => delay<WaitingListItem[]>(waitingList.filter((w) => w.status === "open")),
  });
}

export function useAiInquiries() {
  return useQuery({
    queryKey: ["ai-inquiries"],
    queryFn: () => delay<AiInquiry[]>(aiInquiries),
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => delay<ClinicSettings>(settings),
  });
}

// --- Sesión real (auth) -----------------------------------------------

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    retry: false,
  });
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

// --- Landing del consultorio (clinic_settings real) --------------------

export function useClinicSettings() {
  return useQuery({
    queryKey: ["clinic-settings"],
    queryFn: fetchClinicSettings,
  });
}

export function useSaveClinicSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: saveClinicSettings,
    onSuccess: () => client.invalidateQueries({ queryKey: ["clinic-settings"] }),
  });
}

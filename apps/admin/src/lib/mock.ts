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
import { startOfToday } from "./format";

export const CLINIC_ID = "cl_arocena";

const DAY = 86_400_000;

function at(dayOffset: number, h: number, m = 0): number {
  return startOfToday() + dayOffset * DAY + h * 3_600_000 + m * 60_000;
}

export const clinic = {
  id: CLINIC_ID,
  name: "Odontología Arocena",
  slug: "arocena",
  status: "active" as const,
  createdAt: at(-420, 9),
};

export const devUser = {
  id: "usr_malena",
  email: "malena@odontologiaarocena.com.ar",
  name: "Dra. Malena Ferreyra",
  role: "owner" as const,
};

export const doctors: Doctor[] = [
  {
    id: "doc_malena",
    clinicId: CLINIC_ID,
    name: "Dra. Malena Ferreyra",
    specialty: "Odontología general",
    bio: "Directora del consultorio. Odontología general y rehabilitación.",
    photoUrl: null,
    active: true,
    serviceIds: ["svc_limpieza", "svc_general", "svc_implante", "svc_rx"],
  },
  {
    id: "doc_tomas",
    clinicId: CLINIC_ID,
    name: "Dr. Tomás Aguirre",
    specialty: "Ortodoncia y estética",
    bio: "Ortodoncia, alineadores y estética dental.",
    photoUrl: null,
    active: true,
    serviceIds: ["svc_ortodoncia", "svc_estetica", "svc_general"],
  },
  {
    id: "doc_sofia",
    clinicId: CLINIC_ID,
    name: "Dra. Sofía Bermúdez",
    specialty: "Endodoncia y odontopediatría",
    bio: "Tratamientos de conducto y atención de chicos.",
    photoUrl: null,
    active: true,
    serviceIds: ["svc_endo", "svc_odontoped", "svc_general"],
  },
];

export const services: Service[] = [
  {
    id: "svc_general",
    clinicId: CLINIC_ID,
    code: "0110",
    name: "Consulta de odontología general",
    description: "Revisión, diagnóstico y plan.",
    durationMin: 30,
    priceCents: 1_800_000,
    color: "accent",
    active: true,
  },
  {
    id: "svc_limpieza",
    clinicId: CLINIC_ID,
    code: "0120",
    name: "Limpieza dental",
    description: "Tartrectomía y pulido.",
    durationMin: 45,
    priceCents: 2_400_000,
    color: "sky",
    active: true,
  },
  {
    id: "svc_ortodoncia",
    clinicId: CLINIC_ID,
    code: "0300",
    name: "Ortodoncia (control mensual)",
    description: "Control y ajuste de brackets o alineadores.",
    durationMin: 30,
    priceCents: 4_500_000,
    color: "violet",
    active: true,
  },
  {
    id: "svc_implante",
    clinicId: CLINIC_ID,
    code: "0500",
    name: "Implante unitario",
    description: "Colocación de implante con tomografía previa.",
    durationMin: 90,
    priceCents: 78_000_000,
    color: "amber",
    active: true,
  },
  {
    id: "svc_estetica",
    clinicId: CLINIC_ID,
    code: "0610",
    name: "Blanqueamiento en consultorio",
    description: "Sesión única de 60 minutos.",
    durationMin: 60,
    priceCents: 9_500_000,
    color: "rose",
    active: true,
  },
  {
    id: "svc_endo",
    clinicId: CLINIC_ID,
    code: "0400",
    name: "Endodoncia (conducto)",
    description: "Tratamiento de conducto con microscopio.",
    durationMin: 60,
    priceCents: 6_000_000,
    color: "rose",
    active: true,
  },
  {
    id: "svc_odontoped",
    clinicId: CLINIC_ID,
    code: "0700",
    name: "Odontopediatría",
    description: "Atención de chicos desde los 3 años.",
    durationMin: 30,
    priceCents: 1_500_000,
    color: "amber",
    active: true,
  },
  {
    id: "svc_rx",
    clinicId: CLINIC_ID,
    code: "0900",
    name: "Radiografía periapical",
    description: "Radiografía digital.",
    durationMin: 15,
    priceCents: 900_000,
    color: "sky",
    active: false,
  },
];

export const operatories: Operatory[] = [
  { id: "op_1", clinicId: CLINIC_ID, name: "Box 1", color: "accent", sortOrder: 0, active: true },
  { id: "op_2", clinicId: CLINIC_ID, name: "Box 2", color: "sky", sortOrder: 1, active: true },
  { id: "op_3", clinicId: CLINIC_ID, name: "Box 3", color: "amber", sortOrder: 2, active: true },
];

export const patients: Patient[] = [
  { id: "pt_1", clinicId: CLINIC_ID, fullName: "Carolina Iriarte", phone: "+54 9 11 5512 8890", email: "carolina.iriarte@gmail.com", document: "31.204.556", birthdate: "1986-04-12", notes: "Paciente desde 2022. Buena higiene.", createdAt: at(-540, 10) },
  { id: "pt_2", clinicId: CLINIC_ID, fullName: "Rubén Sández", phone: "+54 9 11 4402 1177", email: "rsandez@hotmail.com", document: "20.884.301", birthdate: "1968-11-03", notes: "Implante en 2024. Control anual.", createdAt: at(-500, 9) },
  { id: "pt_3", clinicId: CLINIC_ID, fullName: "Lucía Fontana", phone: "+54 9 11 6688 2043", email: "lucia.fontana@gmail.com", document: "35.990.812", birthdate: "1991-07-21", notes: null, createdAt: at(-320, 11) },
  { id: "pt_4", clinicId: CLINIC_ID, fullName: "Martín Pesce", phone: "+54 9 11 3344 7781", email: null, document: "28.442.190", birthdate: "1980-02-08", notes: "Bruxismo. Se sugiere placa.", createdAt: at(-280, 15) },
  { id: "pt_5", clinicId: CLINIC_ID, fullName: "Valentina Ruiz", phone: "+54 9 11 5590 3312", email: "valen.ruiz@gmail.com", document: "38.201.774", birthdate: "1995-09-30", notes: null, createdAt: at(-240, 9) },
  { id: "pt_6", clinicId: CLINIC_ID, fullName: "Gustavo Peralta", phone: "+54 9 11 2288 9014", email: "gperalta@yahoo.com", document: "24.110.665", birthdate: "1974-12-17", notes: "Obra social IOMA.", createdAt: at(-200, 16) },
  { id: "pt_7", clinicId: CLINIC_ID, fullName: "Delfina Sosa", phone: "+54 9 11 7702 4456", email: null, document: null, birthdate: "2016-06-05", notes: "Paciente pediátrica. Viene con la mamá.", createdAt: at(-180, 10) },
  { id: "pt_8", clinicId: CLINIC_ID, fullName: "Horacio Ledesma", phone: "+54 9 11 6001 7789", email: "hledesma@gmail.com", document: "17.553.208", birthdate: "1960-03-22", notes: "Hipertenso. Consultar medicación.", createdAt: at(-150, 9) },
  { id: "pt_9", clinicId: CLINIC_ID, fullName: "Mariana Escobar", phone: "+54 9 11 4420 1199", email: "mariana.escobar@gmail.com", document: "33.774.201", birthdate: "1988-08-14", notes: null, createdAt: at(-120, 12) },
  { id: "pt_10", clinicId: CLINIC_ID, fullName: "Federico Maidana", phone: "+54 9 11 5580 2244", email: "fede.maidana@outlook.com", document: "30.998.112", birthdate: "1983-01-09", notes: "Alineadores invisibles.", createdAt: at(-90, 11) },
  { id: "pt_11", clinicId: CLINIC_ID, fullName: "Julieta Navarro", phone: "+54 9 11 6699 8877", email: "juli.navarro@gmail.com", document: "36.221.908", birthdate: "1993-05-27", notes: null, createdAt: at(-60, 15) },
  { id: "pt_12", clinicId: CLINIC_ID, fullName: "Sebastián Cabrera", phone: "+54 9 11 3312 6650", email: null, document: "26.884.771", birthdate: "1977-10-11", notes: "Le da miedo el torno. Avisar antes.", createdAt: at(-45, 10) },
  { id: "pt_13", clinicId: CLINIC_ID, fullName: "Agustina Vera", phone: "+54 9 11 7781 3390", email: "agus.vera@gmail.com", document: "39.012.443", birthdate: "1997-02-19", notes: null, createdAt: at(-30, 9) },
  { id: "pt_14", clinicId: CLINIC_ID, fullName: "Diego Bustamante", phone: "+54 9 11 2204 5567", email: "dbustamante@gmail.com", document: "22.559.014", birthdate: "1971-06-30", notes: "Prótesis superior.", createdAt: at(-20, 16) },
];

export const appointments: Appointment[] = [
  { id: "ap_1", clinicId: CLINIC_ID, patientId: "pt_5", doctorId: "doc_malena", serviceId: "svc_general", operatoryId: "op_1", startsAt: at(0, 8, 30), endsAt: at(0, 9), status: "no_show", kind: "patient", source: "dashboard", notes: null },
  { id: "ap_2", clinicId: CLINIC_ID, patientId: "pt_1", doctorId: "doc_malena", serviceId: "svc_limpieza", operatoryId: "op_1", startsAt: at(0, 9), endsAt: at(0, 9, 45), status: "completed", kind: "patient", source: "dashboard", notes: null },
  { id: "ap_3", clinicId: CLINIC_ID, patientId: "pt_11", doctorId: "doc_tomas", serviceId: "svc_ortodoncia", operatoryId: "op_2", startsAt: at(0, 9), endsAt: at(0, 9, 30), status: "completed", kind: "patient", source: "landing", notes: null },
  { id: "ap_4", clinicId: CLINIC_ID, patientId: "pt_7", doctorId: "doc_sofia", serviceId: "svc_odontoped", operatoryId: "op_3", startsAt: at(0, 9, 30), endsAt: at(0, 10), status: "completed", kind: "patient", source: "dashboard", notes: null },
  { id: "ap_5", clinicId: CLINIC_ID, patientId: "pt_3", doctorId: "doc_malena", serviceId: "svc_general", operatoryId: "op_1", startsAt: at(0, 10), endsAt: at(0, 10, 30), status: "confirmed", kind: "patient", source: "ai", notes: "Reservado por la secretaría IA." },
  { id: "ap_6", clinicId: CLINIC_ID, patientId: "pt_8", doctorId: "doc_sofia", serviceId: "svc_endo", operatoryId: "op_3", startsAt: at(0, 10), endsAt: at(0, 11), status: "confirmed", kind: "patient", source: "dashboard", notes: null },
  { id: "ap_7", clinicId: CLINIC_ID, patientId: "pt_9", doctorId: "doc_tomas", serviceId: "svc_estetica", operatoryId: "op_2", startsAt: at(0, 10, 30), endsAt: at(0, 11, 30), status: "confirmed", kind: "patient", source: "dashboard", notes: null },
  { id: "ap_8", clinicId: CLINIC_ID, patientId: null, doctorId: "doc_malena", serviceId: null, operatoryId: null, startsAt: at(0, 11, 30), endsAt: at(0, 12, 30), status: "confirmed", kind: "lunch", source: "dashboard", notes: null },
  { id: "ap_9", clinicId: CLINIC_ID, patientId: "pt_6", doctorId: "doc_malena", serviceId: "svc_general", operatoryId: "op_1", startsAt: at(0, 12, 30), endsAt: at(0, 13), status: "confirmed", kind: "patient", source: "dashboard", notes: null },
  { id: "ap_10", clinicId: CLINIC_ID, patientId: "pt_2", doctorId: "doc_malena", serviceId: "svc_implante", operatoryId: "op_1", startsAt: at(0, 14), endsAt: at(0, 15, 30), status: "confirmed", kind: "patient", source: "dashboard", notes: "Segunda etapa del implante." },
  { id: "ap_11", clinicId: CLINIC_ID, patientId: "pt_13", doctorId: "doc_sofia", serviceId: "svc_general", operatoryId: "op_3", startsAt: at(0, 14, 30), endsAt: at(0, 15), status: "confirmed", kind: "patient", source: "landing", notes: null },
  { id: "ap_12", clinicId: CLINIC_ID, patientId: "pt_10", doctorId: "doc_tomas", serviceId: "svc_ortodoncia", operatoryId: "op_2", startsAt: at(0, 15), endsAt: at(0, 15, 30), status: "confirmed", kind: "patient", source: "dashboard", notes: null },
  { id: "ap_13", clinicId: CLINIC_ID, patientId: "pt_12", doctorId: "doc_malena", serviceId: "svc_limpieza", operatoryId: "op_1", startsAt: at(0, 16), endsAt: at(0, 16, 45), status: "pending", kind: "patient", source: "ai", notes: "Confirmar asistencia." },
  { id: "ap_14", clinicId: CLINIC_ID, patientId: "pt_14", doctorId: "doc_sofia", serviceId: "svc_endo", operatoryId: "op_3", startsAt: at(0, 16), endsAt: at(0, 17), status: "confirmed", kind: "patient", source: "dashboard", notes: null },
  { id: "ap_15", clinicId: CLINIC_ID, patientId: "pt_4", doctorId: "doc_malena", serviceId: "svc_general", operatoryId: "op_1", startsAt: at(0, 17), endsAt: at(0, 17, 30), status: "confirmed", kind: "patient", source: "dashboard", notes: null },
  { id: "ap_16", clinicId: CLINIC_ID, patientId: "pt_11", doctorId: "doc_tomas", serviceId: "svc_ortodoncia", operatoryId: "op_2", startsAt: at(0, 13), endsAt: at(0, 13, 30), status: "cancelled", kind: "patient", source: "landing", notes: "Reprogramado a la tarde." },
  { id: "ap_17", clinicId: CLINIC_ID, patientId: null, doctorId: "doc_tomas", serviceId: null, operatoryId: "op_2", startsAt: at(0, 12), endsAt: at(0, 12, 30), status: "confirmed", kind: "break", source: "dashboard", notes: null },
  { id: "ap_18", clinicId: CLINIC_ID, patientId: "pt_1", doctorId: "doc_malena", serviceId: "svc_limpieza", operatoryId: "op_1", startsAt: at(-1, 9), endsAt: at(-1, 9, 45), status: "completed", kind: "patient", source: "dashboard", notes: null },
  { id: "ap_19", clinicId: CLINIC_ID, patientId: "pt_1", doctorId: "doc_malena", serviceId: "svc_endo", operatoryId: "op_1", startsAt: at(1, 11), endsAt: at(1, 12), status: "confirmed", kind: "patient", source: "dashboard", notes: null },
  { id: "ap_20", clinicId: CLINIC_ID, patientId: "pt_4", doctorId: "doc_tomas", serviceId: "svc_ortodoncia", operatoryId: "op_2", startsAt: at(2, 10), endsAt: at(2, 10, 30), status: "pending", kind: "patient", source: "ai", notes: null },
  { id: "ap_21", clinicId: CLINIC_ID, patientId: "pt_3", doctorId: "doc_sofia", serviceId: "svc_general", operatoryId: "op_3", startsAt: at(3, 15), endsAt: at(3, 15, 30), status: "confirmed", kind: "patient", source: "dashboard", notes: null },
];

export const treatmentPlan: TreatmentPlanItem[] = [
  { id: "tp_1", clinicId: CLINIC_ID, patientId: "pt_1", serviceId: "svc_endo", tooth: "36", surface: null, feeCents: 6_000_000, status: "accepted", notes: "Conducto en pieza 36.", sortOrder: 0 },
  { id: "tp_2", clinicId: CLINIC_ID, patientId: "pt_1", serviceId: "svc_limpieza", tooth: null, surface: null, feeCents: 2_400_000, status: "completed", notes: null, sortOrder: 1 },
  { id: "tp_3", clinicId: CLINIC_ID, patientId: "pt_1", serviceId: "svc_estetica", tooth: "11", surface: "V", feeCents: 9_500_000, status: "planned", notes: "Blanqueamiento al terminar el conducto.", sortOrder: 2 },
  { id: "tp_4", clinicId: CLINIC_ID, patientId: "pt_2", serviceId: "svc_implante", tooth: "46", surface: null, feeCents: 78_000_000, status: "accepted", notes: "Implante y corona.", sortOrder: 0 },
  { id: "tp_5", clinicId: CLINIC_ID, patientId: "pt_4", serviceId: "svc_general", tooth: null, surface: null, feeCents: 1_800_000, status: "planned", notes: "Evaluar placa de bruxismo.", sortOrder: 0 },
];

export const toothConditions: ToothConditionRecord[] = [
  { id: "tc_1", clinicId: CLINIC_ID, patientId: "pt_1", tooth: "16", surface: "O", condition: "caries", recordedBy: "doc_malena", recordedAt: at(-30, 10) },
  { id: "tc_2", clinicId: CLINIC_ID, patientId: "pt_1", tooth: "26", surface: null, condition: "restoration", recordedBy: "doc_malena", recordedAt: at(-90, 10) },
  { id: "tc_3", clinicId: CLINIC_ID, patientId: "pt_1", tooth: "36", surface: null, condition: "endo", recordedBy: "doc_sofia", recordedAt: at(-10, 11) },
  { id: "tc_4", clinicId: CLINIC_ID, patientId: "pt_1", tooth: "46", surface: null, condition: "missing", recordedBy: "doc_malena", recordedAt: at(-120, 10) },
  { id: "tc_5", clinicId: CLINIC_ID, patientId: "pt_1", tooth: "11", surface: null, condition: "crown", recordedBy: "doc_tomas", recordedAt: at(-60, 12) },
  { id: "tc_6", clinicId: CLINIC_ID, patientId: "pt_2", tooth: "46", surface: null, condition: "implant", recordedBy: "doc_malena", recordedAt: at(-400, 10) },
  { id: "tc_7", clinicId: CLINIC_ID, patientId: "pt_2", tooth: "47", surface: null, condition: "caries", recordedBy: "doc_malena", recordedAt: at(-15, 9) },
  { id: "tc_8", clinicId: CLINIC_ID, patientId: "pt_4", tooth: "37", surface: null, condition: "restoration", recordedBy: "doc_malena", recordedAt: at(-45, 17) },
];

export const clinicalNotes: ClinicalNote[] = [
  { id: "cn_1", clinicId: CLINIC_ID, patientId: "pt_1", doctorId: "doc_sofia", noteDate: at(-10, 11), body: "Se inicia endodoncia en pieza 36. Conducto único, sin complicaciones. Se cita para obturación.", createdBy: "doc_sofia" },
  { id: "cn_2", clinicId: CLINIC_ID, patientId: "pt_1", doctorId: "doc_malena", noteDate: at(-1, 9), body: "Limpieza y control de higiene. Se refuerza técnica de cepillado. Buena evolución del conducto.", createdBy: "doc_malena" },
  { id: "cn_3", clinicId: CLINIC_ID, patientId: "pt_1", doctorId: "doc_tomas", noteDate: at(-60, 12), body: "Corona definitiva en 11. Control de oclusión sin ajustes. Paciente conforme.", createdBy: "doc_tomas" },
  { id: "cn_4", clinicId: CLINIC_ID, patientId: "pt_2", doctorId: "doc_malena", noteDate: at(-15, 9), body: "Control del implante en 46: osteointegración correcta. Se detecta caries en 47, se planifica obturación.", createdBy: "doc_malena" },
  { id: "cn_5", clinicId: CLINIC_ID, patientId: "pt_4", doctorId: "doc_malena", noteDate: at(-45, 17), body: "Paciente refiere apretamiento nocturno y dolor matinal. Se sugiere placa de descanso.", createdBy: "doc_malena" },
];

export const recalls: Recall[] = [
  { id: "rc_1", clinicId: CLINIC_ID, patientId: "pt_3", serviceId: "svc_limpieza", dueAfter: "2026-10-05", source: "reception", status: "open", notes: "Limpieza cada 6 meses." },
  { id: "rc_2", clinicId: CLINIC_ID, patientId: "pt_6", serviceId: "svc_general", dueAfter: "2026-10-02", source: "system", status: "open", notes: null },
  { id: "rc_3", clinicId: CLINIC_ID, patientId: "pt_9", serviceId: "svc_limpieza", dueAfter: "2026-11-12", source: "reception", status: "open", notes: null },
  { id: "rc_4", clinicId: CLINIC_ID, patientId: "pt_2", serviceId: "svc_rx", dueAfter: "2026-10-20", source: "system", status: "open", notes: "Control radiológico del implante." },
];

export const waitingList: WaitingListItem[] = [
  { id: "wl_1", clinicId: CLINIC_ID, patientId: "pt_12", serviceId: "svc_limpieza", doctorId: "doc_malena", durationMin: 45, status: "open", notes: "Prefiere por la tarde.", createdAt: at(-3, 10) },
  { id: "wl_2", clinicId: CLINIC_ID, patientId: "pt_5", serviceId: "svc_general", doctorId: null, durationMin: 30, status: "open", notes: "Cualquier profesional.", createdAt: at(-2, 15) },
  { id: "wl_3", clinicId: CLINIC_ID, patientId: "pt_7", serviceId: "svc_odontoped", doctorId: "doc_sofia", durationMin: 30, status: "open", notes: null, createdAt: at(-1, 9) },
];

export const aiInquiries: AiInquiry[] = [
  { id: "ai_1", patientName: "Florencia Ayala", topic: "Consulta por blanqueamiento", channel: "landing", at: at(0, 9, 12), status: "new" },
  { id: "ai_2", patientName: "Nicolás Ferro", topic: "Disponibilidad para implante", channel: "whatsapp", at: at(0, 10, 40), status: "contacted" },
  { id: "ai_3", patientName: "Micaela Duarte", topic: "Turno para su hijo (5 años)", channel: "landing", at: at(0, 11, 5), status: "new" },
];

export const settings: ClinicSettings = {
  clinicId: CLINIC_ID,
  timezone: "America/Argentina/Buenos_Aires",
  locale: "es-AR",
  contact: {
    phone: "+54 11 4633 7842",
    whatsapp: "+54 9 11 4633 7842",
    email: "hola@odontologiaarocena.com.ar",
    address: "Av. Rivadavia 4820, Caballito, CABA",
  },
  openingHours: [
    { weekday: 0, openMin: 9 * 60, closeMin: 19 * 60 },
    { weekday: 1, openMin: 9 * 60, closeMin: 19 * 60 },
    { weekday: 2, openMin: 9 * 60, closeMin: 19 * 60 },
    { weekday: 3, openMin: 9 * 60, closeMin: 19 * 60 },
    { weekday: 4, openMin: 9 * 60, closeMin: 19 * 60 },
    { weekday: 5, openMin: 9 * 60, closeMin: 13 * 60 },
  ],
  slotMinutes: 15,
  updatedAt: at(-5, 18),
};

export function patientName(id: string | null): string {
  if (!id) return "—";
  return patients.find((p) => p.id === id)?.fullName ?? "—";
}

export function serviceName(id: string | null): string {
  if (!id) return "—";
  return services.find((s) => s.id === id)?.name ?? "—";
}

export function doctorName(id: string | null): string {
  if (!id) return "—";
  return doctors.find((d) => d.id === id)?.name ?? "—";
}

export function operatoryName(id: string | null): string {
  if (!id) return "—";
  return operatories.find((o) => o.id === id)?.name ?? "—";
}

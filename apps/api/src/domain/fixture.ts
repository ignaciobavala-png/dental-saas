import type { Appointment, Clinic, ClinicSettings, Doctor, Service } from '@dental/contracts';

// Fixture de la clínica para probar la secretaría en local.
// Espeja apps/landing/src/data/clinic.ts. Descartable: se reemplaza por D1 + seed
// cuando exista H1–H3. NO es la fuente de verdad del dominio.

export const clinic: Clinic = {
  id: 'cl_arocena',
  name: 'Odontología Arocena',
  slug: 'arocena',
  status: 'active',
  createdAt: Date.UTC(2026, 0, 1),
};

export const clinicSettings: ClinicSettings = {
  clinicId: clinic.id,
  timezone: 'America/Argentina/Buenos_Aires',
  locale: 'es-AR',
  contact: {
    phone: '+54 11 4633 7842',
    whatsapp: '+54 9 11 4633 7842',
    email: 'hola@odontologiaarocena.com.ar',
    address: 'Av. Rivadavia 4820, Caballito, CABA (C1424)',
  },
  openingHours: [
    { weekday: 1, openMin: 540, closeMin: 1140 },
    { weekday: 2, openMin: 540, closeMin: 1140 },
    { weekday: 3, openMin: 540, closeMin: 1140 },
    { weekday: 4, openMin: 540, closeMin: 1140 },
    { weekday: 5, openMin: 540, closeMin: 1140 },
    { weekday: 6, openMin: 540, closeMin: 780 },
  ],
  slotMinutes: 30,
  updatedAt: Date.UTC(2026, 0, 1),
};

export const obrasSociales = [
  'OSDE',
  'Swiss Medical',
  'Galeno',
  'IOMA',
  'Medicus',
  'Omint',
];

export const faqs: Array<{ q: string; a: string }> = [
  {
    q: '¿Atienden por obra social?',
    a: 'Sí. Trabajamos con OSDE, Swiss Medical, Galeno, IOMA, Medicus y Omint, y también recibimos reintegros de otras coberturas.',
  },
  {
    q: '¿Cómo consigo un turno?',
    a: 'Desde esta página con la secretaría virtual, o por WhatsApp en el horario del consultorio.',
  },
  {
    q: '¿Atienden urgencias?',
    a: 'Sí. Reservamos franjas del día para dolor o traumatismos. Si es urgente, conviene llamar por teléfono.',
  },
  {
    q: '¿Los implantes tienen garantía?',
    a: 'Sí, los implantes y las coronas tienen garantía por escrito.',
  },
  {
    q: '¿Aceptan pago en cuotas?',
    a: 'Los tratamientos largos se abonan por etapa y con tarjeta se pueden financiar en cuotas según el banco.',
  },
];

export const services: Service[] = [
  {
    id: 'svc_general',
    clinicId: clinic.id,
    code: '01',
    name: 'Odontología general',
    description: 'Control, limpieza y tratamientos de caries.',
    durationMin: 45,
    priceCents: 1_800_000,
    color: '#17493e',
    active: true,
  },
  {
    id: 'svc_orto',
    clinicId: clinic.id,
    code: '02',
    name: 'Ortodoncia',
    description: 'Brackets metálicos, estéticos y alineadores invisibles. Control mensual.',
    durationMin: 30,
    priceCents: 4_500_000,
    color: '#3b82f6',
    active: true,
  },
  {
    id: 'svc_implantes',
    clinicId: clinic.id,
    code: '03',
    name: 'Implantes',
    description: 'Implante unitario y coronas, con tomografía previa. Presupuesto sin cargo.',
    durationMin: 60,
    priceCents: null,
    color: '#8b5cf6',
    active: true,
  },
  {
    id: 'svc_estetica',
    clinicId: clinic.id,
    code: '04',
    name: 'Estética dental',
    description: 'Blanqueamiento en consultorio y carillas.',
    durationMin: 60,
    priceCents: 9_500_000,
    color: '#ec4899',
    active: true,
  },
  {
    id: 'svc_endo',
    clinicId: clinic.id,
    code: '05',
    name: 'Endodoncia',
    description: 'Tratamiento de conducto con microscopio. Una o dos sesiones.',
    durationMin: 60,
    priceCents: 6_000_000,
    color: '#f59e0b',
    active: true,
  },
  {
    id: 'svc_pediatria',
    clinicId: clinic.id,
    code: '06',
    name: 'Odontopediatría',
    description: 'Atención de chicos desde los 3 años.',
    durationMin: 30,
    priceCents: 1_500_000,
    color: '#10b981',
    active: true,
  },
];

export const doctors: Doctor[] = [
  {
    id: 'doc_malena',
    clinicId: clinic.id,
    name: 'Dra. Malena Ferreyra',
    specialty: 'Odontología general y endodoncia',
    bio: 'Directora del consultorio. Odontología general y tratamientos de conducto.',
    photoUrl: null,
    active: true,
    serviceIds: ['svc_general', 'svc_endo', 'svc_implantes'],
  },
  {
    id: 'doc_tomas',
    clinicId: clinic.id,
    name: 'Dr. Tomás Aguirre',
    specialty: 'Ortodoncia y estética',
    bio: 'Ortodoncia, alineadores y estética dental.',
    photoUrl: null,
    active: true,
    serviceIds: ['svc_orto', 'svc_estetica'],
  },
  {
    id: 'doc_sofia',
    clinicId: clinic.id,
    name: 'Dra. Sofía Bermúdez',
    specialty: 'Endodoncia y odontopediatría',
    bio: 'Endodoncia y atención de chicos.',
    photoUrl: null,
    active: true,
    serviceIds: ['svc_endo', 'svc_pediatria', 'svc_general'],
  },
];

// Store en memoria: se pierde al reiniciar el worker. Solo para la prueba local.
export const appointments: Appointment[] = [];

export function resetStore(): void {
  appointments.length = 0;
}

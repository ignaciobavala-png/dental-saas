import type { PublicClinic } from '@dental/contracts';
import { fallbackClinic } from '../data/clinic';

export type ClinicHours = { day: string; time: string };
export type ClinicTreatment = { name: string; detail: string; duration: string; price: string };
export type ClinicMember = { name: string; role: string; license: string; photo: string };
export type ClinicTestimonial = { quote: string; name: string; detail: string };
export type ClinicFaq = { q: string; a: string };

export type ClinicOpeningHour = { weekday: number; openMin: number; closeMin: number };

/** Datos ya normalizados que consumen las secciones de la landing. */
export type ClinicData = {
  slug: string;
  name: string;
  tagline: string;
  phone: string;
  phoneHref: string;
  whatsapp: string;
  email: string;
  address: string;
  mapsUrl: string;
  hours: ClinicHours[];
  openingHours: ClinicOpeningHour[];
  obrasSociales: string[];
  treatments: ClinicTreatment[];
  team: ClinicMember[];
  testimonials: ClinicTestimonial[];
  faqs: ClinicFaq[];
};

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:8787';
const CLINIC_SLUG = import.meta.env.PUBLIC_CLINIC_SLUG ?? '';

function telHref(phone: string | null): string {
  if (!phone) return '';
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

function whatsappHref(value: string | null): string {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const digits = value.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : '';
}

function mapsHref(address: string | null): string {
  if (!address) return '';
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

/** Agrupa días consecutivos con el mismo horario: "Lunes a viernes: 9:00 a 19:00". */
function groupHours(openingHours: ClinicOpeningHour[]): ClinicHours[] {
  const sorted = [...openingHours].sort((a, b) => a.weekday - b.weekday);
  const groups: ClinicHours[] = [];

  for (let i = 0; i < sorted.length; i += 1) {
    const current = sorted[i];
    const prev = sorted[i - 1];
    const last = groups[groups.length - 1];
    const time = `${formatTime(current.openMin)} a ${formatTime(current.closeMin)}`;
    const sameAsPrev =
      prev &&
      prev.weekday === current.weekday - 1 &&
      prev.openMin === current.openMin &&
      prev.closeMin === current.closeMin;

    if (sameAsPrev && last) {
      const [fromDay] = last.day.split(' a ');
      last.day = `${fromDay} a ${WEEKDAYS[current.weekday]}`;
      last.time = time;
    } else {
      groups.push({ day: WEEKDAYS[current.weekday], time });
    }
  }

  return groups;
}

function formatPrice(cents: number | null): string {
  if (cents == null) return 'A consultar';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** Convierte la proyección pública de la API al shape de la landing. */
export function toClinicData(payload: PublicClinic): ClinicData {
  return {
    slug: payload.slug,
    name: payload.name,
    tagline: payload.tagline ?? '',
    phone: payload.phone ?? '',
    phoneHref: telHref(payload.phone),
    whatsapp: whatsappHref(payload.whatsapp),
    email: payload.email ?? '',
    address: payload.address ?? '',
    mapsUrl: mapsHref(payload.address),
    hours: groupHours(payload.openingHours),
    openingHours: payload.openingHours,
    obrasSociales: payload.obrasSociales,
    treatments: payload.services.map((s) => ({
      name: s.name,
      detail: s.description ?? '',
      duration: `${s.durationMin} min`,
      price: formatPrice(s.priceCents),
    })),
    team: payload.doctors.map((d) => ({
      name: d.name,
      role: d.specialty ?? 'Odontología',
      license: d.bio ?? '',
      photo: d.photoUrl ?? `https://picsum.photos/seed/${d.id}/720/820`,
    })),
    testimonials: payload.testimonials.map((t) => ({
      quote: t.text,
      name: t.name,
      detail: '',
    })),
    faqs: payload.faqs,
  };
}

let cache: Promise<ClinicData> | null = null;

/**
 * Datos de la clínica para la landing. Una sola vez por render/build: el
 * resultado (o el fallback) se cachea a nivel de módulo y todos los
 * componentes comparten la misma promesa.
 *
 * Si `PUBLIC_CLINIC_SLUG` está vacío o la API no responde, cae al fixture local
 * (`data/clinic.ts`) para que el build nunca se rompa por falta de backend.
 */
export function getClinicData(): Promise<ClinicData> {
  cache ??= load();
  return cache;
}

async function load(): Promise<ClinicData> {
  if (!CLINIC_SLUG) {
    console.warn('[landing] PUBLIC_CLINIC_SLUG vacío; uso el fixture local.');
    return fallbackClinic;
  }

  try {
    const res = await fetch(`${API_URL}/api/public/clinic/${encodeURIComponent(CLINIC_SLUG)}`);
    if (!res.ok) throw new Error(`la API respondió ${res.status}`);
    return toClinicData((await res.json()) as PublicClinic);
  } catch (error) {
    console.warn(
      `[landing] no pude cargar la clínica "${CLINIC_SLUG}" desde ${API_URL} ` +
        `(${error instanceof Error ? error.message : error}); uso el fixture local.`,
    );
    return fallbackClinic;
  }
}

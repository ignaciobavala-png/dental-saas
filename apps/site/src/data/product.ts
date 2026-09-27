// Contenido del sitio de marketing del producto. Fixture editable.
// El nombre "Alvea" es provisorio: cambiarlo por el definitivo cuando se defina.

export const product = {
  name: 'Alvea',
  domain: 'alvea.com.ar',
  appUrl: 'https://app.alvea.com.ar',
} as const;

export const nav = [
  { label: 'Producto', href: '#producto' },
  { label: 'Secretaría IA', href: '#secretaria' },
  { label: 'Precios', href: '#precios' },
  { label: 'Preguntas', href: '#preguntas' },
] as const;

export const hero = {
  title: 'Tu clínica ordenada, atendiendo sola',
  subtitle:
    'Web propia, secretaría con IA que agenda de verdad y gestión clínica en un mismo lugar. Sin instalar nada.',
  primaryCta: { label: 'Empezá ahora', href: '#precios' },
  secondaryCta: { label: 'Ver la secretaría IA', href: '#secretaria' },
  image: { src: '/screens/agenda.webp', alt: 'Agenda del consultorio con turnos por profesional' },
} as const;

export const trust = [
  { icon: 'Globe', label: '100% web, sin instalar nada' },
  { icon: 'ArrowRightLeft', label: 'Migración de pacientes sin costo' },
  { icon: 'CalendarX2', label: 'Sin permanencia' },
  { icon: 'ShieldCheck', label: 'Datos cifrados en Cloudflare' },
] as const;

export const pains = [
  {
    title: 'El teléfono ocupado pierde turnos',
    text: 'Mientras atendés en el box, la línea suena y el paciente prueba en otro lado.',
  },
  {
    title: 'No vienen y nadie reagenda',
    text: 'Cada ausencia deja un hueco en la agenda que no vuelve a llenarse.',
  },
  {
    title: 'La ficha y el presupuesto en cuadernos',
    text: 'Historia clínica, plan de tratamiento y turnos viven en lugares distintos.',
  },
] as const;

export const pillars = [
  {
    id: 'web',
    tag: 'Web propia',
    title: 'Tu consultorio con web, no un perfil perdido',
    text: 'Tratamientos, equipo, obras sociales, ubicación y turnos online en tu propio dominio. Elegís un preset, subís logo y fotos, y queda publicada.',
    features: [
      'Presets de color y tipografía curados',
      'Tratamientos y equipo editables',
      'Obras sociales y mapa',
      'Reserva de turnos online',
      'Datos para Google (SEO)',
      'Tu dominio propio',
    ],
    image: { src: '/screens/web.webp', alt: 'Web del consultorio en un celular' },
    flip: false,
  },
  {
    id: 'gestion',
    tag: 'Gestión',
    title: 'Agenda, ficha y plan en un solo lugar',
    text: 'Turnos por profesional y por box, odontograma, plan de tratamiento y evolución, con recalls y lista de espera que alimentan a la IA.',
    features: [
      'Agenda por profesional y box',
      'Odontograma interactivo (FDI)',
      'Plan de tratamiento y presupuesto',
      'Evolución clínica',
      'Recalls y lista de espera',
      'Reportes del día',
    ],
    image: { src: '/screens/ficha.webp', alt: 'Ficha del paciente con odontograma' },
    flip: true,
  },
] as const;

export const secretaria = {
  tag: 'Secretaría IA',
  title: 'Una secretaria que atiende 24/7 y agenda sola',
  text: 'Responde consultas en la web, muestra los horarios libres de verdad y deja el turno reservado. Si la conversación lo pide, sigue por WhatsApp.',
  bullets: [
    'Responde al instante, incluso fuera de horario',
    'Muestra disponibilidad real de la agenda',
    'Reserva, confirma y reagenda',
    'Deriva a WhatsApp cuando hace falta',
    'Nunca accede a la ficha clínica',
  ],
  chat: [
    { from: 'patient', text: 'Hola, ¿atienden OSDE? Me duele una muela.' },
    { from: 'bot', text: 'Sí, trabajamos con OSDE. Tengo estos turnos para odontología general:' },
    { from: 'slots' },
    { from: 'patient', text: 'El jueves 16:30 me sirve.' },
    { from: 'bot', text: 'Listo, Carolina. Te anoté el jueves 16:30 con la Dra. Ferreyra. Te llega la confirmación por mail.' },
  ],
} as const;

export const steps = [
  {
    title: 'Cargá tu consultorio',
    text: 'Elegís la web, subís logo y fotos, y cargás profesionales y horarios. Treinta minutos, sin conocimientos técnicos.',
  },
  {
    title: 'Conectá tu agenda',
    text: 'Importamos tus pacientes y turnos del sistema que uses hoy, sin costo de migración.',
  },
  {
    title: 'Dejá que atienda',
    text: 'La secretaría IA responde y reserva sola. Vos ves todo — turnos, fichas y pendientes — en el panel.',
  },
] as const;

export const facts = [
  { value: '24/7', label: 'atendiendo consultas' },
  { value: '0', label: 'programas para instalar' },
  { value: '30 min', label: 'de cero a publicada' },
  { value: '1', label: 'cuenta para todo' },
] as const;

export const testimonials = [
  {
    quote:
      'Antes perdíamos turnos porque no llegábamos al teléfono. Ahora los pacientes reservan solos y yo llego a la consulta con la ficha ya cargada.',
    name: 'Dra. Malena Ferreyra',
    role: 'Odontología general, Caballito',
  },
  {
    quote:
      'La migración fue lo que me convenció: pasaron los pacientes y los turnos sin que yo tocara nada. En una semana ya estaba andando.',
    name: 'Dr. Tomás Aguirre',
    role: 'Ortodoncia, Flores',
  },
  {
    quote:
      'Trabajar con obras sociales era un lío de planillas. Con la web y la agenda en el mismo lugar, la recepción respira.',
    name: 'Dra. Sofía Bermúdez',
    role: 'Endodoncia, Almagro',
  },
] as const;

export const pricing = {
  price: 'US$57',
  period: 'por consultorio, por mes',
  note: 'Sin permanencia. Migración de pacientes sin costo.',
  includes: [
    'Web propia en tu dominio',
    'Reserva de turnos online',
    'Secretaría IA 24/7',
    'Agenda por profesional y box',
    'Ficha con odontograma y plan de tratamiento',
    'Recalls y lista de espera',
    'Panel de gestión del día',
    'Soporte por WhatsApp',
  ],
  cta: { label: 'Empezá ahora', href: '#empezar' },
  secondary: { label: 'Pedí una demo', href: '#empezar' },
} as const;

export const faqs = [
  {
    q: '¿Tengo que instalar algo?',
    a: 'No. Es 100% web: se usa desde la computadora del consultorio, una tablet o el celular, con cualquier navegador actualizado.',
  },
  {
    q: 'Ya uso otro software, ¿puedo migrar?',
    a: 'Sí. Importamos pacientes y turnos del sistema que uses hoy. La migración está incluida y no tiene costo.',
  },
  {
    q: '¿La secretaría IA reserva sola?',
    a: 'Reserva sobre los horarios libres reales de tu agenda y confirma el turno. Nunca toca la ficha clínica: eso es siempre tuyo, desde el panel.',
  },
  {
    q: '¿Sirve si trabajo con obras sociales?',
    a: 'Sí. Cargás tus coberturas y quedan visibles en la web, en la ficha y en el presupuesto del paciente.',
  },
  {
    q: '¿Puedo tener varios profesionales?',
    a: 'Sí. La agenda se organiza por profesional y por box, con los horarios de cada uno y el precio de cada tratamiento.',
  },
  {
    q: '¿Dónde están los datos y quién los ve?',
    a: 'Corren en Cloudflare, cifrados y aislados por consultorio. Cada clínica ve únicamente su propia información.',
  },
] as const;

export const finalCta = {
  title: 'Empezá a ordenar tu clínica esta semana',
  text: 'Te ayudamos a publicar tu web y a migrar tus pacientes. Sin permanencia y sin riesgo.',
  cta: { label: 'Empezá ahora', href: '#empezar' },
} as const;

export const footer = {
  columns: [
    {
      title: 'Producto',
      links: [
        { label: 'Web propia', href: '#producto' },
        { label: 'Secretaría IA', href: '#secretaria' },
        { label: 'Gestión clínica', href: '#producto' },
        { label: 'Precios', href: '#precios' },
      ],
    },
    {
      title: 'Recursos',
      links: [
        { label: 'Preguntas frecuentes', href: '#preguntas' },
        { label: 'Guía de migración', href: '#empezar' },
        { label: 'Pedí una demo', href: '#empezar' },
      ],
    },
    {
      title: 'Contacto',
      links: [
        { label: 'hola@alvea.com.ar', href: 'mailto:hola@alvea.com.ar' },
        { label: 'WhatsApp', href: 'https://wa.me/5491100000000' },
      ],
    },
  ],
  legal: 'Producto en pruebas con consultorios de Buenos Aires.',
} as const;

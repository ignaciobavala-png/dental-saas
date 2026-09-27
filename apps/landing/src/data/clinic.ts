// Fixture de la clínica para la maqueta. En producción esto sale de la API
// (service binding) según el hostname. Ver docs/09-frontend.md.

export const clinic = {
  name: 'Arocena',
  fullName: 'Odontología Arocena',
  tagline: 'Odontología en Caballito',
  phone: '+54 11 4633 7842',
  phoneHref: 'tel:+541146337842',
  whatsapp: 'https://wa.me/5491146337842',
  email: 'hola@odontologiaarocena.com.ar',
  address: {
    street: 'Av. Rivadavia 4820',
    locality: 'Caballito',
    city: 'CABA',
    zip: 'C1424',
  },
  mapsUrl: 'https://maps.google.com/?q=Av.+Rivadavia+4820,+Caballito,+CABA',
  hours: [
    { day: 'Lunes a viernes', time: '9:00 a 19:00' },
    { day: 'Sábados', time: '9:00 a 13:00' },
  ],
  obrasSociales: ['OSDE', 'Swiss Medical', 'Galeno', 'IOMA', 'Medicus', 'Omint'],
  treatments: [
    {
      name: 'Odontología general',
      detail: 'Control, limpieza y tratamientos de caries.',
      duration: '30 a 45 min',
      price: 'Consulta desde $18.000',
    },
    {
      name: 'Ortodoncia',
      detail: 'Brackets metálicos, estéticos y alineadores invisibles.',
      duration: 'Controles cada 4 semanas',
      price: 'Plan desde $45.000 por mes',
    },
    {
      name: 'Implantes',
      detail: 'Implante unitario y coronas, con tomografía previa.',
      duration: 'Según plan de tratamiento',
      price: 'Presupuesto sin cargo',
    },
    {
      name: 'Estética dental',
      detail: 'Blanqueamiento en consultorio y carillas.',
      duration: '1 sesión de 60 min',
      price: 'Blanqueamiento $95.000',
    },
    {
      name: 'Endodoncia',
      detail: 'Tratamiento de conducto con microscopio.',
      duration: '1 o 2 sesiones',
      price: 'Desde $60.000',
    },
    {
      name: 'Odontopediatría',
      detail: 'Atención de chicos desde los 3 años.',
      duration: '30 min',
      price: 'Consulta desde $15.000',
    },
  ],
  team: [
    {
      name: 'Dra. Malena Ferreyra',
      role: 'Directora y odontología general',
      license: 'MN 34.812',
      photo: 'https://picsum.photos/seed/ferreyra-odontologa/720/820',
    },
    {
      name: 'Dr. Tomás Aguirre',
      role: 'Ortodoncia y estética',
      license: 'MN 41.209',
      photo: 'https://picsum.photos/seed/aguirre-ortodoncia/720/820',
    },
    {
      name: 'Dra. Sofía Bermúdez',
      role: 'Endodoncia y odontopediatría',
      license: 'MN 38.554',
      photo: 'https://picsum.photos/seed/bermudez-endodoncia/720/820',
    },
  ],
  testimonials: [
    {
      quote:
        'Hace cuatro años que vengo con toda la familia. Siempre consigo turno rápido y me explican cada paso del tratamiento.',
      name: 'Carolina Iriarte',
      detail: 'Paciente desde 2022',
    },
    {
      quote:
        'Me resolvieron una urgencia un sábado sin turno. Un trato impecable.',
      name: 'Rubén Sández',
      detail: 'Implante en 2024',
    },
  ],
  faqs: [
    {
      q: '¿Atienden por obra social?',
      a: 'Sí. Trabajamos con OSDE, Swiss Medical, Galeno, IOMA, Medicus y Omint, y también recibimos reintegros de otras coberturas. Contanos tu caso en la consulta.',
    },
    {
      q: '¿Cómo consigo un turno?',
      a: 'Podés reservar desde esta página con la secretaría virtual, que te muestra los horarios libres, o escribirnos por WhatsApp en el horario del consultorio.',
    },
    {
      q: '¿Atienden urgencias?',
      a: 'Sí. Reservamos franjas del día para dolor o traumatismos. Si es urgente, llamanos por teléfono y te ubicamos en el primer hueco.',
    },
    {
      q: '¿Los implantes tienen garantía?',
      a: 'Sí, los implantes y las coronas tienen garantía. Te la damos por escrito al cerrar el presupuesto.',
    },
    {
      q: '¿Aceptan pago en cuotas?',
      a: 'Los tratamientos largos se abonan por etapa, y con tarjeta podés financiar en cuotas según el plan de tu banco.',
    },
  ],
} as const;

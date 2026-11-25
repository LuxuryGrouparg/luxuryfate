// Todo el contenido editable de la web. Cambiá acá precios, horarios y datos de contacto.
// Los datos de contacto son de ejemplo: reemplazalos por los reales antes de publicar.

export type Service = {
  id: string;
  name: string;
  detail: string;
  price: number; // ARS
  /** Se muestra destacado en la agenda, con la etiqueta "Recomendado". */
  featured?: boolean;
};

export type SiteImage = {
  /** Ruta dentro de /public, por ejemplo '/images/hero.jpg'. Vacío = se muestra un placeholder. */
  src: string;
  alt: string;
  /** Qué foto va en este lugar (se ve en el placeholder y en el README). */
  label: string;
};

export const site = {
  name: 'Luxury Fade Studio',
  // En Vercel, sin NEXT_PUBLIC_SITE_URL, usa el dominio de producción del proyecto (o el propio, si lo conectás).
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000'),
  seo: {
    title: 'Luxury Fade Studio · Cuidado personal masculino a domicilio en Corrientes y Resistencia',
    description:
      'Experiencia privada de cuidado personal masculino a domicilio en Corrientes Capital y Resistencia. Corte, barba y rituales en tu casa, tu oficina o el espacio que elijas.',
  },

  nav: [
    { href: '#about', label: 'Nosotros' },
    { href: '#contact', label: 'Contacto' },
    { href: '#gallery', label: 'Galería' },
  ],

  contact: {
    whatsappDisplay: '+54 9 379 555-0123',
    whatsappNumber: '5493795550123', // sin +, espacios ni guiones (formato wa.me)
    email: 'hola@luxuryfadestudio.com.ar',
    instagram: 'https://instagram.com/luxuryfadestudio',
  },

  coverage: {
    cities: ['Corrientes Capital', 'Resistencia'],
    detail: 'Casa, oficina o el espacio que elijas',
  },

  hours: {
    display: 'Lunes a sábado, con turno previo',
    // Para el JSON-LD de SEO.
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    // Turnos de 1 hora: el primero a la hora de apertura, el último una hora antes del cierre (10:00 … 19:00).
    opens: '10:00',
    closes: '20:00',
  },

  /** Botón flotante de WhatsApp. */
  whatsappFloat: false,

  // Todos los turnos duran 1 hora, sea cual sea el servicio.
  services: [
    { id: 'corte', name: 'Corte', detail: 'Corte a medida', price: 12000 },
    { id: 'corte-barba', name: 'Corte + barba', detail: 'Corte y barba, cejas de regalo', price: 14000 },
    { id: 'barba', name: 'Barba', detail: 'Solo barba', price: 5000 },
    {
      id: 'experiencia-completa',
      name: 'Experiencia completa',
      detail: 'Corte, barba, cejas y unos 5 minutos de masaje en hombros y nuca con pistola de masajes',
      price: 17000,
      featured: true,
    },
  ] as Service[],

  // Beneficios del Studio. Poné `active: false` para apagar uno; si no queda ninguno, la franja de arriba no se muestra.
  promos: {
    martesStudio: {
      active: true,
      label: 'Martes de Studio',
      text: 'Martes de Studio: tu corte a $8.000.',
      weekday: 2, // 0 = domingo, 2 = martes
      serviceId: 'corte',
      price: 8000,
    },
    ritualMensual: {
      active: true,
      text: 'Ritual mensual: en tu cuarto corte del mes, 50% off.',
      short: 'Ritual mensual: tu 4.º corte del mes con 50% off.',
    },
  },

  moments: [
    { title: 'La llegada', line: 'Puntuales, impecables.' },
    { title: 'La consulta', line: 'Tu estilo, primero.' },
    { title: 'El ritual', line: 'Precisión en cada detalle.' },
    { title: 'El acabado', line: 'Productos y consejos a medida.' },
    { title: 'La experiencia', line: 'Algo que vale la pena repetir.' },
  ],

  images: {
    hero: {
      src: '/images/hero.jpg',
      alt: 'Afeitado con navaja en penumbra',
      label: 'Foto B/N a pantalla completa: retrato masculino editorial, luz lateral',
    },
    // Mosaico (app/page.tsx): 1 y 3 altas, 2 y 4 chicas, 5 horizontal a todo el ancho.
    gallery: [
      { src: '/images/gallery-5-perfil.jpg', alt: 'Cliente de perfil en penumbra', label: 'Retrato de perfil, corte terminado' },
      { src: '/images/gallery-1-manos.jpg', alt: 'Manos del barbero con navaja, cliente reclinado con toalla', label: 'Manos y navaja' },
      { src: '/images/gallery-3-barba.jpg', alt: 'Perfilado de barba con navaja', label: 'Perfilado de barba' },
      { src: '/images/gallery-2-terminacion.jpg', alt: 'Terminación de un corte con tijera', label: 'Detalle de fade' },
      { src: '/images/gallery-6-afeitado.jpg', alt: 'Afeitado con toalla caliente', label: 'Horizontal: servicio en un living, luz de ventana' },
    ],
    contact: {
      src: '/images/contacto.jpg',
      alt: 'Living elegante con sillón de cuero',
      label: 'Foto B/N: grooming en una oficina o living elegante',
    },
  } satisfies Record<string, SiteImage | SiteImage[]>,
};

export const whatsappUrl = `https://wa.me/${site.contact.whatsappNumber}`;

export const formatPrice = (n: number) => `$${n.toLocaleString('es-AR')}`;

/** Mensaje de WhatsApp que se abre al confirmar el turno. Editá el texto acá. */
export const whatsappMessage = (b: {
  clientType: 'nuevo' | 'habitual';
  service: string;
  price: number;
  promo: string | null; // nombre del beneficio aplicado, o null
  day: string; // 'Martes 01/12'
  time: string;
  address: string;
  city: string;
  name: string;
  note: string;
}) => `Hola ${site.name}, quiero confirmar mi turno:

• Cliente: ${b.clientType}
• Servicio: ${b.service} – ${formatPrice(b.price)}${b.promo ? ` (${b.promo})` : ''}
• Día: ${b.day} a las ${b.time} h
• Dirección: ${b.address}, ${b.city}
• Nombre: ${b.name}
• Nota: ${b.note || '—'}

¡Gracias!`;

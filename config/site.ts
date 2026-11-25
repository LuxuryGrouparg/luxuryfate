// Todo el contenido editable de la web. Cambiá acá precios, horarios y datos de contacto.
// Los datos de contacto son de ejemplo: reemplazalos por los reales antes de publicar.

export type Category = 'Cortes' | 'Barba' | 'Rituales';

export type Service = {
  id: string;
  name: string;
  durationMin: number;
  price: number; // ARS
  category: Category;
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
    opens: '10:00',
    closes: '20:00',
  },

  /** Botón flotante de WhatsApp. */
  whatsappFloat: false,

  services: [
    { id: 'corte-clasico', name: 'Corte clásico', durationMin: 45, price: 18000, category: 'Cortes' },
    { id: 'corte-barba', name: 'Corte + barba', durationMin: 75, price: 26000, category: 'Cortes' },
    { id: 'afeitado-navaja', name: 'Afeitado con navaja', durationMin: 40, price: 16000, category: 'Barba' },
    { id: 'perfilado-barba', name: 'Perfilado de barba', durationMin: 30, price: 12000, category: 'Barba' },
    { id: 'ritual-luxury', name: 'Ritual Luxury', durationMin: 100, price: 38000, category: 'Rituales' },
    { id: 'lavado-masaje', name: 'Lavado + masaje capilar', durationMin: 20, price: 9000, category: 'Rituales' },
    { id: 'color-canas', name: 'Color / camuflaje de canas', durationMin: 60, price: 22000, category: 'Cortes' },
  ] satisfies Service[],

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

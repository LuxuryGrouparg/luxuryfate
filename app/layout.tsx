import type { Metadata } from 'next';
import { Archivo } from 'next/font/google';
import { site } from '@/config/site';
import './globals.css';

// Fuente variable con eje de ancho: los títulos usan font-stretch 72% (ver .hx en globals.css).
const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
});

const heroImage = site.images.hero.src;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: site.seo.title,
  description: site.seo.description,
  applicationName: site.name,
  openGraph: {
    title: site.seo.title,
    description: site.seo.description,
    siteName: site.name,
    locale: 'es_AR',
    type: 'website',
    images: heroImage ? [heroImage] : undefined,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: site.name,
  description: site.seo.description,
  url: site.url,
  image: heroImage ? new URL(heroImage, site.url).href : undefined,
  telephone: `+${site.contact.whatsappNumber}`,
  email: site.contact.email,
  areaServed: [
    { '@type': 'City', name: 'Corrientes' },
    { '@type': 'City', name: 'Resistencia' },
  ],
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: site.hours.days,
    opens: site.hours.opens,
    closes: site.hours.closes,
  },
  sameAs: [site.contact.instagram],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={archivo.variable}>
      <body>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}

'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { SiteImage } from '@/config/site';

/** Evento que abre la ventana de agenda (components/BookingPanel.tsx). */
export const OPEN_BOOKING_EVENT = 'lf:open-booking';

export function BookButton({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_BOOKING_EVENT))}>
      {children}
    </button>
  );
}

export function InstagramIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r=".9" fill="currentColor" />
    </svg>
  );
}

/** Foto con next/image, o el placeholder del diseño si todavía no hay archivo. */
export function Photo({
  img,
  className = '',
  sizes,
  priority,
}: {
  img: SiteImage;
  className?: string;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <div className={`ph group relative overflow-hidden ${className}`}>
      {img.src ? (
        <Image
          src={img.src}
          alt={img.alt}
          fill
          sizes={sizes}
          priority={priority}
          className="bw object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
      ) : (
        <span className="ph-label">{img.label}</span>
      )}
    </div>
  );
}

/** Aparición suave (fade + leve desplazamiento) al entrar en pantalla. */
export function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(ref.current!);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`${className} transition duration-700 ease-out motion-reduce:transition-none ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
      }`}
    >
      {children}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { site } from '@/config/site';
import { BookButton, InstagramIcon } from './ui';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header id="top" className="border-b border-line bg-black">
      <div className="mx-auto grid max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-4 md:grid-cols-3 md:gap-4 md:px-10 md:py-[22px]">
        <div>
          <button
            type="button"
            className="flex h-10 w-10 cursor-pointer items-center text-white md:hidden"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 7h18M3 12h18M3 17h18" />}
            </svg>
          </button>
          <nav aria-label="Principal" className="lb hidden flex-wrap gap-7 md:flex">
            {site.nav.map((l) => (
              <a key={l.href} href={l.href} className="text-muted">
                {l.label}
              </a>
            ))}
          </nav>
        </div>

        <a href="#top" className="flex flex-col items-center gap-1 text-center text-white" aria-label={`${site.name}, volver arriba`}>
          <span className="hx text-[17px] font-bold tracking-[.14em] whitespace-nowrap md:text-[26px]">LUXURY FADE</span>
          <span className="lb pl-[.5em] text-[7px] tracking-[.5em] whitespace-nowrap text-dim md:text-[9px]">Studio · Experiencia privada</span>
        </a>

        <div className="flex items-center justify-end gap-[22px]">
          <a href={site.contact.instagram} aria-label={`Instagram de ${site.name}`} className="hidden md:flex">
            <InstagramIcon size={20} />
          </a>
          <BookButton className="btn-primary px-3 py-3 text-[10px] tracking-[.16em] md:px-6 md:py-[13px] md:text-[11px] md:tracking-[.22em]">
            Agendar
          </BookButton>
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-menu" aria-label="Principal" className="flex flex-col border-t border-line px-4 pb-4 md:hidden">
          {site.nav.map((l) => (
            <a key={l.href} href={l.href} className="lb border-b border-line py-4 text-muted" onClick={() => setMenuOpen(false)}>
              {l.label}
            </a>
          ))}
          <a href={site.contact.instagram} className="lb flex items-center gap-3 py-4 text-white">
            <InstagramIcon size={18} /> Instagram
          </a>
        </nav>
      )}
    </header>
  );
}

import BookingPanel from '@/components/BookingPanel';
import Header from '@/components/Header';
import { BookButton, InstagramIcon, Photo, Reveal } from '@/components/ui';
import { site, whatsappUrl } from '@/config/site';

const contactLabel = 'lb mb-2 text-[10px] text-dim';
const footLabel = 'lb mb-3 text-[10px] text-ivory';
// Mosaico de la galería en desktop (mobile: 1 columna).
const TILE = ['md:row-span-2', '', 'md:row-span-2', '', 'md:col-span-full aspect-[3/2] md:aspect-auto'];

const perks = Object.values(site.promos)
  .filter((p) => p.active)
  .map((p) => p.text);

export default function Home() {
  const { contact, coverage } = site;

  return (
    <>
      {/* Franja de beneficios: solo si hay alguno activo (config/site.ts → promos) */}
      {perks.length > 0 && (
        // En celular queda en una línea y se desliza de costado si no entra.
        <div className="overflow-x-auto bg-green-900 px-4 py-2.5 text-[10px] leading-[1.6] tracking-[.18em] whitespace-nowrap text-green-200 uppercase [scrollbar-width:none] md:text-center md:text-[11px]">
          {perks.join(' · ')}
          {' · '}
          <BookButton className="cursor-pointer tracking-[.18em] text-white uppercase underline decoration-green-400 underline-offset-4 hover:decoration-white">
            Agendar
          </BookButton>
        </div>
      )}
      <Header />

      <main>
        {/* Portada */}
        <section className="relative flex h-svh min-h-[560px] justify-center md:h-[840px]">
          <Photo img={site.images.hero} sizes="100vw" priority className="absolute! inset-0" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,8,.15)_0%,rgba(8,8,8,.25)_50%,rgba(8,8,8,.85)_100%)]" />
          <div className="relative flex w-full max-w-[1400px] flex-col justify-end gap-10 px-4 pb-12 md:px-10">
            <div className="flex flex-col">
              <h1 className="sr-only">Más que un corte.</h1>
              <span aria-hidden="true" className="hx text-[clamp(64px,11vw,168px)] leading-[.86] text-white">
                Más que
              </span>
              <div className="flex flex-wrap-reverse items-end justify-between gap-x-6 gap-y-4">
                <p className="mb-2.5 max-w-[300px] text-xs leading-[1.7] tracking-[.06em] text-muted uppercase">
                  Cuidado personal privado a domicilio. {coverage.cities.join(' y ')}.
                </p>
                <span aria-hidden="true" className="hx text-[clamp(64px,11vw,168px)] leading-[.86] font-light text-white">
                  un corte.
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-[18px]">
              <BookButton className="btn-primary px-12 py-5 text-xs tracking-[.3em] md:px-[68px]">Agendar turno</BookButton>
              <a
                href={contact.instagram}
                aria-label={`Instagram de ${site.name}`}
                className="flex h-11 w-11 items-center justify-center border border-dim"
              >
                <InstagramIcon size={17} />
              </a>
            </div>
          </div>
        </section>

        {/* Nosotros */}
        <section id="about" className="bg-ivory px-4 py-24 text-black md:px-10 md:py-[130px]">
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-x-6 gap-y-14 md:grid-cols-12">
            <div className="lb flex flex-wrap items-baseline justify-between gap-3 border-b border-black pb-[18px] text-grey md:col-span-12">
              <span className="text-green-700">01 — Nosotros</span>
              <span>{site.name} · Experiencia privada</span>
            </div>
            <h2 className="hx text-[clamp(44px,6.4vw,104px)] leading-[.9] md:col-span-7">
              No es solamente cómo te ves.
              <br />
              <span className="font-light">Es cómo te sentís.</span>
            </h2>
            <div className="flex flex-col gap-[22px] self-end text-base leading-[1.75] font-light text-line md:col-span-4 md:col-start-9">
              <p>
                En un mundo donde todo sucede rápido, creemos que hay algo que merece más atención: vos. Por eso transformamos la barbería
                tradicional en una experiencia privada y personalizada.
              </p>
              <p>
                Llevamos el servicio a tu casa, tu oficina o el espacio que elijas. Sin esperas, sin traslados, sin adaptarte a nadie.{' '}
                {site.name} se adapta a vos.
              </p>
              <p>Porque el lujo no siempre está en lo que tenés, sino en el tiempo y la atención que te dedicás.</p>
              <div className="lb mt-2 flex flex-col gap-2 text-[10px] text-grey">
                <span>A domicilio en {coverage.cities.join(' y ')}</span>
                <span>Turnos privados, coordinados con anticipación</span>
                <span>Turnos de 1 hora, dedicados solo a vos</span>
              </div>
            </div>
            <ol className="grid grid-cols-2 border-t border-green-400 md:col-span-12 md:grid-cols-5">
              {site.moments.map((m, i) => (
                <li
                  key={m.title}
                  className="border-[#CFCFCC] pt-[26px] pr-5 pb-6 last:col-span-2 md:border-r md:pb-0 md:pl-5 md:first:pl-0 md:last:col-span-1 md:last:border-r-0 md:last:pr-0"
                >
                  <div className="lb text-[10px] text-green-700">{String(i + 1).padStart(2, '0')}</div>
                  <div className="hx mt-2.5 text-2xl">{m.title}</div>
                  <div className="mt-1.5 text-[13px] text-grey">{m.line}</div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Galería */}
        <section id="gallery" className="px-4 py-24 md:px-10 md:py-[130px]">
          <div className="mx-auto mb-11 flex max-w-[1400px] flex-wrap items-end justify-between gap-4 border-b border-line pb-[22px]">
            <h2 className="hx text-[clamp(48px,6vw,96px)] leading-[.9]">
              Los <span className="font-light">detalles</span>
            </h2>
            <span className="lb text-dim">El arte de ser vos mismo</span>
          </div>
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-3 md:auto-rows-[340px] md:grid-cols-3">
            {site.images.gallery.map((img, i) => (
              <Reveal key={img.label} delay={(i % 3) * 120} className={`aspect-[4/5] md:aspect-auto ${TILE[i] ?? ''}`}>
                <Photo img={img} sizes={i === 4 ? '(min-width:768px) 1400px, 100vw' : '(min-width:768px) 33vw, 100vw'} className="h-full" />
              </Reveal>
            ))}
          </div>
        </section>

        {/* Contacto */}
        <section id="contact" className="bg-contact">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-stretch">
            <Photo
              img={site.images.contact}
              sizes="(min-width:1024px) 55vw, 100vw"
              className="min-h-[420px] grow basis-[560px] md:min-h-[620px]"
            />
            <div className="flex grow basis-[380px] flex-col justify-center gap-[34px] px-4 py-20 md:px-14 md:py-[90px]">
              <span className="lb text-green-200">03 — Contacto</span>
              <h2 className="hx text-[clamp(48px,5vw,80px)] leading-[.9]">
                Vamos a
                <br />
                <span className="font-light">donde estés.</span>
              </h2>
              <div className="grid grid-cols-1 gap-7 border-t border-line pt-7 text-[15px] leading-[1.7] text-muted sm:grid-cols-2">
                <div>
                  <div className={contactLabel}>Cobertura</div>
                  {coverage.cities.join(' y ')}. {coverage.detail}.
                </div>
                <div>
                  <div className={contactLabel}>Horarios</div>
                  {site.hours.display}.
                </div>
                <div>
                  <div className={contactLabel}>WhatsApp</div>
                  <a href={whatsappUrl}>{contact.whatsappDisplay}</a>
                </div>
                <div>
                  <div className={contactLabel}>Email</div>
                  <a href={`mailto:${contact.email}`} className="break-all">
                    {contact.email}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-black px-4 pt-20 pb-10 md:px-10">
        <div className="mx-auto grid max-w-[1400px] grid-cols-[repeat(auto-fit,minmax(220px,1fr))] items-start gap-10 text-[13px] leading-[1.8] text-dim">
          <div>
            <div className={footLabel}>Cobertura</div>
            Servicio a domicilio
            <br />
            {coverage.cities.join(' · ')}
          </div>
          <div>
            <div className={footLabel}>Contacto</div>
            {contact.email}
            <br />
            <a href={whatsappUrl} className="text-dim">
              {contact.whatsappDisplay}
            </a>
          </div>
          <div className="text-center">
            <div className="hx text-2xl font-bold tracking-[.14em] text-white">LUXURY FADE STUDIO</div>
            <div className="mt-2">El lujo de tu propio tiempo.</div>
          </div>
          <div className="flex flex-col items-start gap-3.5 md:items-end">
            <nav aria-label="Pie de página" className="lb flex gap-5 text-[10px]">
              {site.nav.map((l) => (
                <a key={l.href} href={l.href} className="text-muted">
                  {l.label}
                </a>
              ))}
            </nav>
            <BookButton className="btn-outline px-[22px] py-3 text-[11px] tracking-[.22em]">Agendar</BookButton>
          </div>
        </div>
        <div className="mx-auto mt-16 flex max-w-[1400px] flex-wrap justify-between gap-3 border-t border-line pt-6 text-[11px] tracking-[.08em] text-[#5E5E5E]">
          <span>© 2026 {site.name} · Experiencia privada de cuidado personal · Corrientes y Resistencia, Argentina</span>
          <span className="hx text-[13px] tracking-[.2em] text-dim">Más que un corte.</span>
        </div>
      </footer>

      <BookingPanel />

      {site.whatsappFloat && (
        <a
          href={whatsappUrl}
          aria-label="Escribinos por WhatsApp"
          className="fixed right-5 bottom-5 z-10 flex h-14 w-14 items-center justify-center rounded-full border border-ivory bg-black text-ivory"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" />
          </svg>
        </a>
      )}
    </>
  );
}

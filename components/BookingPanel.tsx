'use client';

import { useEffect, useRef, useState } from 'react';
import { formatPrice, site, whatsappMessage } from '@/config/site';
import type { Slot } from '@/lib/availability';
import { isPromoDay, NOTE_MAX, priceFor, validateBooking, type BookingForm, type City, type ClientType, type FormErrors } from '@/lib/booking';
import { addDays, arNow, dayNum, dowShort, isSunday, longLabel } from '@/lib/dates';
import { OPEN_BOOKING_EVENT } from './ui';

const TITLES = ['', 'Bienvenido', 'Elegí tu experiencia', 'Elegí día y horario', 'Tus datos', '¡Listo!'];
const CLIENTS: { id: ClientType; name: string; note: string; ini: string }[] = [
  { id: 'nuevo', name: 'Cliente nuevo', note: 'Empezamos con una consulta para conocer tu estilo y lo que buscás.', ini: '1ª' },
  { id: 'habitual', name: 'Cliente habitual', note: 'Tu ritual de siempre, donde estés.', ini: 'LF' },
];
const CITIES: { id: City; name: string }[] = [
  { id: 'corrientes', name: 'Corrientes Capital' },
  { id: 'resistencia', name: 'Resistencia' },
];
const SERVICES = [...site.services].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
const MIN_PRICE = Math.min(...site.services.map((s) => s.price));
const EMPTY_FORM: BookingForm = { firstName: '', lastName: '', whatsapp: '', city: 'corrientes', address: '', note: '' };
const { martesStudio, ritualMensual } = site.promos;

const card = (selected: boolean) =>
  selected ? 'border-green-400 bg-green-700' : 'border-bk-line bg-bk-card hover:border-green-400';
const sectionLabel = 'text-xs tracking-[.2em] text-dim uppercase';
const greenTag = 'inline-block border border-green-400 px-2 py-1 text-[10px] tracking-[.16em] text-green-200 uppercase';
const inputCls =
  'w-full border border-bk-line bg-bk-card p-[11px] text-sm text-ivory placeholder:text-[#5E5E5E] aria-invalid:border-[#C9705F] focus-visible:border-white focus-visible:outline-none';

/** 'Martes 01/12' */
const shortDay = (iso: string) => `${longLabel(iso).split(' ')[0]} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export default function BookingPanel() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [client, setClient] = useState<ClientType | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [days, setDays] = useState<string[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotsError, setSlotsError] = useState(false);
  const [reload, setReload] = useState(0);
  const [time, setTime] = useState<string | null>(null);
  const [form, setForm] = useState<BookingForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [waUrl, setWaUrl] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  // true mientras el día lo eligió la agenda (no la persona): si no tiene turnos, pasa al siguiente.
  const autoDate = useRef(false);

  const service = site.services.find((s) => s.id === serviceId) ?? null;
  const { price, promo } = service ? priceFor(service.id, date) : { price: 0, promo: null };
  const promoDay = !!date && isPromoDay(date);

  const showPanel = () => {
    openerRef.current = document.activeElement as HTMLElement | null;
    const today = arNow().date;
    setDays(Array.from({ length: 7 }, (_, i) => addDays(today, i)));
    setOpen(true);
  };

  // Abrir desde cualquier botón "Agendar".
  useEffect(() => {
    window.addEventListener(OPEN_BOOKING_EVENT, showPanel);
    return () => window.removeEventListener(OPEN_BOOKING_EVENT, showPanel);
  }, []);

  // Bloquear el scroll de la página y devolver el foco al cerrar.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      openerRef.current?.focus();
    };
  }, [open]);

  // Llevar el foco al título en cada paso para que se anuncie.
  useEffect(() => {
    if (open) titleRef.current?.focus();
  }, [open, step]);

  // Horarios disponibles del día elegido.
  useEffect(() => {
    if (step !== 3 || !date) return;
    const ac = new AbortController();
    setSlots(null);
    setSlotsError(false);
    fetch(`/api/availability?date=${date}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j: { slots: Slot[] }) => {
        const next = days.slice(days.indexOf(date) + 1).find((d) => !isSunday(d));
        if (autoDate.current && next && !j.slots.some((s) => s.available)) setDate(next);
        else setSlots(j.slots);
      })
      .catch(() => !ac.signal.aborted && setSlotsError(true));
    return () => ac.abort();
  }, [step, date, reload, days]);

  if (!open) return null;

  const close = () => {
    setOpen(false);
    if (step === 5) {
      setClient(null);
      setServiceId(null);
      setDate(null);
      setTime(null);
      setForm(EMPTY_FORM);
      setErrors({});
      setWaUrl(null);
    }
    setSubmitError(null);
    setStep(1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusables = [
      ...panelRef.current!.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea, a[href]'),
    ];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement;
    if (!focusables.includes(active)) {
      e.preventDefault();
      (e.shiftKey ? last : first)?.focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const pickService = (id: string) => {
    setServiceId(id);
    if (!date || !days.includes(date)) {
      autoDate.current = true;
      setDate(days.find((x) => !isSunday(x)) ?? null);
    }
    setStep(3);
  };

  const setField = <K extends keyof BookingForm>(k: K, v: BookingForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !service || !date || !time || !client) return;
    const errs = validateBooking(form);
    setErrors(errs);
    const firstInvalid = Object.keys(errs)[0];
    if (firstInvalid) {
      document.getElementById(`bk-${firstInvalid}`)?.focus();
      return;
    }

    // Se abre la pestaña ya, dentro del clic, para que el navegador no la bloquee; la URL se carga al guardar.
    const tab = window.open('', '_blank');
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_type: client,
          service_id: service.id,
          date,
          time,
          first_name: form.firstName,
          last_name: form.lastName,
          whatsapp: form.whatsapp,
          city: form.city,
          address: form.address,
          note: form.note,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        tab?.close();
        setSubmitError(j.error ?? 'No pudimos registrar la reserva. Probá de nuevo.');
      } else {
        const text = whatsappMessage({
          clientType: client,
          service: service.name,
          price: j.booking.price,
          promo: j.booking.promo ? martesStudio.label : null,
          day: shortDay(date),
          time,
          address: form.address.trim(),
          city: CITIES.find((c) => c.id === form.city)!.name,
          name: `${form.firstName.trim()} ${form.lastName.trim()}`,
          note: form.note.trim(),
        });
        const url = `https://wa.me/${site.contact.whatsappNumber}?text=${encodeURIComponent(text)}`;
        setWaUrl(url);
        if (tab) {
          tab.opener = null;
          tab.location.href = url;
        }
        setStep(5);
      }
    } catch {
      tab?.close();
      setSubmitError('No pudimos conectar. Revisá tu conexión y probá de nuevo.');
    }
    setSubmitting(false);
  };

  const footer = (() => {
    switch (step) {
      case 1:
        return { label: 'Desde', amount: MIN_PRICE, cta: 'Continuar', disabled: !client, onClick: () => setStep(2) };
      case 2:
        return {
          label: service ? 'Total' : 'Desde',
          amount: service ? price : MIN_PRICE,
          cta: 'Elegir horario',
          disabled: !service,
          onClick: () => service && pickService(service.id),
        };
      case 3:
        return { label: 'Total', amount: price, cta: 'Continuar', disabled: !time, onClick: () => setStep(4) };
      case 4:
        return { label: 'Total', amount: price, cta: submitting ? 'Guardando…' : 'Confirmar por WhatsApp', disabled: submitting, submit: true };
      default:
        return { label: 'Total', amount: price, cta: 'Cerrar', disabled: false, onClick: close };
    }
  })();

  return (
    <div
      className="bk-backdrop fixed inset-0 z-50 flex items-end bg-[rgba(0,0,0,.65)] md:items-start md:justify-end md:p-6"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bk-title"
        onKeyDown={onKeyDown}
        className="bk-panel flex h-svh w-full flex-col border border-bk-line bg-bk-panel text-ivory shadow-[0_30px_80px_rgba(0,0,0,.55)] md:h-[760px] md:max-h-[calc(100svh-48px)] md:w-[440px]"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between gap-3 border-b border-bk-line px-6 py-[22px]">
          <div className="flex items-center gap-3">
            {step > 1 && step < 5 && (
              <button type="button" aria-label="Volver" onClick={() => setStep(step - 1)} className="flex cursor-pointer p-1 text-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </button>
            )}
            <div>
              <h2 id="bk-title" ref={titleRef} tabIndex={-1} className="hx text-[22px] font-bold outline-none">
                {TITLES[step]}
              </h2>
              <div className="mt-1 text-[11px] tracking-[.22em] text-white uppercase">
                {step < 5 ? `Paso ${step} de 4 · ` : ''}
                {site.name}
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={close}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-bk-line text-muted hover:border-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex flex-1 flex-col gap-4 overflow-auto px-6 py-[22px]">
          {step === 1 && (
            <>
              <p className="hx text-[26px] leading-[1.2] font-bold">
                ¿Es tu primera vez
                <br />
                en <span className="font-light">{site.name}</span>?
              </p>
              {CLIENTS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  aria-pressed={client === k.id}
                  onClick={() => {
                    setClient(k.id);
                    setStep(2);
                  }}
                  className={`flex cursor-pointer items-center gap-4 border px-5 py-6 text-left ${card(client === k.id)}`}
                >
                  <span className="hx flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full border border-white text-xl font-bold text-white">
                    {k.ini}
                  </span>
                  <span className="flex-1">
                    <span className="hx block text-xl font-bold">{k.name}</span>
                    <span className="mt-1 block text-[13px] leading-normal text-dim">{k.note}</span>
                    {k.id === 'habitual' && ritualMensual.active && (
                      <span className="mt-2 block text-xs leading-normal text-green-200">{ritualMensual.short}</span>
                    )}
                  </span>
                  <Chevron />
                </button>
              ))}
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted">Cada turno es de 1 hora, dedicado solo a vos.</p>
              <div className="flex flex-col gap-2.5">
                {SERVICES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={serviceId === s.id}
                    onClick={() => pickService(s.id)}
                    className={`flex cursor-pointer flex-col gap-2 border text-left ${s.featured ? 'p-5' : 'px-4 py-3.5'} ${card(serviceId === s.id)}`}
                  >
                    {s.featured && <span className={`${greenTag} self-start`}>Recomendado</span>}
                    <span className="flex items-baseline justify-between gap-3">
                      <span className={`hx leading-[1.2] font-bold ${s.featured ? 'text-[22px]' : 'text-[17px]'}`}>{s.name}</span>
                      <span className={`font-medium text-white ${s.featured ? 'text-base' : 'text-sm'}`}>{formatPrice(s.price)}</span>
                    </span>
                    <span className="text-xs leading-normal text-dim">{s.detail}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && service && (
            <>
              <div className="flex justify-between gap-3 border border-bk-line bg-bk-card px-4 py-3.5 text-sm text-muted">
                <span>{service.name} · 1 hora</span>
                <span className="text-white">{formatPrice(price)}</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Día">
                {days.map((d) => {
                  const off = isSunday(d);
                  const on = d === date;
                  const perk = isPromoDay(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={off}
                      aria-pressed={on}
                      aria-label={`${longLabel(d)}${off ? ', sin turnos' : perk ? `, ${martesStudio.label}` : ''}`}
                      onClick={() => {
                        autoDate.current = false;
                        setDate(d);
                        setTime(null);
                      }}
                      className={`relative flex flex-col items-center gap-0.5 rounded-full border py-2.5 ${
                        on
                          ? 'cursor-pointer border-green-400 bg-green-700 text-white'
                          : off
                            ? 'cursor-not-allowed border-bk-line text-faint'
                            : 'cursor-pointer border-bk-line text-ivory hover:border-green-400'
                      }`}
                    >
                      <span className="text-[15px] font-medium">{dayNum(d)}</span>
                      <span className="text-[10px] tracking-[.08em]">{dowShort(d)}</span>
                      {perk && <span aria-hidden="true" className="absolute -bottom-1 h-1.5 w-1.5 rounded-full bg-green-400" />}
                    </button>
                  );
                })}
              </div>
              {date && <div className="hx text-lg font-bold">{longLabel(date)}</div>}
              {promoDay && (
                <span className={`${greenTag} self-start`}>
                  {martesStudio.label} · Corte {formatPrice(martesStudio.price)}
                </span>
              )}
              <div aria-live="polite">
                {slotsError ? (
                  <p className="text-sm text-dim">
                    No pudimos cargar los horarios.{' '}
                    <button type="button" className="cursor-pointer text-white underline" onClick={() => setReload((n) => n + 1)}>
                      Reintentar
                    </button>
                  </p>
                ) : !slots ? (
                  <p className="text-sm text-dim">Cargando horarios…</p>
                ) : !slots.some((s) => s.available) ? (
                  <p className="text-sm text-dim">No quedan horarios este día. Probá con otro.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2" role="group" aria-label="Horario">
                    {slots.map((s) => (
                      <button
                        key={s.time}
                        type="button"
                        disabled={!s.available}
                        aria-pressed={time === s.time}
                        aria-label={s.available ? `${s.time} h` : `${s.time} h, ocupado`}
                        onClick={() => {
                          autoDate.current = false;
                          setTime(s.time);
                          setStep(4);
                        }}
                        className={`border py-3 text-sm font-medium ${
                          time === s.time
                            ? 'cursor-pointer border-green-400 bg-green-700 text-white'
                            : s.available
                              ? 'cursor-pointer border-bk-line bg-bk-card text-ivory hover:border-green-400'
                              : 'cursor-not-allowed border-bk-line bg-bk-card text-faint line-through'
                        }`}
                      >
                        {s.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {step === 4 && service && date && (
            <form id="bk-form" noValidate onSubmit={submit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-2">
                <Field id="firstName" label="Nombre" error={errors.firstName}>
                  <input
                    id="bk-firstName"
                    className={inputCls}
                    placeholder="Martín"
                    autoComplete="given-name"
                    value={form.firstName}
                    aria-invalid={!!errors.firstName}
                    aria-describedby={errors.firstName ? 'bk-firstName-err' : undefined}
                    onChange={(e) => setField('firstName', e.target.value)}
                  />
                </Field>
                <Field id="lastName" label="Apellido" error={errors.lastName}>
                  <input
                    id="bk-lastName"
                    className={inputCls}
                    placeholder="Gómez"
                    autoComplete="family-name"
                    value={form.lastName}
                    aria-invalid={!!errors.lastName}
                    aria-describedby={errors.lastName ? 'bk-lastName-err' : undefined}
                    onChange={(e) => setField('lastName', e.target.value)}
                  />
                </Field>
              </div>
              <Field id="whatsapp" label="WhatsApp" error={errors.whatsapp}>
                <div className="flex">
                  <span className="flex items-center border border-r-0 border-bk-line bg-bk-card px-3 text-sm whitespace-nowrap text-dim" aria-hidden="true">
                    +54 9
                  </span>
                  <input
                    id="bk-whatsapp"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    className={inputCls}
                    placeholder="379 555 0123"
                    value={form.whatsapp}
                    aria-invalid={!!errors.whatsapp}
                    aria-describedby={errors.whatsapp ? 'bk-whatsapp-err' : undefined}
                    onChange={(e) => setField('whatsapp', e.target.value)}
                  />
                </div>
              </Field>

              <div className={`${sectionLabel} mt-1`} id="bk-city-label">
                ¿Dónde te atendemos?
              </div>
              <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="bk-city-label">
                {CITIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={form.city === c.id}
                    onClick={() => setField('city', c.id)}
                    className={`cursor-pointer border p-[11px] text-[13px] font-medium ${card(form.city === c.id)}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              <Field id="address" label="Dirección (casa, oficina u hotel)" error={errors.address}>
                <input
                  id="bk-address"
                  className={inputCls}
                  placeholder="Calle, número, piso / depto"
                  autoComplete="street-address"
                  value={form.address}
                  aria-invalid={!!errors.address}
                  aria-describedby={errors.address ? 'bk-address-err' : undefined}
                  onChange={(e) => setField('address', e.target.value)}
                />
              </Field>
              <Field id="note" label="¿Algo que debamos saber? (opcional)" error={errors.note}>
                <textarea
                  id="bk-note"
                  rows={2}
                  maxLength={NOTE_MAX}
                  className={`${inputCls} resize-none`}
                  placeholder="Quiero probar un fade bajo · Timbre del 3.º B"
                  value={form.note}
                  aria-invalid={!!errors.note}
                  aria-describedby={errors.note ? 'bk-note-err' : undefined}
                  onChange={(e) => setField('note', e.target.value)}
                />
              </Field>

              <div className={`${sectionLabel} mt-1`}>Resumen</div>
              <div className="flex flex-col gap-2 border border-bk-line bg-bk-card p-4">
                <div className="flex justify-between gap-3 text-base">
                  <span>{service.name}</span>
                  <span>{formatPrice(price)}</span>
                </div>
                <div className="text-xs text-dim">
                  {longLabel(date)} · {time} h
                </div>
                {promo && <span className={`${greenTag} self-start`}>{martesStudio.label}</span>}
              </div>
              <p className="text-xs leading-[1.6] text-dim">No se cobra nada ahora. Coordinamos el pago por WhatsApp.</p>
              {submitError && (
                <p role="alert" className="border border-[#C9705F] px-4 py-3 text-sm text-[#E39A8B]">
                  {submitError}{' '}
                  <button type="button" className="cursor-pointer text-white underline" onClick={() => setStep(3)}>
                    Elegir otro horario
                  </button>
                </p>
              )}
            </form>
          )}

          {step === 5 && service && date && (
            <div className="flex flex-1 flex-col items-center justify-center gap-[18px] py-5 text-center" aria-live="polite">
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-green-400 text-green-200">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </div>
              <p className="hx text-[30px] leading-[1.15] font-bold">Listo.</p>
              <p className="max-w-[320px] text-[15px] leading-[1.6] text-muted">
                Terminá de confirmar tu turno enviando el mensaje de WhatsApp que se abrió.
              </p>
              <p className="text-[13px] leading-[1.7] text-dim">
                {service.name}
                <br />
                {longLabel(date)} · {time} h
              </p>
              {waUrl && (
                <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn-outline px-5 py-3 text-xs tracking-[.2em]">
                  Abrir WhatsApp de nuevo
                </a>
              )}
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="flex flex-col gap-3 border-t border-bk-line px-6 pt-[18px] pb-[22px]">
          <div className="flex items-baseline justify-between text-sm text-muted">
            <span>{footer.label}</span>
            <span className="hx text-2xl font-bold text-white">{formatPrice(footer.amount)}</span>
          </div>
          <button
            type={footer.submit ? 'submit' : 'button'}
            form={footer.submit ? 'bk-form' : undefined}
            disabled={footer.disabled}
            onClick={footer.onClick}
            className="btn-primary p-4 text-[13px] tracking-[.2em] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {footer.cta}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`bk-${id}`} className="text-[11px] text-dim">
        {label}
      </label>
      {children}
      {error && (
        <span id={`bk-${id}-err`} className="text-xs text-[#E39A8B]">
          {error}
        </span>
      )}
    </div>
  );
}

function Chevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.6" aria-hidden="true">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

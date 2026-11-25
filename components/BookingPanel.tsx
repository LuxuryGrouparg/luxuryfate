'use client';

import { useEffect, useRef, useState } from 'react';
import { formatPrice, site, type Category } from '@/config/site';
import type { Slot } from '@/lib/availability';
import { validateBooking, type BookingForm, type City, type FormErrors } from '@/lib/booking';
import { addDays, arNow, dayNum, dowShort, isSunday, longLabel } from '@/lib/dates';
import { OPEN_BOOKING_EVENT } from './ui';

type ClientType = 'primera_vez' | 'habitual';
type Pay = 'mp_deposit' | 'mp_full' | 'transfer';

const TITLES = ['', 'Bienvenido', 'Elegí tu experiencia', 'Elegí horario', 'Confirmá y señá', '¡Listo!'];
const CATS: ('Todos' | Category)[] = ['Todos', 'Cortes', 'Barba', 'Rituales'];
const CLIENTS: { id: ClientType; name: string; note: string; ini: string }[] = [
  { id: 'primera_vez', name: 'Primera vez', note: 'Empezamos con una consulta para conocer tu estilo y lo que buscás.', ini: '1ª' },
  { id: 'habitual', name: 'Cliente habitual', note: 'Tu ritual de siempre, donde estés.', ini: 'LF' },
];
const CITIES: { id: City; name: string }[] = [
  { id: 'corrientes', name: 'Corrientes Capital' },
  { id: 'resistencia', name: 'Resistencia' },
];
const MIN_PRICE = Math.min(...site.services.map((s) => s.price));
const EMPTY_FORM: BookingForm = { firstName: '', lastName: '', whatsapp: '', city: 'corrientes', address: '', email: '' };
const SAVED_KEY = 'lf-booking-draft'; // datos del paso 4, para reintentar al volver de Mercado Pago

type ResultKind = 'loading' | 'confirmed' | 'transfer' | 'review' | 'pending' | 'failed';
type Result = { kind: ResultKind; id?: string; service: string; date: string; time: string; amount: number; method: Pay };
type PublicBooking = { id: string; status: string; service: string; date: string; time: string; method: Pay; amount: number };

const RESULT_COPY: Record<ResultKind, { title: [string, string]; text: string; foot: string }> = {
  loading: { title: ['Verificando', 'tu pago'], text: 'Un momento…', foot: '' },
  confirmed: {
    title: ['Tu turno está', 'confirmado'],
    text: 'Te enviamos la confirmación por WhatsApp. Llegamos puntuales a la dirección que indicaste.',
    foot: 'Seña abonada',
  },
  transfer: {
    title: ['Tu turno está', 'reservado'],
    text: 'Te enviamos el alias por WhatsApp para transferir la seña. Cuando la recibamos, tu turno queda confirmado.',
    foot: 'Seña a transferir',
  },
  review: { title: ['Recibimos', 'tu pago'], text: 'Te escribimos por WhatsApp para confirmar los detalles de tu turno.', foot: 'Abonado' },
  pending: { title: ['Tu pago está', 'en proceso'], text: 'Apenas Mercado Pago lo apruebe, te confirmamos por WhatsApp.', foot: 'En proceso' },
  failed: {
    title: ['El pago no', 'se completó'],
    text: 'No se realizó ningún cargo y el horario quedó liberado. Podés intentarlo de nuevo.',
    foot: 'A pagar',
  },
};

const STATUS_KIND: Record<string, ResultKind> = {
  confirmed: 'confirmed',
  needs_review: 'review',
  pending_transfer: 'transfer',
  pending_payment: 'pending',
  payment_failed: 'failed',
  cancelled: 'failed',
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

const card = (selected: boolean) =>
  selected ? 'border-white bg-bk-on' : 'border-bk-line bg-bk-card hover:border-dim';
const sectionLabel = 'text-xs tracking-[.2em] text-dim uppercase';
const inputCls =
  'w-full border border-bk-line bg-bk-card p-[11px] text-sm text-ivory placeholder:text-[#5E5E5E] aria-invalid:border-[#C9705F] focus-visible:border-white focus-visible:outline-none';

export default function BookingPanel() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [client, setClient] = useState<ClientType | null>(null);
  const [cat, setCat] = useState<'Todos' | Category>('Todos');
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [days, setDays] = useState<string[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotsError, setSlotsError] = useState(false);
  const [reload, setReload] = useState(0);
  const [time, setTime] = useState<string | null>(null);
  const [pay, setPay] = useState<Pay>('mp_deposit');
  const [form, setForm] = useState<BookingForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  // true mientras el día lo eligió la agenda (no la persona): si no tiene turnos, pasa al siguiente.
  const autoDate = useRef(false);

  const service = site.services.find((s) => s.id === serviceId) ?? null;
  const price = service?.price ?? 0;
  const deposit = Math.round(price * 0.3);
  const payNow = pay === 'mp_full' ? price : deposit;
  const when = date && time ? `${longLabel(date)} · ${time} h` : '';

  const showPanel = () => {
    openerRef.current = document.activeElement as HTMLElement | null;
    const today = arNow().date;
    setDays(Array.from({ length: 7 }, (_, i) => addDays(today, i)));
    setOpen(true);
  };

  /** Estado de una reserva al volver de Mercado Pago (`ret` = success | failure | pending). */
  const loadResult = async (id: string, ret: string) => {
    setResult((r) => (r ? { ...r, kind: 'loading' } : { kind: 'loading', id, service: '', date: '', time: '', amount: 0, method: 'mp_deposit' }));
    try {
      let { booking: b } = await fetchJson<{ booking: PublicBooking }>(`/api/bookings/${id}`);
      if (b.status === 'pending_payment' && ret === 'failure') {
        ({ booking: b } = await fetchJson<{ booking: PublicBooking }>(`/api/bookings/${id}/release`, { method: 'POST' }));
      }
      setResult({ kind: STATUS_KIND[b.status] ?? 'pending', id, service: b.service, date: b.date, time: b.time, amount: b.amount, method: b.method });
    } catch {
      setResult((r) => r && { ...r, kind: 'pending' });
    }
  };

  // Abrir desde cualquier botón "Agendar".
  useEffect(() => {
    window.addEventListener(OPEN_BOOKING_EVENT, showPanel);
    return () => window.removeEventListener(OPEN_BOOKING_EVENT, showPanel);
  }, []);

  // Vuelta desde Mercado Pago: /?booking=success|failure|pending&id=...
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const ret = q.get('booking');
    const id = q.get('id');
    if (!ret || !id) return;
    history.replaceState(null, '', window.location.pathname + window.location.hash);
    showPanel();
    setStep(5);
    loadResult(id, ret);
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
    if (step !== 3 || !date || !service) return;
    const ac = new AbortController();
    setSlots(null);
    setSlotsError(false);
    fetch(`/api/availability?date=${date}&duration=${service.durationMin}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j: { slots: Slot[] }) => {
        const next = days.slice(days.indexOf(date) + 1).find((d) => !isSunday(d));
        if (autoDate.current && next && !j.slots.some((s) => s.available)) setDate(next);
        else setSlots(j.slots);
      })
      .catch(() => !ac.signal.aborted && setSlotsError(true));
    return () => ac.abort();
  }, [step, date, service, reload, days]);

  if (!open) return null;

  const close = () => {
    setOpen(false);
    if (step === 5) {
      setClient(null);
      setServiceId(null);
      setDate(null);
      setTime(null);
      setPay('mp_deposit');
      setForm(EMPTY_FORM);
      setErrors({});
      setResult(null);
      try {
        sessionStorage.removeItem(SAVED_KEY);
      } catch {}
    }
    setSubmitError(null);
    setStep(1);
  };

  /** Después de un pago fallido: vuelve al paso 4 con los datos que había cargado. */
  const retry = () => {
    let saved: { client: ClientType; serviceId: string; date: string; pay: Pay; form: BookingForm } | null = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(SAVED_KEY) ?? 'null');
    } catch {}
    setResult(null);
    if (!saved) return setStep(1);
    setClient(saved.client);
    setServiceId(saved.serviceId);
    autoDate.current = !days.includes(saved.date);
    setDate(autoDate.current ? (days.find((d) => !isSunday(d)) ?? null) : saved.date);
    setTime(null); // el horario pudo ocuparse: se elige de nuevo
    setPay(saved.pay);
    setForm(saved.form);
    setStep(3);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusables = [
      ...panelRef.current!.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href]'),
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
    setTime(null);
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
          payment_method: pay,
          first_name: form.firstName,
          last_name: form.lastName,
          whatsapp: form.whatsapp,
          city: form.city,
          address: form.address,
          email: form.email,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(j.error ?? 'No pudimos registrar la reserva. Probá de nuevo.');
        setSubmitting(false);
        return;
      }
      if (j.checkout_url) {
        try {
          sessionStorage.setItem(SAVED_KEY, JSON.stringify({ client, serviceId, date, pay, form }));
        } catch {}
        window.location.assign(j.checkout_url); // se queda en "Procesando…" hasta que cambia la página
        return;
      }
      setResult({ kind: 'transfer', id: j.booking.id, service: service.name, date, time, amount: payNow, method: pay });
      setStep(5);
    } catch {
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
          label: service ? 'Subtotal' : 'Desde',
          amount: service ? price : MIN_PRICE,
          cta: 'Elegir horario',
          disabled: !service,
          onClick: () => service && pickService(service.id),
        };
      case 3:
        return { label: 'Subtotal', amount: price, cta: 'Continuar', disabled: !time, onClick: () => setStep(4) };
      case 4:
        return {
          label: 'A pagar ahora',
          amount: payNow,
          cta: submitting ? 'Procesando…' : pay === 'mp_full' ? 'Pagar con Mercado Pago' : 'Reservar y pagar seña',
          disabled: submitting,
          submit: true,
        };
      default: {
        const kind = result?.kind ?? 'loading';
        return {
          label: kind === 'confirmed' && result?.method === 'mp_full' ? 'Total abonado' : RESULT_COPY[kind].foot,
          amount: result?.amount ?? 0,
          cta: kind === 'failed' ? 'Reintentar' : 'Cerrar',
          disabled: kind === 'loading',
          onClick: kind === 'failed' ? retry : close,
        };
      }
    }
  })();

  const pays: { id: Pay; name: string; note: string; amount: number }[] = [
    { id: 'mp_deposit', name: 'Seña 30% con Mercado Pago', note: 'El resto lo abonás en el local', amount: deposit },
    { id: 'mp_full', name: 'Pago total con Mercado Pago', note: 'Tarjeta, débito o dinero en cuenta', amount: price },
    { id: 'transfer', name: 'Transferencia (seña 30%)', note: 'Te enviamos el alias por WhatsApp', amount: deposit },
  ];

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
              <h2 id="bk-title" ref={titleRef} tabIndex={-1} className="hx font-bold text-[22px] outline-none">
                {step === 5 && result && ['loading', 'pending', 'failed'].includes(result.kind) ? 'Tu reserva' : TITLES[step]}
              </h2>
              <div className="mt-1 text-[11px] tracking-[.22em] text-white uppercase">Paso {step} de 5 · Luxury Fade Studio</div>
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
              <p className="hx font-bold text-[26px] leading-[1.2]">
                ¿Es tu primera vez
                <br />
                en <span className="font-light">Luxury Fade Studio</span>?
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
                  <span className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full border border-white hx font-bold text-xl text-white">
                    {k.ini}
                  </span>
                  <span className="flex-1">
                    <span className="block hx font-bold text-xl">{k.name}</span>
                    <span className="mt-1 block text-[13px] leading-normal text-dim">{k.note}</span>
                  </span>
                  <Chevron />
                </button>
              ))}
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Categorías">
                {CATS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={cat === c}
                    onClick={() => setCat(c)}
                    className={`cursor-pointer border px-3.5 py-2 text-xs font-medium tracking-widest uppercase ${
                      cat === c ? 'border-white bg-white text-black' : 'border-bk-line text-muted hover:border-white'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {site.services
                  .filter((s) => cat === 'Todos' || s.category === cat)
                  .map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={serviceId === s.id}
                      onClick={() => pickService(s.id)}
                      className={`flex min-h-[120px] cursor-pointer flex-col justify-between gap-2.5 border p-4 text-left ${card(serviceId === s.id)}`}
                    >
                      <span className="hx font-bold text-[17px] leading-[1.2]">{s.name}</span>
                      <span className="flex items-baseline justify-between text-xs text-dim">
                        <span>{s.durationMin} min</span>
                        <span className="text-sm font-medium text-white">{formatPrice(s.price)}</span>
                      </span>
                    </button>
                  ))}
              </div>
            </>
          )}

          {step === 3 && service && (
            <>
              <div className="flex justify-between gap-3 border border-bk-line bg-bk-card px-4 py-3.5 text-sm text-muted">
                <span>
                  {service.name} · {service.durationMin} min
                </span>
                <span className="text-white">{formatPrice(price)}</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Día">
                {days.map((d) => {
                  const off = isSunday(d);
                  const on = d === date;
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={off}
                      aria-pressed={on}
                      aria-label={off ? `${longLabel(d)}, sin turnos` : longLabel(d)}
                      onClick={() => {
                        autoDate.current = false;
                        setDate(d);
                        setTime(null);
                      }}
                      className={`flex flex-col items-center gap-0.5 rounded-full border py-2.5 ${
                        on
                          ? 'cursor-pointer border-white bg-white text-black'
                          : off
                            ? 'cursor-not-allowed border-bk-line text-faint'
                            : 'cursor-pointer border-bk-line text-ivory hover:border-white'
                      }`}
                    >
                      <span className="text-[15px] font-medium">{dayNum(d)}</span>
                      <span className="text-[10px] tracking-[.08em]">{dowShort(d)}</span>
                    </button>
                  );
                })}
              </div>
              {date && <div className="hx font-bold text-lg">{longLabel(date)}</div>}
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
                            ? 'cursor-pointer border-white bg-white text-black'
                            : s.available
                              ? 'cursor-pointer border-bk-line bg-bk-card text-ivory hover:border-white'
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

          {step === 4 && service && (
            <form id="bk-form" noValidate onSubmit={submit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 border border-bk-line bg-bk-card p-4">
                <div className="flex justify-between gap-3 text-base">
                  <span>{service.name}</span>
                  <span>{formatPrice(price)}</span>
                </div>
                <div className="text-xs text-dim">
                  {CLIENTS.find((k) => k.id === client)?.name} · {when}
                </div>
              </div>

              <div className={sectionLabel}>Método de pago</div>
              <div className="flex flex-col gap-2" role="group" aria-label="Método de pago">
                {pays.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={pay === p.id}
                    onClick={() => setPay(p.id)}
                    className={`flex cursor-pointer items-center justify-between gap-2.5 border px-4 py-3.5 text-left ${card(pay === p.id)}`}
                  >
                    <span>
                      <span className="block text-[15px]">{p.name}</span>
                      <span className="text-xs text-dim">{p.note}</span>
                    </span>
                    <span className="text-sm text-white">{formatPrice(p.amount)}</span>
                  </button>
                ))}
              </div>

              <div className={`${sectionLabel} mt-1`}>Tus datos</div>
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
              <Field id="email" label="Email" error={errors.email}>
                <input
                  id="bk-email"
                  type="email"
                  autoComplete="email"
                  className={inputCls}
                  placeholder="tu@email.com"
                  value={form.email}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'bk-email-err' : undefined}
                  onChange={(e) => setField('email', e.target.value)}
                />
              </Field>
              <p className="text-xs leading-[1.6] text-dim">
                Cambio o cancelación sin cargo hasta 24 h antes del turno. La seña se descuenta del total.
              </p>
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

          {step === 5 && result && (
            <div className="flex flex-1 flex-col items-center justify-center gap-[18px] py-5 text-center" aria-live="polite">
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-white text-white">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  {result.kind === 'failed' ? (
                    <path d="M7 7l10 10M17 7L7 17" />
                  ) : result.kind === 'loading' || result.kind === 'pending' ? (
                    <path d="M12 6v6l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                  ) : (
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  )}
                </svg>
              </div>
              <p className="hx font-bold text-[30px] leading-[1.15]">
                {RESULT_COPY[result.kind].title[0]}
                <br />
                <span className="font-light">{RESULT_COPY[result.kind].title[1]}</span>
              </p>
              {result.service && (
                <p className="text-[15px] leading-[1.7] text-muted">
                  {result.service}
                  <br />
                  {longLabel(result.date)} · {result.time} h
                </p>
              )}
              <p className="max-w-[300px] text-[13px] leading-[1.6] text-dim">{RESULT_COPY[result.kind].text}</p>
              {result.kind === 'pending' && result.id && (
                <button type="button" className="cursor-pointer text-sm text-white underline" onClick={() => loadResult(result.id!, 'pending')}>
                  Actualizar estado
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="flex flex-col gap-3 border-t border-bk-line px-6 pt-[18px] pb-[22px]">
          <div className="flex items-baseline justify-between text-sm text-muted">
            <span>{footer.label}</span>
            <span className="hx font-bold text-2xl text-white">{formatPrice(footer.amount)}</span>
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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SLOTS } from './availability.ts';
import { normalizeWhatsapp, priceFor, validateBooking } from './booking.ts';
import { addDays, longLabel, dowShort, isSunday } from './dates.ts';

test('normalizeWhatsapp', () => {
  assert.equal(normalizeWhatsapp('379 555-0123'), '+5493795550123');
  assert.equal(normalizeWhatsapp('0379 5550123'), '+5493795550123');
  assert.equal(normalizeWhatsapp('+54 9 362 444 1122'), '+5493624441122');
  assert.equal(normalizeWhatsapp('5550123'), null);
  assert.equal(normalizeWhatsapp(''), null);
});

test('validateBooking', () => {
  const ok = { firstName: 'Martín', lastName: 'Gómez', whatsapp: '379 555 0123', city: 'corrientes' as const, address: 'Junín 1234, 3° B', note: '' };
  assert.deepEqual(validateBooking(ok), {});
  assert.deepEqual(Object.keys(validateBooking({ ...ok, address: ' ', note: 'x'.repeat(301) })).sort(), ['address', 'note']);
  assert.deepEqual(validateBooking({ ...ok, firstName: 'María José', lastName: 'Ñandú' }), {});
  assert.deepEqual(Object.keys(validateBooking({ ...ok, firstName: 'J4ime', lastName: 'G' })).sort(), ['firstName', 'lastName']);
  assert.deepEqual(Object.keys(validateBooking({ ...ok, address: 'Calle Junín sin número' })), ['address']); // falta el número
});

test('priceFor aplica Martes de Studio solo al corte y solo los martes', () => {
  assert.deepEqual(priceFor('corte', '2026-12-01'), { price: 8000, promo: 'martes_studio' }); // martes
  assert.deepEqual(priceFor('corte', '2026-12-02'), { price: 12000, promo: null });
  assert.deepEqual(priceFor('corte-barba', '2026-12-01'), { price: 14000, promo: null });
  assert.deepEqual(priceFor('corte', null), { price: 12000, promo: null });
});

test('turnos de 1 hora de 10 a 19', () => {
  assert.deepEqual(SLOTS, ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00']);
});

test('fechas', () => {
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(longLabel('2026-11-27'), 'Viernes 27 de noviembre');
  assert.equal(dowShort('2026-11-25'), 'mié');
  assert.equal(isSunday('2026-11-29'), true);
});

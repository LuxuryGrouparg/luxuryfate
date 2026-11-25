import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWhatsapp, validateBooking } from './booking.ts';
import { addDays, longLabel, dowShort, isSunday } from './dates.ts';

test('normalizeWhatsapp', () => {
  assert.equal(normalizeWhatsapp('379 555-0123'), '+5493795550123');
  assert.equal(normalizeWhatsapp('0379 5550123'), '+5493795550123');
  assert.equal(normalizeWhatsapp('+54 9 362 444 1122'), '+5493624441122');
  assert.equal(normalizeWhatsapp('5550123'), null);
  assert.equal(normalizeWhatsapp(''), null);
});

test('validateBooking', () => {
  const ok = { firstName: 'Martín', lastName: 'Gómez', whatsapp: '379 555 0123', city: 'corrientes' as const, address: 'Junín 1234, 3° B', email: 'martin@mail.com' };
  assert.deepEqual(validateBooking(ok), {});
  assert.deepEqual(Object.keys(validateBooking({ ...ok, address: ' ', email: 'x@' })).sort(), ['address', 'email']);
});

test('fechas', () => {
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(longLabel('2026-11-27'), 'Viernes 27 de noviembre');
  assert.equal(dowShort('2026-11-25'), 'mié');
  assert.equal(isSunday('2026-11-29'), true);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { validSignature } from './mp.ts';
import { coveredSlots } from '../availability.ts';

test('validSignature acepta solo la firma correcta de Mercado Pago', () => {
  const secret = 'secreto-de-prueba';
  const ts = '1764000000';
  const v1 = createHmac('sha256', secret).update(`id:123456;request-id:req-1;ts:${ts};`).digest('hex');
  const h = (sig: string) => new Headers({ 'x-signature': sig, 'x-request-id': 'req-1' });

  assert.equal(validSignature(h(`ts=${ts},v1=${v1}`), '123456', secret), true);
  assert.equal(validSignature(h(`ts=${ts},v1=${v1}`), '999999', secret), false);
  assert.equal(validSignature(h(`ts=${ts},v1=${'0'.repeat(64)}`), '123456', secret), false);
  assert.equal(validSignature(h(''), '123456', secret), false);
});

test('coveredSlots bloquea todos los turnos que ocupa el servicio', () => {
  assert.deepEqual(coveredSlots('10:00', 100), ['10:00', '10:45', '11:30']);
  assert.deepEqual(coveredSlots('10:00', 45), ['10:00']);
  assert.deepEqual(coveredSlots('12:15', 75), ['12:15']); // la pausa del mediodía no es un turno
});

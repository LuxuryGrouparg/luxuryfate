# Luxury Fade Studio — landing

Next.js (App Router) + TypeScript + Tailwind CSS 4. El diseño de referencia está en `referencia/` (`Mono.dc.html` y `BookingMono.dc.html`): un solo tema monocromático con la tipografía Archivo.

## Correr en local

Necesitás Node 20 o más nuevo.

```bash
npm install
npm run dev
```

Abrí http://localhost:3000. Para probar la versión de producción: `npm run build` y después `npm start`.

## Dónde se edita cada cosa

Todo el contenido está en `config/site.ts`: servicios y precios, horarios, cobertura, WhatsApp, email, Instagram, textos de los 5 momentos y fotos. Los colores están en `app/globals.css`.

- **Botón flotante de WhatsApp**: `whatsappFloat: true`.

## Fotos

Las fotos actuales son de stock de [Unsplash](https://unsplash.com/license): uso libre y gratuito, también comercial, sin obligación de dar crédito. Están en `public/images/`. Todas se muestran en blanco y negro (`filter: grayscale(1) contrast(1.05)`, clase `.bw`), así que podés subirlas en color.

Para reemplazar una por una foto propia, guardala en `public/images/` con el mismo nombre de archivo. Si usás otro nombre, cambiá el `src` en `config/site.ts`. Si dejás un `src` vacío, se ve el placeholder del diseño.

| Lugar | Archivo | Qué foto va | Foto actual (Unsplash) |
|---|---|---|---|
| Portada (también es la imagen al compartir en redes) | `hero.jpg` | Retrato masculino editorial, luz lateral. Horizontal, 2400 px de ancho | [IvQeAVeJULw](https://unsplash.com/photos/IvQeAVeJULw) |
| Galería 1 (alta) | `gallery-5-perfil.jpg` | Retrato de perfil, corte terminado. Vertical | [-BecbFaSB9U](https://unsplash.com/photos/-BecbFaSB9U) |
| Galería 2 | `gallery-1-manos.jpg` | Manos y navaja | [1VTQaaI0HP8](https://unsplash.com/photos/1VTQaaI0HP8) |
| Galería 3 (alta) | `gallery-3-barba.jpg` | Perfilado de barba. Vertical | [fE42nRlBcG8](https://unsplash.com/photos/fE42nRlBcG8) |
| Galería 4 | `gallery-2-terminacion.jpg` | Detalle de fade | [4k60yfGy7fU](https://unsplash.com/photos/4k60yfGy7fU) |
| Galería 5 (a todo el ancho) | `gallery-6-afeitado.jpg` | Ideal: servicio en un living, luz de ventana. Horizontal | [Nh-A851W2ro](https://unsplash.com/photos/Nh-A851W2ro) |
| Contacto | `contacto.jpg` | Ideal: grooming en una oficina o living elegante. Hoy es un living sin gente. Vertical | [gsZ5nKQI0EE](https://unsplash.com/photos/gsZ5nKQI0EE) |

Las dos fotos marcadas como "ideal" son las primeras que conviene reemplazar por fotos propias: no hay fotos libres de un servicio a domicilio. `gallery-4-productos.jpg` quedó sin usar (el diseño nuevo tiene 5 fotos en la galería); para usarla, cambiá un `src` de la galería.

## Reservas y pagos

Cómo funciona una reserva:

1. La ventana de agenda manda los datos a `POST /api/bookings`. El servidor valida todo y toma el precio de `config/site.ts`, nunca del navegador.
2. Bloquea el horario. Si el servicio dura más de un turno (por ejemplo, Ritual Luxury: 100 min), bloquea todos los turnos que ocupa.
   - **Mercado Pago**: el bloqueo dura 15 minutos. Si no se paga en ese tiempo, el horario se libera solo y el link de pago vence.
   - **Transferencia**: el horario queda tomado sin vencimiento y se manda `booking.pending_transfer` al webhook de automatización. Si la seña no llega, liberalo a mano (ver "Liberar un horario").
3. Con Mercado Pago, la persona paga en Checkout Pro y vuelve a la landing con `?booking=success|failure|pending&id=...`.
4. `POST /api/mp-webhook` recibe el aviso de Mercado Pago, valida la firma, consulta el pago en la API de MP, marca la reserva `confirmed` y manda `booking.confirmed` al webhook de automatización. Si el aviso todavía no llegó, la landing también consulta el pago al volver.
5. Si el pago se aprueba pero el monto no coincide, o el horario ya lo tomó otra persona (pagó después de los 15 minutos), la reserva queda `needs_review` y se manda `booking.needs_review`, para que coordines o devuelvas el dinero.

Cada evento se manda una sola vez. Si el webhook de automatización falla, Mercado Pago reintenta la notificación y se vuelve a intentar el envío.

Solo se aceptan tarjeta, débito y dinero en cuenta. El efectivo (Rapipago, Pago Fácil) está excluido porque queda pendiente durante días.

### 1. Base de datos: Upstash Redis

1. En Vercel: tu proyecto → **Storage** → **Create Database** → **Upstash (Redis)** → plan gratuito → conectalo al proyecto. Vercel carga `KV_REST_API_URL` y `KV_REST_API_TOKEN` solo.
2. Para usar esa misma base en tu compu, copiá esas dos variables desde Vercel a `.env.local` como `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`.

Si en local no configurás Upstash, las reservas se guardan en memoria y se borran al reiniciar `npm run dev`. En producción, Upstash es obligatorio.

### 2. Mercado Pago (primero en modo prueba)

1. Entrá a https://www.mercadopago.com.ar/developers → **Tus integraciones** → **Crear aplicación** → elegí **Pagos online** y **Checkout Pro**.
2. En la aplicación, andá a **Cuentas de prueba** y creá dos: un vendedor y un comprador.
3. Iniciá sesión con la cuenta **vendedora de prueba**, entrá a la aplicación → **Credenciales de producción** y copiá el **Access Token** en `MP_ACCESS_TOKEN`.
4. Para pagar, usá la cuenta **compradora de prueba** y las [tarjetas de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/test/cards). Con el nombre de titular `APRO` el pago se aprueba; con `OTHE`, se rechaza.
5. Webhook: en la aplicación → **Webhooks** → **Configurar notificaciones**.
   - URL: `https://TU-DOMINIO/api/mp-webhook`.
   - Evento: **Pagos**.
   - Guardá y copiá la **clave secreta** en `MP_WEBHOOK_SECRET`.
   - Mercado Pago no puede llamar a `localhost`. En local, la confirmación llega igual porque la landing consulta el pago al volver. Para probar el webhook en tu compu, usá un túnel como `ngrok http 3000` y poné esa URL en `NEXT_PUBLIC_SITE_URL`.
6. Para cobrar de verdad, reemplazá el token por el **Access Token de producción** de tu cuenta real, con la misma URL de webhook y su clave.

### 3. Webhook de automatización (n8n o Make)

Creá un flujo que empiece con un nodo **Webhook** (método POST) y poné su URL en `AUTOMATION_WEBHOOK_URL`. Cada reserva llega así:

```json
{
  "event": "booking.confirmed",
  "booking_id": "uuid",
  "client_type": "primera_vez",
  "service": { "name": "Ritual Luxury", "duration_min": 100, "price": 38000 },
  "datetime": "2026-11-27T10:00:00-03:00",
  "payment": { "method": "mp_deposit", "amount_paid": 11400, "balance_due": 26600, "mp_payment_id": "123" },
  "customer": { "first_name": "Martín", "last_name": "Gómez", "whatsapp": "+5493795550123", "email": "martin@mail.com" },
  "location": { "city": "corrientes", "address": "Junín 1234, 3° B" }
}
```

Los eventos posibles son `booking.confirmed`, `booking.pending_transfer` y `booking.needs_review`. El flujo tiene que responder con un código 2xx; si no, se considera fallido y se reintenta.

### Liberar un horario

En Upstash → tu base → **Data Browser**, buscá las claves `lock:AAAA-MM-DD:HH:MM` del turno y borralas. La reserva queda guardada en `booking:<id>`.

### Disponibilidad

`lib/availability.ts` arma los horarios. Los "ocupados" de base son de ejemplo (`mockBusy`); reemplazalos por la consulta a Google Calendar o Cal.com cuando conectes tu agenda. Las reservas de la web ya se descuentan solas.

## Pruebas

`npm test` corre las pruebas de validación, fechas, firma de Mercado Pago y bloqueo de turnos. Necesita Node 23.6 o más nuevo.

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

- **Beneficios** (Martes de Studio, Ritual mensual): bloque `promos`, con `active: true/false` para prender o apagar cada uno.
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

## Reservas

La web solo agenda: no cobra nada. Los pagos los coordina el barbero por WhatsApp.

Cómo funciona una reserva:

1. La ventana de agenda manda los datos a `POST /api/bookings`. El servidor valida todo y calcula el precio desde `config/site.ts` (incluido "Martes de Studio"), nunca desde el navegador.
2. Guarda la reserva con estado `pending_whatsapp` y bloquea esa hora sin vencimiento.
3. Manda `booking.requested` al webhook de automatización.
4. Abre WhatsApp con el mensaje armado (plantilla `whatsappMessage` en `config/site.ts`). La persona termina de confirmar enviándolo.

### 1. Base de datos: Upstash Redis

1. En Vercel: tu proyecto → **Storage** → **Create Database** → **Upstash (Redis)** → plan gratuito → conectalo al proyecto. Vercel carga `KV_REST_API_URL` y `KV_REST_API_TOKEN` solo.
2. Para usar esa misma base en tu compu, copiá esas dos variables desde Vercel a `.env.local` como `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`.

Si en local no configurás Upstash, las reservas se guardan en memoria y se borran al reiniciar `npm run dev`. En producción, Upstash es obligatorio.

### 2. Webhook de automatización (n8n o Make)

Creá un flujo que empiece con un nodo **Webhook** (método POST) y poné su URL en `AUTOMATION_WEBHOOK_URL`. Cada reserva llega así:

```json
{
  "event": "booking.requested",
  "booking_id": "uuid",
  "brand": "Luxury Fade Studio",
  "client_type": "nuevo",
  "service": { "name": "Corte", "price": 8000, "promo": "martes_studio" },
  "datetime": "2026-12-01T10:00:00-03:00",
  "duration_min": 60,
  "customer": { "first_name": "Martín", "last_name": "Gómez", "whatsapp": "+5493795550123", "email": null },
  "location": { "city": "corrientes", "address": "Junín 1234, 3° B" },
  "note": "Timbre del 3.º B"
}
```

El flujo tiene que responder con un código 2xx. Si falla, la reserva igual queda guardada y el error se ve en los logs de Vercel.

### 3. Liberar un horario

Si una reserva no se confirma por WhatsApp, liberala con tu `ADMIN_KEY` (cargala en Vercel → Settings → Environment Variables):

```bash
curl -X PATCH https://TU-DOMINIO/api/bookings/<booking_id> \
  -H "Authorization: Bearer TU_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status":"cancelled"}'
```

El `booking_id` llega en el webhook de automatización. Se puede llamar igual desde un nodo HTTP de n8n o Make.

### Disponibilidad

`lib/availability.ts` arma los turnos de 1 hora según `hours.opens` y `hours.closes` de `config/site.ts` (por defecto 10:00 a 19:00). Los "ocupados" de base son de ejemplo (`mockBusy`); reemplazalos por la consulta a Google Calendar o Cal.com cuando conectes tu agenda. Las reservas de la web ya se descuentan solas.

## Pruebas

`npm test` corre las pruebas de validación, precios con beneficio, turnos y fechas. Necesita Node 23.6 o más nuevo.

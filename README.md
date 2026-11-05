# 🛍️ TodoAki — tienda headless (WooCommerce + Next.js + Wompi)

Tienda online para Colombia: catálogo amplio ("de todo, de China a Colombia"), pago en pesos (COP) con el **Web Checkout de Wompi** y una experiencia de compra rápida y moderna.

WordPress/WooCommerce administra productos, pedidos, inventario, cupones, envíos y correos.
La tienda que ve el cliente es una app en **Next.js (React)**.

> La marca que se muestra en la tienda es «**Todazo**» (se puede cambiar en el código).

```
 Navegador ──► Next.js (tutienda.com) ──► WooCommerce Store API (admin.tutienda.com)
                    │                                ▲
                    └──► Wompi Web Checkout ──webhook┘  (marca el pedido como pagado)
```

| Carpeta | Qué es |
|---|---|
| `frontend/` | App Next.js 16: catálogo, producto, carrito, checkout y página de resultado |
| `wordpress-plugin/tienda-headless/` | Plugin de WordPress: Store API extendida, buscador, pasarela Wompi, webhook de pagos y aviso de cambios al front |
| `docker-compose.yml`, `docker/` | WordPress + WooCommerce local con datos de prueba y scripts de importación |

## ✨ Características

- **Catálogo** con categorías, paginación «Cargar más» y fichas de producto.
- **Buscador** con autocompletado en vivo y relevancia por nombre (endpoint propio del plugin).
- **Filtros por categoría**: orden (precio, nombre, recientes), rango de precio, en oferta y solo disponibles.
- **Ficha de producto**: galería de fotos, variaciones (color/talla), productos relacionados y **ficha técnica** (datos importados de Shopify).
- **Carrito y checkout** con la pasarela **Wompi**.
- **Diseño de marca** propio (azul + naranja, tipografía Poppins) con Tailwind v4.
- **Importación de catálogo** desde una tienda Shopify (productos, categorías, imágenes y metacampos).

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS v4 |
| Backend | WordPress + WooCommerce (Store API) + plugin propio `tienda-headless` |
| Pagos | Wompi (sandbox / producción) |
| Entorno local | Docker Compose (WordPress, MariaDB, Mailpit) |

## 🛒 Cómo funciona una compra

1. El cliente navega el catálogo. Las páginas se generan en el servidor (buen SEO) y se cachean.
2. El carrito vive en WooCommerce. Next.js guarda el `Cart-Token` de la Store API en una cookie
   httpOnly y hace de intermediario (`/api/cart/*`), así el navegador nunca habla con WordPress.
3. En `/checkout` el cliente escribe su dirección; WooCommerce calcula envío e impuestos.
4. Al pagar, Next.js llama a `POST /wc/store/v1/checkout` con la pasarela `wompi_headless`. El
   plugin calcula el total, firma la transacción con el secreto de integridad y devuelve la URL
   de Wompi.
5. El cliente paga en Wompi (tarjeta, PSE, Nequi, Bancolombia) y vuelve a `/checkout/resultado`.
6. Wompi envía el evento `transaction.updated` al webhook del plugin, que verifica la firma y el
   monto y marca el pedido como **Procesando** (o **Fallido**). WooCommerce envía los correos.

Si el pago es rechazado, el carrito se conserva y el cliente puede reintentar sobre el mismo pedido.

## Requisitos

- WordPress 6.4+ y WooCommerce 8+ con moneda **peso colombiano (COP)**
- Cuenta de comercio en Wompi
- Node.js 20.9+

## 🧪 Desarrollo local con Docker

No necesitas descargar WordPress: la imagen de Docker ya lo trae. Con Docker Desktop abierto:

```bash
cp .env.example .env          # pon una contraseña en WP_ADMIN_PASSWORD
docker compose up -d
docker compose run --rm wpcli sh /setup/setup.sh
```

El script instala WordPress en español, WooCommerce, el plugin `tienda-headless`, configura COP,
crea una zona de envío para Colombia (estándar $12.000, express $25.000), 6 productos de prueba
(uno con tallas y colores: "Buzo con Capota") y el cupón `descuento10`. Se puede volver a ejecutar
sin duplicar nada.

| Qué | Dónde |
|---|---|
| Panel de WordPress | http://localhost:8080/wp-admin (usuario y contraseña en `.env`) |
| Correos de la tienda (Mailpit) | http://localhost:8025 |
| Tienda en Next.js | http://localhost:3000 (`cd frontend && npm run dev`) |

El front usa `frontend/.env.local` con `WC_STORE_URL=http://localhost:8080` y el mismo
`REVALIDATE_SECRET` que `.env`.

Comandos útiles:

```bash
docker compose run --rm wpcli wp wc product list --user=admin   # cualquier comando de WP-CLI
docker compose down                                             # apagar (los datos se conservan)
docker compose down -v                                          # borrar todo y empezar de cero
```

### Importar el catálogo desde Shopify

Con `SHOPIFY_STORE` y `SHOPIFY_TOKEN` definidos en `.env`, los scripts de `docker/` traen
productos, categorías, imágenes y metacampos (ficha técnica) a WooCommerce. Por ejemplo:

```bash
docker compose run --rm wpcli wp eval-file /setup/import-shopify.php
```

> El token de Shopify es solo de servidor y **nunca** debe llegar al frontend.

### Probar un pago real en el sandbox de Wompi

1. Copia tus llaves de sandbox en `.env` (`WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`,
   `WOMPI_EVENTS_SECRET`) y vuelve a correr el script de setup, o pégalas en
   WooCommerce > Ajustes > Pagos > Wompi (headless).
2. Compra en http://localhost:3000. Wompi te devuelve a `/checkout/resultado` con el resultado.
3. Para que el pedido pase a **Procesando**, Wompi tiene que poder enviar el webhook a tu
   WordPress local. Abre un túnel temporal (deja expuesto tu WordPress local mientras corre):

   ```bash
   docker run --rm --network tienda-headless_default cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://wordpress:80
   ```

   Copia la URL `https://….trycloudflare.com` que aparece y configura en Wompi la URL de eventos
   `https://….trycloudflare.com/wp-json/tienda-headless/v1/wompi/events`. La URL cambia cada vez
   que abres el túnel.

## 1. Configurar WordPress (hosting real)

1. Comprime la carpeta `wordpress-plugin/tienda-headless` en un `.zip` y súbela en
   **Plugins > Añadir nuevo > Subir plugin**. Actívala.
2. **WooCommerce > Ajustes > General**: moneda COP, país de venta Colombia.
3. **WooCommerce > Ajustes > Envío**: crea al menos una zona de envío para Colombia.
4. **WooCommerce > Ajustes > Pagos > Wompi (headless)**:
   - Llave pública, secreto de integridad y secreto de eventos (los da Wompi, ver abajo).
   - URL de la tienda: la URL de Next.js, por ejemplo `https://tutienda.com`.
   - Secreto de revalidación: un texto largo y aleatorio (el mismo que `REVALIDATE_SECRET`).
   - Marca **Activar**.

## 2. Configurar Wompi

En [comercios.wompi.co](https://comercios.wompi.co) > **Desarrolladores**:

- Copia las llaves de **sandbox** (`pub_test_…`, secreto de integridad y de eventos) mientras pruebas.
- En **URL de eventos** pon: `https://admin.tutienda.com/wp-json/tienda-headless/v1/wompi/events`

Wompi tiene que poder llegar a esa URL. Si tu WordPress está en tu computador (LocalWP, XAMPP),
expónlo con un túnel como `cloudflared` o `ngrok` para probar el webhook.

Para pruebas en sandbox, Wompi publica datos de prueba en su documentación (por ejemplo, una
tarjeta que siempre se aprueba y otra que siempre se rechaza).

## 3. Correr el front

```bash
cd frontend
cp .env.example .env.local   # y completa los valores
npm install
npm run dev                  # http://localhost:3000
```

| Variable | Valor |
|---|---|
| `WC_STORE_URL` | URL de WordPress, sin `/` final |
| `WOMPI_ENV` | `sandbox` o `production` (debe coincidir con las llaves del plugin) |
| `REVALIDATE_SECRET` | El mismo secreto de revalidación del plugin |

`npm run build` necesita que WordPress responda, porque prerenderiza el catálogo.

## 🚀 Despliegue

- **Front**: Vercel, Netlify o cualquier servidor con Node. Configura las mismas variables de entorno.
- **WordPress**: cualquier hosting PHP con HTTPS, idealmente en un subdominio (`admin.tutienda.com`).
- Al pasar a producción: cambia las llaves del plugin a `pub_prod_…`, pon `WOMPI_ENV=production`
  y actualiza la URL de eventos en Wompi.

Cuando editas un producto o cambia el stock, el plugin avisa a `/api/revalidate` y el catálogo se
actualiza en la siguiente visita. Si el aviso falla, la caché igual se renueva cada minuto.

## 🔐 Secretos

Los secretos **nunca** se suben al repositorio: `.env`, `frontend/.env.local` y
`docker/shopify-products.json` están en `.gitignore`. Solo se publican las plantillas
`.env.example`. Copia cada plantilla y complétala con tus valores locales.

## 📝 Estado

Proyecto en desarrollo. Probado en entorno local (Docker + Next.js en modo dev); pendiente el
build de producción y la prueba de compra con llaves reales de Wompi.

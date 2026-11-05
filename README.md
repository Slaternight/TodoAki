# 🛍️ TodoAki

Tienda online **headless** para Colombia: catálogo amplio ("de todo, de China a Colombia"), pago con **Wompi** en pesos (COP) y una experiencia de compra rápida y moderna.

> **Arquitectura headless:** **WooCommerce** (WordPress) administra el catálogo y los pedidos, y un frontend independiente en **Next.js 16** consume su Store API. La marca que se muestra en la tienda es «**Todazo**» (se puede cambiar en el código).

## ✨ Características

- **Catálogo** con categorías, paginación «Cargar más» y fichas de producto.
- **Buscador** con autocompletado en vivo y relevancia por nombre (endpoint propio del plugin).
- **Filtros por categoría**: orden (precio, nombre, recientes), rango de precio, en oferta y solo disponibles.
- **Ficha de producto**: galería de fotos, variaciones (color/talla), productos relacionados y **ficha técnica** (datos importados de Shopify).
- **Carrito y checkout** con la pasarela **Wompi** (plugin propio `tienda-headless`).
- **Diseño de marca** propio (azul + naranja, tipografía Poppins) con Tailwind v4.
- **Importación de catálogo** desde una tienda Shopify (productos, categorías, imágenes y metacampos).

## 🧱 Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS v4 |
| Backend | WordPress + WooCommerce (Store API) + plugin propio `tienda-headless` |
| Pagos | Wompi (sandbox / producción) |
| Entorno local | Docker Compose (WordPress, MariaDB, Mailpit) |

## 📁 Estructura

```
.
├── frontend/                 # App Next.js 16 (la tienda que ve el cliente)
├── wordpress-plugin/
│   └── tienda-headless/      # Plugin propio: Store API extendida, buscador, Wompi, revalidación
├── docker/                   # Scripts de instalación e importación (WP-CLI) y utilidades
├── docker-compose.yml        # WordPress + MariaDB + Mailpit para desarrollo
└── .env.example              # Plantilla de variables del backend/Docker
```

## 🚀 Puesta en marcha (desarrollo)

Requisitos: **Docker** y **Node.js 20+**.

### 1. Backend (WordPress + WooCommerce en Docker)

```bash
# Copia la plantilla de variables y complétala
cp .env.example .env

# Levanta WordPress (:8080) y Mailpit (:8025, bandeja de correo de prueba)
docker compose up -d

# Instala WooCommerce, el plugin y datos de prueba
docker compose run --rm wpcli sh /setup/setup.sh
```

### 2. Frontend (Next.js)

```bash
cd frontend
cp .env.example .env.local      # completa WC_STORE_URL, WOMPI_ENV y REVALIDATE_SECRET
npm install
npm run dev                     # http://localhost:3000
```

## 🔐 Variables de entorno

Los secretos **nunca** se suben al repositorio (`.env` y `.env.local` están en `.gitignore`); solo se publican las plantillas `.env.example`.

**Backend / Docker (`.env`):**

| Variable | Para qué |
|----------|----------|
| `WP_ADMIN_USER` · `WP_ADMIN_PASSWORD` · `WP_ADMIN_EMAIL` | Usuario admin que crea `setup.sh` |
| `REVALIDATE_SECRET` | Secreto compartido para refrescar el catálogo en Next.js al editar productos |
| `WOMPI_PUBLIC_KEY` · `WOMPI_INTEGRITY_SECRET` · `WOMPI_EVENTS_SECRET` | Llaves de Wompi (sandbox o producción) |
| `SHOPIFY_STORE` · `SHOPIFY_TOKEN` | Solo para importar el catálogo desde Shopify (lado servidor) |

**Frontend (`frontend/.env.local`):**

| Variable | Para qué |
|----------|----------|
| `WC_STORE_URL` | URL del WordPress/WooCommerce |
| `WOMPI_ENV` | `sandbox` o `production` |
| `REVALIDATE_SECRET` | El mismo valor que en el backend |

## 📦 Importar el catálogo desde Shopify

Con `SHOPIFY_STORE` y `SHOPIFY_TOKEN` definidos en `.env`, los scripts de `docker/` traen productos, categorías, imágenes y metacampos a WooCommerce. Por ejemplo:

```bash
docker compose run --rm wpcli wp eval-file /setup/import-shopify.php
```

> El token de Shopify es solo de servidor y **nunca** debe llegar al frontend.

## 📝 Estado

Proyecto en desarrollo. Probado en entorno local (Docker + Next.js en modo dev); pendiente el build de producción y la prueba de compra con llaves reales de Wompi.

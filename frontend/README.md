# Front de la tienda (Next.js)

Instrucciones completas en el [README principal](../README.md).

```bash
cp .env.example .env.local
npm install
npm run dev
```

| Ruta | Archivo |
|---|---|
| `/` catálogo | `src/app/page.tsx` |
| `/categoria/[slug]` | `src/app/categoria/[slug]/page.tsx` |
| `/producto/[slug]` | `src/app/producto/[slug]/page.tsx` |
| `/carrito` | `src/app/carrito/page.tsx` |
| `/checkout` | `src/app/checkout/page.tsx` + `src/components/CheckoutForm.tsx` |
| `/checkout/resultado` | `src/app/checkout/resultado/page.tsx` |
| Conexión con WooCommerce | `src/lib/woo.ts` |
| Proxy del carrito y checkout | `src/app/api/**` |

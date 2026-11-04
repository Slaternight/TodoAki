#!/bin/sh
# Instala y configura la tienda local. Se puede ejecutar varias veces.
#   docker compose run --rm wpcli sh /setup/setup.sh
set -e

until [ -f wp-config.php ]; do
  echo "Esperando a que el contenedor de WordPress termine de iniciar..."
  sleep 2
done

if ! wp core is-installed 2>/dev/null; then
  wp core install \
    --url="${WP_URL:-http://localhost:8080}" \
    --title="Mi Tienda" \
    --admin_user="${WP_ADMIN_USER:-admin}" \
    --admin_password="${WP_ADMIN_PASSWORD:?Define WP_ADMIN_PASSWORD en .env}" \
    --admin_email="${WP_ADMIN_EMAIL:-admin@tienda.test}" \
    --skip-email
fi

wp language core install es_CO --activate || echo "Aviso: no se pudo instalar el español."
wp option update permalink_structure '/%postname%/'  # necesario para /wp-json/
wp rewrite flush

wp plugin is-installed woocommerce || wp plugin install woocommerce
wp plugin activate woocommerce tienda-headless
wp language plugin install woocommerce es_CO || true
wp plugin delete hello akismet 2>/dev/null || true

wp eval-file /setup/setup-store.php

echo
echo "Listo. Panel: ${WP_URL:-http://localhost:8080}/wp-admin  (usuario y contraseña en .env)"

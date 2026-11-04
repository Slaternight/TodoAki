<?php
/**
 * Avisa a Next.js (POST /api/revalidate) cuando cambia el catálogo, para que
 * la tienda muestre precios, stock y productos actualizados sin esperar a la caché.
 */

defined( 'ABSPATH' ) || exit;

/**
 * Agrupa todos los cambios de una misma petición en un solo aviso al final.
 */
function th_schedule_revalidation() {
	static $scheduled = false;
	if ( $scheduled ) {
		return;
	}
	$scheduled = true;
	add_action( 'shutdown', 'th_send_revalidation' );
}

function th_send_revalidation() {
	$gateway = th_gateway();
	if ( ! $gateway ) {
		return;
	}

	$frontend = untrailingslashit( (string) $gateway->get_option( 'frontend_url' ) );
	$secret   = (string) $gateway->get_option( 'revalidate_secret' );
	if ( '' === $frontend || '' === $secret ) {
		return;
	}

	// En Docker, WordPress no ve a Next.js en la misma URL que el navegador;
	// docker-compose.yml define TH_REVALIDATE_URL con host.docker.internal.
	$endpoint = defined( 'TH_REVALIDATE_URL' ) ? TH_REVALIDATE_URL : $frontend . '/api/revalidate';

	wp_remote_post(
		$endpoint,
		array(
			'blocking' => false,
			'timeout'  => 3,
			'headers'  => array( 'x-revalidate-secret' => $secret ),
		)
	);
}

foreach ( array(
	'woocommerce_new_product',
	'woocommerce_update_product',
	'woocommerce_delete_product',
	'woocommerce_trash_product',
	'woocommerce_product_set_stock',
	'woocommerce_variation_set_stock',
	'created_product_cat',
	'edited_product_cat',
	'delete_product_cat',
) as $th_hook ) {
	add_action( $th_hook, 'th_schedule_revalidation' );
}

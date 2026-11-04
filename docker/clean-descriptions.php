<?php
/**
 * Quita el bloque <style>…</style> que quedó dentro de la descripción de algunos
 * productos (WordPress lo guardó como texto CSS visible). Re-escribe la
 * descripción desde el body_html de Shopify sin ese bloque. Idempotente.
 *
 *   docker compose run --rm wpcli wp eval-file /setup/clean-descriptions.php
 */

defined( 'ABSPATH' ) || exit;

// Guardar como administrador para que WordPress no re-filtre el HTML de la descripción.
wp_set_current_user( 1 );

$file = '/setup/shopify-products.json';
if ( ! file_exists( $file ) ) {
	WP_CLI::error( "No existe $file." );
}
$products = json_decode( file_get_contents( $file ), true );
if ( ! is_array( $products ) ) {
	WP_CLI::error( 'shopify-products.json no es un JSON válido.' );
}

$con_style      = 0;
$corregidos     = 0;
$no_encontrados = 0;

foreach ( $products as $p ) {
	$html = (string) ( $p['body_html'] ?? '' );
	if ( stripos( $html, '<style' ) === false ) {
		continue;
	}
	++$con_style;

	$ids = get_posts(
		array(
			'post_type'   => 'product',
			'post_status' => 'any',
			'numberposts' => 1,
			'fields'      => 'ids',
			'meta_key'    => '_shopify_id',
			'meta_value'  => (string) $p['shopify_id'],
		)
	);
	if ( ! $ids ) {
		++$no_encontrados;
		continue;
	}

	$clean   = trim( preg_replace( '#<style[^>]*>.*?</style>#is', '', $html ) );
	$product = wc_get_product( (int) $ids[0] );
	if ( ! $product ) {
		continue;
	}
	$product->set_description( $clean );
	$product->save();
	++$corregidos;
	WP_CLI::log( 'limpio: ' . $p['title'] );
}

WP_CLI::success( "Con <style> en origen: $con_style | corregidos: $corregidos | no encontrados: $no_encontrados" );

<?php
/**
 * Guarda la ficha técnica (specs de los metacampos de Shopify) en cada producto
 * como meta _th_specs. El plugin tienda-headless la expone en la Store API.
 * Requiere que docker/shopify-products.json ya tenga `specs` (ver fetch-metafields.mjs).
 * Es idempotente y no toca fotos, precios ni categorías.
 *
 *   docker compose run --rm wpcli wp eval-file /setup/import-specs.php
 */

defined( 'ABSPATH' ) || exit;

$file = '/setup/shopify-products.json';
if ( ! file_exists( $file ) ) {
	WP_CLI::error( "No existe $file." );
}
$products = json_decode( file_get_contents( $file ), true );
if ( ! is_array( $products ) ) {
	WP_CLI::error( 'shopify-products.json no es un JSON válido.' );
}

$con    = 0;
$sin    = 0;
$nofind = 0;

foreach ( $products as $p ) {
	if ( empty( $p['specs'] ) ) {
		++$sin;
		continue;
	}
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
		++$nofind;
		continue;
	}
	// Normaliza: solo label/value, por si el JSON trae algo extra.
	$specs = array();
	foreach ( $p['specs'] as $s ) {
		if ( ! empty( $s['label'] ) && isset( $s['value'] ) && '' !== $s['value'] ) {
			$specs[] = array( 'label' => (string) $s['label'], 'value' => (string) $s['value'] );
		}
	}
	update_post_meta( (int) $ids[0], '_th_specs', $specs );
	++$con;
}

WP_CLI::success( "Fichas técnicas guardadas: $con | sin specs: $sin | producto no encontrado: $nofind" );

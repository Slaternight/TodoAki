<?php
/**
 * Verifica cuántos productos quedaron con foto tras la pasada de imágenes.
 *
 *   docker compose run --rm wpcli wp eval-file /setup/verify-images.php
 */

defined( 'ABSPATH' ) || exit;

// Todos los productos (publicados y borradores).
$q = new WP_Query(
	array(
		'post_type'      => 'product',
		'post_status'    => array( 'publish', 'draft' ),
		'posts_per_page' => -1,
		'fields'         => 'ids',
		'no_found_rows'  => true,
	)
);

$pub_total   = 0;
$pub_confoto = 0;
$drf_total   = 0;
$drf_confoto = 0;
$sin_foto    = array();

foreach ( $q->posts as $pid ) {
	$es_pub = ( 'publish' === get_post_status( $pid ) );
	$tiene  = (bool) get_post_thumbnail_id( $pid );
	if ( $es_pub ) {
		++$pub_total;
		$tiene ? ++$pub_confoto : null;
	} else {
		++$drf_total;
		$tiene ? ++$drf_confoto : null;
	}
	if ( ! $tiene && $es_pub && count( $sin_foto ) < 25 ) {
		$sin_foto[] = get_the_title( $pid );
	}
}

// Adjuntos importados desde Shopify.
$att = new WP_Query(
	array(
		'post_type'      => 'attachment',
		'post_status'    => 'inherit',
		'posts_per_page' => -1,
		'fields'         => 'ids',
		'no_found_rows'  => true,
		'meta_key'       => '_shopify_src',
	)
);
$imgs = count( $att->posts );

WP_CLI::log( '================ IMÁGENES ================' );
WP_CLI::log( sprintf( 'Publicados:   %4d  | con foto: %4d  | SIN foto: %4d', $pub_total, $pub_confoto, $pub_total - $pub_confoto ) );
WP_CLI::log( sprintf( 'Borradores:   %4d  | con foto: %4d  | SIN foto: %4d', $drf_total, $drf_confoto, $drf_total - $drf_confoto ) );
WP_CLI::log( sprintf( 'Imágenes importadas (adjuntos _shopify_src): %d', $imgs ) );
if ( $sin_foto ) {
	WP_CLI::log( 'Ejemplos de publicados SIN foto:' );
	foreach ( $sin_foto as $t ) {
		WP_CLI::log( '  - ' . $t );
	}
}
WP_CLI::success( 'Verificación lista.' );

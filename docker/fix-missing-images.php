<?php
/**
 * Reintenta las imágenes SOLO de los productos publicados que quedaron sin
 * foto principal tras la pasada general (p. ej. por un fallo de red puntual).
 * Usa la primera imagen que descargue bien como principal y el resto como
 * galería, así que es robusto aunque una URL concreta siga fallando.
 *
 *   docker compose run --rm wpcli wp eval-file /setup/fix-missing-images.php
 */

defined( 'ABSPATH' ) || exit;

require_once ABSPATH . 'wp-admin/includes/image.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
wp_set_current_user( 1 );

$products = json_decode( file_get_contents( '/setup/shopify-products.json' ), true );
$by_id    = array();
foreach ( $products as $p ) {
	$by_id[ (string) $p['shopify_id'] ] = $p;
}

function th_sideload_image( $src, $alt = '' ) {
	$existing = get_posts(
		array(
			'post_type'   => 'attachment',
			'numberposts' => 1,
			'fields'      => 'ids',
			'meta_key'    => '_shopify_src',
			'meta_value'  => $src,
		)
	);
	if ( $existing ) {
		return (int) $existing[0];
	}
	$tmp = download_url( $src );
	if ( is_wp_error( $tmp ) ) {
		WP_CLI::warning( "descarga falló: $src -- " . $tmp->get_error_message() );
		return 0;
	}
	$id = media_handle_sideload(
		array( 'name' => basename( parse_url( $src, PHP_URL_PATH ) ), 'tmp_name' => $tmp ),
		0,
		$alt
	);
	if ( is_wp_error( $id ) ) {
		@unlink( $tmp );
		WP_CLI::warning( "sideload falló: $src -- " . $id->get_error_message() );
		return 0;
	}
	update_post_meta( $id, '_shopify_src', $src );
	return (int) $id;
}

$q = new WP_Query(
	array(
		'post_type'      => 'product',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'fields'         => 'ids',
		'no_found_rows'  => true,
	)
);

$arreglados = 0;
$sin_fuente = 0;
$fallo      = 0;

foreach ( $q->posts as $pid ) {
	if ( get_post_thumbnail_id( $pid ) ) {
		continue;
	}
	$sid = get_post_meta( $pid, '_shopify_id', true );
	$p   = $by_id[ (string) $sid ] ?? null;
	if ( ! $p || empty( $p['images'] ) ) {
		++$sin_fuente;
		WP_CLI::log( 'sin imágenes en Shopify: ' . get_the_title( $pid ) );
		continue;
	}
	$atts = array();
	foreach ( $p['images'] as $img ) {
		$att = th_sideload_image( $img['src'], $img['alt'] ?? '' );
		if ( $att ) {
			$atts[] = $att;
		} else {
			++$fallo;
		}
	}
	if ( ! $atts ) {
		continue;
	}
	$product = wc_get_product( $pid );
	$product->set_image_id( array_shift( $atts ) );
	if ( $atts ) {
		$product->set_gallery_image_ids( $atts );
	}
	$product->save();
	if ( get_post_thumbnail_id( $pid ) ) {
		++$arreglados;
		WP_CLI::log( 'ARREGLADO: ' . get_the_title( $pid ) );
	}
}

WP_CLI::success( "Arreglados: $arreglados | sin fuente en Shopify: $sin_fuente | descargas fallidas: $fallo" );

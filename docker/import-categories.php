<?php
/**
 * Asigna a cada producto importado su categoría según docker/product-categories.json
 * (lo genera classify.mjs). Reemplaza "Uncategorized" por la categoría elegida.
 * Es idempotente y se puede re-correr cuando se ajuste la clasificación.
 *
 *   docker compose run --rm wpcli wp eval-file /setup/import-categories.php
 */

defined( 'ABSPATH' ) || exit;

$file = '/setup/product-categories.json';
if ( ! file_exists( $file ) ) {
	WP_CLI::error( "No existe $file. Ejecuta primero en el host: node docker/classify.mjs" );
}
$map = json_decode( file_get_contents( $file ), true );
if ( ! is_array( $map ) ) {
	WP_CLI::error( 'product-categories.json no es un JSON válido.' );
}

// Cache de términos de categoría; crea los que falten.
$terms   = array();
$term_id = function ( $name ) use ( &$terms ) {
	if ( isset( $terms[ $name ] ) ) {
		return $terms[ $name ];
	}
	$t = term_exists( $name, 'product_cat' );
	if ( ! $t ) {
		$t = wp_insert_term( $name, 'product_cat' );
	}
	return $terms[ $name ] = is_wp_error( $t ) ? 0 : (int) $t['term_id'];
};

$asignados      = 0;
$no_encontrados = 0;
$conteo         = array();

foreach ( $map as $row ) {
	$ids = get_posts(
		array(
			'post_type'   => 'product',
			'post_status' => 'any',
			'numberposts' => 1,
			'fields'      => 'ids',
			'meta_key'    => '_shopify_id',
			'meta_value'  => (string) $row['shopify_id'],
		)
	);
	if ( ! $ids ) {
		++$no_encontrados;
		continue;
	}
	$cat = $term_id( $row['category'] );
	if ( ! $cat ) {
		continue;
	}
	// El cuarto parámetro false reemplaza las categorías actuales (quita "Uncategorized").
	wp_set_object_terms( (int) $ids[0], array( $cat ), 'product_cat', false );
	++$asignados;
	$conteo[ $row['category'] ] = ( $conteo[ $row['category'] ] ?? 0 ) + 1;
}

arsort( $conteo );
foreach ( $conteo as $cat => $n ) {
	WP_CLI::log( sprintf( '  %4d  %s', $n, $cat ) );
}
WP_CLI::success( "Categorías asignadas: $asignados | productos no encontrados: $no_encontrados" );

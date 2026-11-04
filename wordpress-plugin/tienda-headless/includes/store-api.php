<?php
/**
 * Ajustes a las respuestas de la Store API para el front headless.
 */

defined( 'ABSPATH' ) || exit;

/**
 * Ordena los términos de los atributos (tallas, colores...) como están en
 * Productos > Atributos > Configurar términos.
 *
 * La Store API los devuelve por orden alfabético (L, M, S, XL) porque WordPress
 * ya tiene en caché los términos del producto ordenados por nombre.
 */
add_filter(
	'rest_post_dispatch',
	function ( $response, $server, $request ) {
		if ( 0 !== strpos( $request->get_route(), '/wc/store/v1/products' ) || $response->is_error() ) {
			return $response;
		}

		// La Store API usa objetos anidados; los pasamos a arrays para poder modificarlos.
		$data     = json_decode( wp_json_encode( $response->get_data() ), true );
		$is_list  = wp_is_numeric_array( $data );
		$products = $is_list ? $data : array( $data );

		foreach ( $products as &$product ) {
			// WordPress guarda algunos títulos con entidades HTML (&#8211; etc.); los devolvemos como texto.
			if ( isset( $product['name'] ) ) {
				$product['name'] = html_entity_decode( (string) $product['name'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
			}
			// Ficha técnica: metacampos guardados por import-specs.php.
			if ( isset( $product['id'] ) ) {
				$specs            = get_post_meta( (int) $product['id'], '_th_specs', true );
				$product['specs'] = is_array( $specs ) ? array_values( $specs ) : array();
			}
			if ( empty( $product['attributes'] ) ) {
				continue;
			}
			foreach ( $product['attributes'] as &$attribute ) {
				if ( empty( $attribute['taxonomy'] ) ) {
					continue; // Los atributos propios del producto ya vienen en el orden en que se escribieron.
				}
				$order = array_flip( wc_get_product_terms( $product['id'], $attribute['taxonomy'], array( 'fields' => 'ids' ) ) );
				usort(
					$attribute['terms'],
					function ( $a, $b ) use ( $order ) {
						return ( $order[ $a['id'] ] ?? PHP_INT_MAX ) <=> ( $order[ $b['id'] ] ?? PHP_INT_MAX );
					}
				);
			}
			unset( $attribute );
		}
		unset( $product );

		$response->set_data( $is_list ? $products : $products[0] );
		return $response;
	},
	10,
	3
);

/**
 * Buscador para el autocompletado y la página /buscar.
 * Prioriza el NOMBRE por inicio de palabra, pero si no alcanza también incluye
 * coincidencias por subcadena del nombre y por la descripción, ordenadas más
 * abajo (así "esa" no queda sin resultados). Niveles de prioridad:
 *   0 = el nombre empieza con el término
 *   1 = una palabra del nombre empieza con el término
 *   2 = el término está en cualquier parte del nombre
 *   3 = el término solo está en la descripción
 *
 *   GET /wp-json/tienda-headless/v1/search?q=es&page=1&per_page=6
 */
add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			'tienda-headless/v1',
			'/search',
			array(
				'methods'             => 'GET',
				'permission_callback' => '__return_true',
				'callback'            => 'th_search_products',
			)
		);
	}
);

function th_search_products( $request ) {
	global $wpdb;

	$q = trim( (string) $request->get_param( 'q' ) );
	if ( mb_strlen( $q ) < 2 ) {
		return array( 'results' => array(), 'total' => 0 );
	}

	$page     = max( 1, (int) $request->get_param( 'page' ) );
	$per_page = min( 48, max( 1, (int) $request->get_param( 'per_page' ) ?: 24 ) );
	$offset   = ( $page - 1 ) * $per_page;

	$like   = $wpdb->esc_like( $q );
	$starts = $like . '%';         // el nombre empieza con el término
	$word   = '% ' . $like . '%';  // alguna palabra del nombre empieza con el término
	$any    = '%' . $like . '%';   // el término en cualquier parte (nombre o descripción)

	// WHERE común (sin datos de usuario; los %s los rellena $wpdb->prepare).
	$where = "post_type = 'product' AND post_status = 'publish'
		AND ( post_title LIKE %s OR post_content LIKE %s OR post_excerpt LIKE %s )";

	$total = (int) $wpdb->get_var(
		$wpdb->prepare(
			"SELECT COUNT(*) FROM {$wpdb->posts} WHERE {$where}",
			$any,
			$any,
			$any
		)
	);

	$rows = $wpdb->get_results(
		$wpdb->prepare(
			"SELECT ID, post_title, post_name,
				CASE
					WHEN post_title LIKE %s THEN 0
					WHEN post_title LIKE %s THEN 1
					WHEN post_title LIKE %s THEN 2
					ELSE 3
				END AS tier
			FROM {$wpdb->posts}
			WHERE {$where}
			ORDER BY tier ASC, post_title ASC
			LIMIT %d OFFSET %d",
			$starts,
			$word,
			$any,
			$any,
			$any,
			$any,
			$per_page,
			$offset
		)
	);

	$results = array();
	foreach ( (array) $rows as $r ) {
		$results[] = array(
			'id'   => (int) $r->ID,
			'name' => html_entity_decode( $r->post_title, ENT_QUOTES | ENT_HTML5, 'UTF-8' ),
			'slug' => $r->post_name,
		);
	}

	return array( 'results' => $results, 'total' => $total );
}

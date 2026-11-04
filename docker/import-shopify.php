<?php
/**
 * Importa el catálogo de Boton Promo a WooCommerce.
 * Paso 2 de 2: CARGA lo que descargó import-shopify.mjs (docker/shopify-products.json).
 *
 *   docker compose run --rm wpcli wp eval-file /setup/import-shopify.php
 *
 * Es idempotente: cada producto y cada variación guardan su id de Shopify en
 * un meta _shopify_id; si ya existen, se actualizan en vez de duplicarse.
 * Solo importa PRODUCTOS (nombre, descripción, imágenes, precio, SKU, stock y
 * variaciones). No toca pedidos ni clientes.
 */

defined( 'ABSPATH' ) || exit;

$file = '/setup/shopify-products.json';
if ( ! file_exists( $file ) ) {
	WP_CLI::error( "No existe $file. Ejecuta primero en el host: node docker/import-shopify.mjs" );
}
$products = json_decode( file_get_contents( $file ), true );
if ( ! is_array( $products ) ) {
	WP_CLI::error( 'El archivo shopify-products.json no es un JSON válido.' );
}

require_once ABSPATH . 'wp-admin/includes/image.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';

// Importamos como administrador para que WordPress no recodifique caracteres
// (por ejemplo "–") en los títulos al guardar.
wp_set_current_user( 1 );

$import_images = '0' !== getenv( 'IMPORT_IMAGES' ); // IMPORT_IMAGES=0 para una prueba rápida sin fotos

/** Busca un producto o variación por el id de Shopify guardado en meta. */
function th_find_by_shopify_id( $shopify_id ) {
	$ids = get_posts(
		array(
			'post_type'   => array( 'product', 'product_variation' ),
			'post_status' => 'any',
			'numberposts' => 1,
			'fields'      => 'ids',
			'meta_key'    => '_shopify_id',
			'meta_value'  => (string) $shopify_id,
		)
	);
	return $ids ? (int) $ids[0] : 0;
}

/** Descarga una imagen de Shopify a la biblioteca de medios (una sola vez por URL). */
function th_sideload_image( $src, $alt = '' ) {
	static $cache = array();
	if ( isset( $cache[ $src ] ) ) {
		return $cache[ $src ];
	}
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
		return $cache[ $src ] = (int) $existing[0];
	}

	$tmp = download_url( $src );
	if ( is_wp_error( $tmp ) ) {
		WP_CLI::warning( "No se pudo descargar la imagen $src" );
		return $cache[ $src ] = 0;
	}
	$id = media_handle_sideload(
		array( 'name' => basename( parse_url( $src, PHP_URL_PATH ) ), 'tmp_name' => $tmp ),
		0,
		$alt
	);
	if ( is_wp_error( $id ) ) {
		@unlink( $tmp );
		WP_CLI::warning( "No se pudo importar la imagen $src" );
		return $cache[ $src ] = 0;
	}
	update_post_meta( $id, '_shopify_src', $src );
	return $cache[ $src ] = (int) $id;
}

/** Categoría por nombre; la crea si no existe. */
function th_category_id( $name ) {
	if ( '' === $name ) {
		return 0;
	}
	$term = term_exists( $name, 'product_cat' );
	if ( ! $term ) {
		$term = wp_insert_term( $name, 'product_cat' );
	}
	return is_wp_error( $term ) ? 0 : (int) $term['term_id'];
}

/** Precio normal y de oferta a partir de price y compare_at_price de Shopify. */
function th_set_prices( $product, $variant ) {
	$price   = (float) $variant['price'];
	$compare = null !== $variant['compare_at_price'] ? (float) $variant['compare_at_price'] : 0;
	if ( $compare > $price ) {
		$product->set_regular_price( (string) $compare );
		$product->set_sale_price( (string) $price );
	} else {
		$product->set_regular_price( (string) $price );
	}
}

/** Stock, solo si en Shopify se administra el inventario de esa variante. */
function th_set_stock( $product, $variant ) {
	if ( 'shopify' === $variant['inventory_management'] ) {
		$product->set_manage_stock( true );
		$product->set_stock_quantity( (int) $variant['inventory_quantity'] );
	}
}

/** Asigna el SKU solo si no lo usa ya otro producto (evita choques en catálogos grandes). */
function th_safe_sku( $product, $sku ) {
	$sku = (string) $sku;
	if ( '' === $sku ) {
		return;
	}
	$owner = wc_get_product_id_by_sku( $sku );
	if ( $owner && $owner !== $product->get_id() ) {
		return; // ya lo usa otro producto; lo dejamos sin SKU para no romper la importación
	}
	$product->set_sku( $sku );
}

$limit      = (int) getenv( 'IMPORT_LIMIT' ); // 0 = todos; >0 = solo los primeros N (para pruebas)
$created    = 0;
$updated    = 0;
$skipped    = 0;
$errores    = 0;
$procesados = 0;

foreach ( $products as $p ) {
	// Productos archivados o sin variantes: no se publican.
	if ( 'archived' === ( $p['status'] ?? '' ) || empty( $p['variants'] ) ) {
		++$skipped;
		continue;
	}
	if ( $limit > 0 && $procesados >= $limit ) {
		break;
	}
	++$procesados;

	try {
	$existing_id = th_find_by_shopify_id( $p['shopify_id'] );
	$is_variable = ! empty( $p['options'] );

	if ( $is_variable ) {
		$product = new WC_Product_Variable( $existing_id );
	} else {
		$product = $existing_id ? wc_get_product( $existing_id ) : new WC_Product_Simple();
		if ( ! $product instanceof WC_Product_Simple ) {
			$product = new WC_Product_Simple( $existing_id );
		}
	}

	$product->set_name( $p['title'] );
	$product->set_slug( $p['handle'] );
	// Quita bloques <style>…</style> que algunos productos traen pegados en la descripción.
	$product->set_description( preg_replace( '#<style[^>]*>.*?</style>#is', '', (string) $p['body_html'] ) );
	$product->set_status( 'active' === $p['status'] ? 'publish' : 'draft' );
	$cat = th_category_id( $p['product_type'] );
	if ( $cat ) {
		$product->set_category_ids( array( $cat ) );
	}

	// Imagen principal (la primera) y galería (el resto).
	if ( $import_images ) {
		$gallery = array();
		foreach ( $p['images'] as $i => $img ) {
			$att = th_sideload_image( $img['src'], $img['alt'] );
			if ( ! $att ) {
				continue;
			}
			if ( 0 === $i ) {
				$product->set_image_id( $att );
			} else {
				$gallery[] = $att;
			}
		}
		if ( $gallery ) {
			$product->set_gallery_image_ids( $gallery );
		}
	}

	if ( $is_variable ) {
		// Atributos (Talla, Color...) a partir de las opciones de Shopify.
		$attributes = array();
		foreach ( $p['options'] as $opt ) {
			$a = new WC_Product_Attribute();
			$a->set_name( $opt['name'] );
			$a->set_options( $opt['values'] );
			$a->set_visible( true );
			$a->set_variation( true );
			$attributes[] = $a;
		}
		$product->set_attributes( $attributes );
		$product->update_meta_data( '_shopify_id', (string) $p['shopify_id'] );
		$parent_id = $product->save();

		foreach ( $p['variants'] as $v ) {
			$var_id    = th_find_by_shopify_id( $v['shopify_id'] );
			$variation = new WC_Product_Variation( $var_id );
			$variation->set_parent_id( $parent_id );

			$attrs = array();
			foreach ( $v['options'] as $ov ) {
				$attrs[ sanitize_title( $ov['name'] ) ] = $ov['value'];
			}
			$variation->set_attributes( $attrs );
			th_set_prices( $variation, $v );
			th_set_stock( $variation, $v );
			th_safe_sku( $variation, $v['sku'] );
			if ( $import_images && ! empty( $v['image_id'] ) ) {
				foreach ( $p['images'] as $img ) {
					if ( $img['id'] === $v['image_id'] ) {
						$att = th_sideload_image( $img['src'], $img['alt'] );
						if ( $att ) {
							$variation->set_image_id( $att );
						}
						break;
					}
				}
			}
			$variation->update_meta_data( '_shopify_id', (string) $v['shopify_id'] );
			$variation->save();
		}
		WC_Product_Variable::sync( $parent_id );
	} else {
		$v = $p['variants'][0];
		th_set_prices( $product, $v );
		th_set_stock( $product, $v );
		th_safe_sku( $product, $v['sku'] );
		$product->update_meta_data( '_shopify_id', (string) $p['shopify_id'] );
		$product->save();
	}

	if ( $existing_id ) {
		++$updated;
	} else {
		++$created;
	}
	WP_CLI::log( ( $existing_id ? '~ ' : '+ ' ) . $p['title'] );
	} catch ( \Throwable $e ) {
		++$errores;
		WP_CLI::warning( 'Falló "' . $p['title'] . '": ' . $e->getMessage() );
	}
}

WP_CLI::success( "Importación: $created creados, $updated actualizados, $skipped omitidos, $errores con error." );
WP_CLI::log( 'El front mostrará el catálogo nuevo en la siguiente visita (revalidate).' );

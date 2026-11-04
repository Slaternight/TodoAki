<?php
/**
 * Configura WooCommerce para Colombia y crea datos de prueba.
 * Lo ejecuta setup.sh con `wp eval-file`. Se puede ejecutar varias veces.
 */

$env = function ( $key, $default = '' ) {
	$value = getenv( $key );
	return false === $value || '' === $value ? $default : $value;
};

// --- Tienda en Colombia, pesos sin decimales -------------------------------

$options = array(
	'woocommerce_default_country'            => 'CO',
	'woocommerce_currency'                   => 'COP',
	'woocommerce_currency_pos'               => 'left_space',
	'woocommerce_price_thousand_sep'         => '.',
	'woocommerce_price_decimal_sep'          => ',',
	'woocommerce_price_num_decimals'         => 0,
	'woocommerce_allowed_countries'          => 'specific',
	'woocommerce_specific_allowed_countries' => array( 'CO' ),
	'woocommerce_ship_to_countries'          => '',
	'woocommerce_calc_taxes'                 => 'no',
	'woocommerce_manage_stock'               => 'yes',
	'woocommerce_coming_soon'                => 'no',
	'woocommerce_onboarding_profile'         => array( 'skipped' => true ),
	'woocommerce_task_list_hidden'           => 'yes',
);
foreach ( $options as $name => $value ) {
	update_option( $name, $value );
}
WP_CLI::log( 'Moneda COP y país Colombia configurados.' );

// --- Zona de envío -----------------------------------------------------------

$has_zone = false;
foreach ( WC_Shipping_Zones::get_zones() as $zone_data ) {
	$has_zone = $has_zone || 'Colombia' === $zone_data['zone_name'];
}
if ( ! $has_zone ) {
	$zone = new WC_Shipping_Zone();
	$zone->set_zone_name( 'Colombia' );
	$zone->add_location( 'CO', 'country' );
	$zone->save();

	foreach ( array( 'Envío estándar' => '12000', 'Envío express' => '25000' ) as $title => $cost ) {
		$instance_id = $zone->add_shipping_method( 'flat_rate' );
		update_option(
			"woocommerce_flat_rate_{$instance_id}_settings",
			array( 'title' => $title, 'tax_status' => 'none', 'cost' => $cost )
		);
	}
	WP_CLI::log( 'Zona de envío "Colombia" creada.' );
}

// --- Productos y cupón de ejemplo ---------------------------------------------

/**
 * Imagen de ejemplo generada con GD, para no depender de internet.
 */
$make_image = function ( $label, array $rgb ) {
	if ( ! function_exists( 'imagecreatetruecolor' ) ) {
		return 0;
	}
	$small = imagecreatetruecolor( 160, 160 );
	imagefill( $small, 0, 0, imagecolorallocate( $small, $rgb[0], $rgb[1], $rgb[2] ) );
	$white = imagecolorallocate( $small, 255, 255, 255 );
	$text  = strtoupper( remove_accents( $label ) );
	imagestring( $small, 5, (int) ( ( 160 - imagefontwidth( 5 ) * strlen( $text ) ) / 2 ), 72, $text, $white );
	$image = imagescale( $small, 800, 800, IMG_NEAREST_NEIGHBOUR );

	$upload = wp_upload_dir();
	$file   = trailingslashit( $upload['path'] ) . sanitize_title( $label ) . '.png';
	imagepng( $image, $file );

	$attachment_id = wp_insert_attachment(
		array(
			'post_mime_type' => 'image/png',
			'post_title'     => $label,
			'post_status'    => 'inherit',
		),
		$file
	);
	require_once ABSPATH . 'wp-admin/includes/image.php';
	wp_update_attachment_metadata( $attachment_id, wp_generate_attachment_metadata( $attachment_id, $file ) );
	return $attachment_id;
};

$category_id = function ( $name ) {
	$term = term_exists( $name, 'product_cat' );
	if ( ! $term ) {
		$term = wp_insert_term( $name, 'product_cat' );
	}
	return (int) $term['term_id'];
};

if ( ! wc_get_products( array( 'limit' => 1, 'return' => 'ids', 'status' => 'any' ) ) ) {
	// nombre, categoría, precio, precio de oferta, stock, color de la imagen
	$products = array(
		array( 'Camiseta Básica', 'Camisetas', 59000, null, 50, array( 37, 99, 235 ) ),
		array( 'Camiseta Estampada', 'Camisetas', 89000, 69000, 30, array( 219, 39, 119 ) ),
		array( 'Gorra Negra', 'Accesorios', 45000, null, 20, array( 39, 39, 42 ) ),
		array( 'Medias Pack x3', 'Accesorios', 25000, null, 100, array( 217, 119, 6 ) ),
		array( 'Morral Urbano', 'Accesorios', 149000, null, 0, array( 5, 150, 105 ) ),
	);

	foreach ( $products as list( $name, $category, $price, $sale, $stock, $color ) ) {
		$product = new WC_Product_Simple();
		$product->set_name( $name );
		$product->set_regular_price( (string) $price );
		if ( $sale ) {
			$product->set_sale_price( (string) $sale );
		}
		$product->set_short_description( "<p>{$name} de producción nacional. Producto de prueba.</p>" );
		$product->set_description( '<p>Descripción completa del producto.</p><ul><li>Hecho en Colombia</li><li>Envío a todo el país</li></ul>' );
		$product->set_category_ids( array( $category_id( $category ) ) );
		$product->set_manage_stock( true );
		$product->set_stock_quantity( $stock );
		$product->set_image_id( $make_image( $name, $color ) );
		$product->save();
	}

	$coupon = new WC_Coupon();
	$coupon->set_code( 'descuento10' );
	$coupon->set_discount_type( 'percent' );
	$coupon->set_amount( 10 );
	$coupon->save();

	WP_CLI::log( count( $products ) . ' productos y el cupón "descuento10" creados.' );
}

// --- Producto variable de ejemplo (tallas y colores) -------------------------
// Talla es un atributo global (pa_talla) y Color uno propio del producto, para
// probar los dos tipos de atributo que maneja WooCommerce.

if ( ! get_page_by_path( 'buzo-con-capota', OBJECT, 'product' ) ) {
	$sizes    = array( 'S', 'M', 'L', 'XL' );
	$taxonomy = wc_attribute_taxonomy_name( 'talla' );

	$talla_id = wc_attribute_taxonomy_id_by_name( 'talla' );
	if ( ! $talla_id ) {
		$talla_id = wc_create_attribute( array( 'name' => 'Talla', 'slug' => 'talla' ) );
	}
	// WooCommerce registra la taxonomía del atributo en la siguiente petición; aquí la necesitamos ya.
	if ( ! taxonomy_exists( $taxonomy ) ) {
		register_taxonomy( $taxonomy, array( 'product' ) );
	}
	$size_ids = array();
	foreach ( $sizes as $position => $size ) {
		$term       = term_exists( $size, $taxonomy ) ?: wp_insert_term( $size, $taxonomy );
		$size_ids[] = (int) $term['term_id'];
		// Mismo efecto que arrastrar los términos en Productos > Atributos.
		update_term_meta( (int) $term['term_id'], 'order', $position );
	}

	$talla = new WC_Product_Attribute();
	$talla->set_id( $talla_id );
	$talla->set_name( $taxonomy );
	$talla->set_options( $size_ids );
	$talla->set_visible( true );
	$talla->set_variation( true );

	$color = new WC_Product_Attribute();
	$color->set_name( 'Color' );
	$color->set_options( array( 'Negro', 'Gris' ) );
	$color->set_position( 1 );
	$color->set_visible( true );
	$color->set_variation( true );

	$buzo = new WC_Product_Variable();
	$buzo->set_name( 'Buzo con Capota' );
	$buzo->set_slug( 'buzo-con-capota' );
	$buzo->set_short_description( '<p>Buzo en algodón perchado, en varias tallas y colores. Producto de prueba.</p>' );
	$buzo->set_description( '<p>Descripción completa del producto.</p><ul><li>Hecho en Colombia</li><li>Envío a todo el país</li></ul>' );
	$buzo->set_category_ids( array( $category_id( 'Buzos' ) ) );
	$buzo->set_attributes( array( $talla, $color ) );
	$buzo->set_default_attributes( array( 'color' => 'Negro' ) );
	$buzo->set_image_id( $make_image( 'Buzo con Capota', array( 82, 82, 91 ) ) );
	$buzo_id = $buzo->save();

	$color_images = array(
		'Negro' => $make_image( 'Buzo Negro', array( 24, 24, 27 ) ),
		'Gris'  => $make_image( 'Buzo Gris', array( 161, 161, 170 ) ),
	);
	foreach ( $color_images as $color_name => $image_id ) {
		foreach ( $sizes as $size ) {
			$variation = new WC_Product_Variation();
			$variation->set_parent_id( $buzo_id );
			$variation->set_attributes( array( $taxonomy => sanitize_title( $size ), 'color' => $color_name ) );
			$variation->set_regular_price( 'XL' === $size ? '130000' : '120000' );
			$variation->set_manage_stock( true );
			// Gris XL agotado, para probar combinaciones sin stock.
			$variation->set_stock_quantity( 'Gris' === $color_name && 'XL' === $size ? 0 : 10 );
			$variation->set_image_id( $image_id );
			$variation->save();
		}
	}
	WC_Product_Variable::sync( $buzo_id );

	WP_CLI::log( 'Producto variable "Buzo con Capota" creado (tallas S a XL, colores Negro y Gris).' );
}

// --- Pasarela Wompi (headless) -----------------------------------------------
// Solo se sobrescriben los valores definidos en .env; lo que configures en el
// panel de WordPress se conserva si dejas la variable vacía.

$settings = (array) get_option( 'woocommerce_wompi_headless_settings', array() );
$from_env = array_filter(
	array(
		'public_key'        => $env( 'WOMPI_PUBLIC_KEY' ),
		'integrity_secret'  => $env( 'WOMPI_INTEGRITY_SECRET' ),
		'events_secret'     => $env( 'WOMPI_EVENTS_SECRET' ),
		'frontend_url'      => $env( 'FRONTEND_URL', 'http://localhost:3000' ),
		'revalidate_secret' => $env( 'REVALIDATE_SECRET' ),
	)
);
update_option(
	'woocommerce_wompi_headless_settings',
	array_merge( array( 'enabled' => 'yes', 'title' => 'Wompi' ), $settings, $from_env )
);
WP_CLI::log( 'Pasarela Wompi (headless) configurada.' );

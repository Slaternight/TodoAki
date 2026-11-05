<?php
/**
 * Plugin Name:       Tienda Headless (Wompi)
 * Description:       Pasarela Wompi para un checkout headless (Next.js) sobre la Store API de WooCommerce, webhook de eventos y refresco del catálogo.
 * Version:           0.1.0
 * Requires at least: 6.4
 * Requires PHP:      7.4
 * Requires Plugins:  woocommerce
 * Text Domain:       tienda-headless
 */

defined( 'ABSPATH' ) || exit;

define( 'TIENDA_HEADLESS_DIR', __DIR__ );

add_action(
	'plugins_loaded',
	function () {
		if ( ! class_exists( 'WC_Payment_Gateway' ) ) {
			return;
		}

		require_once TIENDA_HEADLESS_DIR . '/includes/class-th-gateway-wompi.php';
		require_once TIENDA_HEADLESS_DIR . '/includes/rest.php';
		require_once TIENDA_HEADLESS_DIR . '/includes/revalidate.php';
		require_once TIENDA_HEADLESS_DIR . '/includes/store-api.php';
		require_once TIENDA_HEADLESS_DIR . '/includes/auth.php';

		add_filter(
			'woocommerce_payment_gateways',
			function ( $gateways ) {
				$gateways[] = 'TH_Gateway_Wompi';
				return $gateways;
			}
		);
	}
);

// Compatible con el almacenamiento de pedidos HPOS de WooCommerce.
add_action(
	'before_woocommerce_init',
	function () {
		if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
		}
	}
);

/**
 * Instancia de la pasarela, para leer sus ajustes desde cualquier parte del plugin.
 *
 * @return TH_Gateway_Wompi|null
 */
function th_gateway() {
	$gateways = WC()->payment_gateways() ? WC()->payment_gateways()->payment_gateways() : array();
	return $gateways[ TH_Gateway_Wompi::ID ] ?? null;
}

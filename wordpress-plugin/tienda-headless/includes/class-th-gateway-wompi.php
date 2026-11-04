<?php
/**
 * Pasarela "Wompi (headless)".
 *
 * El front en Next.js crea el pedido con POST /wc/store/v1/checkout usando
 * payment_method = wompi_headless. Esta clase firma la transacción y devuelve
 * la URL del Web Checkout de Wompi, que la Store API entrega al front en
 * payment_result.redirect_url. El pago se confirma después por webhook (rest.php).
 */

defined( 'ABSPATH' ) || exit;

class TH_Gateway_Wompi extends WC_Payment_Gateway {

	const ID           = 'wompi_headless';
	const CHECKOUT_URL = 'https://checkout.wompi.co/p/';

	public function __construct() {
		$this->id                 = self::ID;
		$this->method_title       = 'Wompi (headless)';
		$this->method_description = 'Redirige al Web Checkout de Wompi desde la tienda en Next.js.';
		if ( did_action( 'init' ) ) {
			$this->method_description .= sprintf(
				' En el panel de Wompi, configura la URL de eventos como: <code>%s</code>',
				esc_html( rest_url( 'tienda-headless/v1/wompi/events' ) )
			);
		}
		$this->has_fields = false;
		$this->supports   = array( 'products' );

		$this->init_form_fields();
		$this->init_settings();

		$this->title       = $this->get_option( 'title' );
		$this->description = $this->get_option( 'description' );

		add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, array( $this, 'process_admin_options' ) );
	}

	public function init_form_fields() {
		$this->form_fields = array(
			'enabled'           => array(
				'title'   => 'Activar',
				'type'    => 'checkbox',
				'label'   => 'Activar Wompi (headless)',
				'default' => 'no',
			),
			'title'             => array(
				'title'   => 'Título',
				'type'    => 'text',
				'default' => 'Wompi',
			),
			'description'       => array(
				'title'   => 'Descripción',
				'type'    => 'textarea',
				'default' => 'Paga con tarjeta, PSE, Nequi o Bancolombia.',
			),
			'public_key'        => array(
				'title'       => 'Llave pública',
				'type'        => 'text',
				'description' => 'pub_test_… en sandbox, pub_prod_… en producción.',
			),
			'integrity_secret'  => array(
				'title'       => 'Secreto de integridad',
				'type'        => 'password',
				'description' => 'Wompi > Desarrolladores > Secretos para integración técnica.',
			),
			'events_secret'     => array(
				'title' => 'Secreto de eventos',
				'type'  => 'password',
			),
			'frontend_url'      => array(
				'title'       => 'URL de la tienda (Next.js)',
				'type'        => 'text',
				'description' => 'Ej: https://tutienda.com. Wompi devuelve al cliente a /checkout/resultado.',
			),
			'revalidate_secret' => array(
				'title'       => 'Secreto de revalidación',
				'type'        => 'password',
				'description' => 'El mismo valor que REVALIDATE_SECRET en Next.js. Sirve para refrescar el catálogo al editar productos.',
			),
		);
	}

	public function is_available() {
		return parent::is_available()
			&& '' !== $this->get_option( 'public_key' )
			&& '' !== $this->get_option( 'integrity_secret' )
			&& '' !== $this->get_option( 'frontend_url' );
	}

	/**
	 * @param int $order_id
	 * @return array
	 * @throws Exception Si la moneda no es COP.
	 */
	public function process_payment( $order_id ) {
		$order = wc_get_order( $order_id );

		if ( 'COP' !== $order->get_currency() ) {
			throw new Exception( 'Wompi solo acepta pagos en pesos colombianos (COP).' );
		}

		// Referencia única por intento: si un pago es rechazado, el cliente puede
		// reintentar sobre el mismo pedido y Wompi no acepta referencias repetidas.
		$reference       = $order->get_id() . '-' . time();
		$amount_in_cents = self::amount_in_cents( $order );
		$currency        = 'COP';

		$order->update_meta_data( '_wompi_reference', $reference );
		$order->save();

		$phone  = preg_replace( '/\D+/', '', (string) $order->get_billing_phone() );
		$params = array(
			'public-key'          => $this->get_option( 'public_key' ),
			'currency'            => $currency,
			'amount-in-cents'     => $amount_in_cents,
			'reference'           => $reference,
			'signature:integrity' => hash( 'sha256', $reference . $amount_in_cents . $currency . $this->get_option( 'integrity_secret' ) ),
			'redirect-url'        => untrailingslashit( $this->get_option( 'frontend_url' ) ) . '/checkout/resultado',
			'customer-data:email' => $order->get_billing_email(),
			'customer-data:full-name' => trim( $order->get_billing_first_name() . ' ' . $order->get_billing_last_name() ),
		);
		if ( '' !== $phone ) {
			$params['customer-data:phone-number']        = $phone;
			$params['customer-data:phone-number-prefix'] = '+57';
		}

		return array(
			'result'   => 'success',
			'redirect' => self::CHECKOUT_URL . '?' . http_build_query( array_filter( $params ), '', '&', PHP_QUERY_RFC3986 ),
		);
	}

	/**
	 * Total del pedido en centavos, como lo espera Wompi.
	 *
	 * @param WC_Order $order
	 * @return int
	 */
	public static function amount_in_cents( $order ) {
		return (int) round( (float) $order->get_total() * 100 );
	}
}

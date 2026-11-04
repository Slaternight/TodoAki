<?php
/**
 * Endpoints REST del plugin (namespace tienda-headless/v1):
 *
 * POST /wompi/events      Webhook de Wompi. Confirma o rechaza el pago del pedido.
 * GET  /states/{country}  Departamentos/estados con los códigos que espera WooCommerce.
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			'tienda-headless/v1',
			'/wompi/events',
			array(
				'methods'             => 'POST',
				'callback'            => 'th_wompi_events',
				'permission_callback' => '__return_true', // Se valida con el checksum de Wompi.
			)
		);

		register_rest_route(
			'tienda-headless/v1',
			'/states/(?P<country>[A-Za-z]{2})',
			array(
				'methods'             => 'GET',
				'permission_callback' => '__return_true',
				'callback'            => function ( WP_REST_Request $request ) {
					$states = WC()->countries->get_states( strtoupper( $request['country'] ) );
					return rest_ensure_response( $states ? $states : new stdClass() );
				},
			)
		);
	}
);

/**
 * Verifica la firma de un evento de Wompi.
 *
 * Wompi concatena los valores de signature.properties (rutas dentro de "data"),
 * luego timestamp y el secreto de eventos, y calcula SHA256.
 *
 * @param array  $event  Cuerpo del evento.
 * @param string $secret Secreto de eventos.
 * @return bool
 */
function th_wompi_checksum_is_valid( array $event, $secret ) {
	$properties = $event['signature']['properties'] ?? null;
	$checksum   = (string) ( $event['signature']['checksum'] ?? '' );

	if ( ! is_array( $properties ) || '' === $secret || '' === $checksum || ! isset( $event['timestamp'] ) ) {
		return false;
	}

	$payload = '';
	foreach ( $properties as $path ) {
		$value = $event['data'] ?? array();
		foreach ( explode( '.', (string) $path ) as $key ) {
			$value = is_array( $value ) && array_key_exists( $key, $value ) ? $value[ $key ] : '';
		}
		$payload .= is_scalar( $value ) ? (string) $value : '';
	}
	$payload .= $event['timestamp'] . $secret;

	return hash_equals( strtolower( hash( 'sha256', $payload ) ), strtolower( $checksum ) );
}

/**
 * Webhook de Wompi. Responde 200 a todo evento con firma válida (aunque se
 * ignore) para que Wompi no lo reintente.
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response
 */
function th_wompi_events( WP_REST_Request $request ) {
	$event   = (array) $request->get_json_params();
	$gateway = th_gateway();

	if ( ! $gateway || ! th_wompi_checksum_is_valid( $event, (string) $gateway->get_option( 'events_secret' ) ) ) {
		return new WP_REST_Response( array( 'error' => 'invalid_signature' ), 401 );
	}

	if ( 'transaction.updated' !== ( $event['event'] ?? '' ) ) {
		return new WP_REST_Response( array( 'ignored' => true ), 200 );
	}

	$transaction = $event['data']['transaction'] ?? array();
	$reference   = (string) ( $transaction['reference'] ?? '' );
	$order       = wc_get_order( (int) strtok( $reference, '-' ) );

	if ( ! $order || TH_Gateway_Wompi::ID !== $order->get_payment_method() ) {
		return new WP_REST_Response( array( 'ignored' => true ), 200 );
	}

	$transaction_id = (string) ( $transaction['id'] ?? '' );
	$status         = (string) ( $transaction['status'] ?? '' );
	$method         = (string) ( $transaction['payment_method_type'] ?? '' );

	if ( (int) ( $transaction['amount_in_cents'] ?? 0 ) !== TH_Gateway_Wompi::amount_in_cents( $order ) ) {
		$order->add_order_note(
			sprintf( 'Wompi: la transacción %s (%s) no coincide con el total del pedido. No se cambió el estado.', $transaction_id, $status )
		);
		return new WP_REST_Response( array( 'ignored' => true ), 200 );
	}

	switch ( $status ) {
		case 'APPROVED':
			if ( ! $order->is_paid() ) {
				$order->payment_complete( $transaction_id );
				$order->add_order_note( sprintf( 'Pago aprobado en Wompi. Transacción %s (%s).', $transaction_id, $method ) );
			}
			break;

		case 'DECLINED':
		case 'ERROR':
			if ( ! $order->is_paid() ) {
				$order->update_status( 'failed', sprintf( 'Wompi: transacción %s %s (%s).', $transaction_id, $status, $method ) );
			}
			break;

		case 'VOIDED':
			$order->add_order_note( sprintf( 'Wompi anuló la transacción %s. Revisa el estado del pedido.', $transaction_id ) );
			break;
	}

	return new WP_REST_Response( array( 'ok' => true ), 200 );
}

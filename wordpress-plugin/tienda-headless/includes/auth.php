<?php
/**
 * Cuentas de cliente (headless).
 *
 * Endpoints REST (namespace tienda-headless/v1/auth) pensados para que el
 * frontend de Next.js haga de intermediario. La sesión se identifica con un
 * token firmado (HMAC); Next lo guarda en una cookie httpOnly. Aquí solo se
 * emite y se valida: no se usan las cookies de sesión de WordPress.
 *
 * POST /auth/registro   Crea un cliente de WooCommerce y devuelve token + datos.
 * POST /auth/login      Valida credenciales y devuelve token + datos.
 * GET  /auth/yo         Devuelve los datos del cliente del token.
 * GET  /auth/pedidos    Devuelve el historial de pedidos del cliente.
 */

defined( 'ABSPATH' ) || exit;

/**
 * Secreto para firmar los tokens. Usa las sales de WordPress (siempre existen
 * y son secretas). Si regeneras las sales, las sesiones caducan.
 */
function th_auth_secret() {
	return wp_salt( 'auth' );
}

function th_auth_b64url_encode( $data ) {
	return rtrim( strtr( base64_encode( $data ), '+/', '-_' ), '=' );
}

function th_auth_b64url_decode( $data ) {
	return base64_decode( strtr( (string) $data, '-_', '+/' ) );
}

/**
 * Emite un token firmado para un usuario. Formato: base64url(payload).hmac
 *
 * @param int $user_id
 * @return string
 */
function th_auth_issue_token( $user_id ) {
	$payload = wp_json_encode(
		array(
			'uid' => (int) $user_id,
			'exp' => time() + 30 * DAY_IN_SECONDS,
		)
	);
	$body = th_auth_b64url_encode( $payload );
	$sig  = hash_hmac( 'sha256', $body, th_auth_secret() );
	return $body . '.' . $sig;
}

/**
 * Valida un token y devuelve el ID de usuario, o 0 si no es válido.
 *
 * @param string|null $token
 * @return int
 */
function th_auth_validate_token( $token ) {
	if ( ! is_string( $token ) || 1 !== substr_count( $token, '.' ) ) {
		return 0;
	}
	list( $body, $sig ) = explode( '.', $token, 2 );
	$expected = hash_hmac( 'sha256', $body, th_auth_secret() );
	if ( ! hash_equals( $expected, (string) $sig ) ) {
		return 0;
	}
	$data = json_decode( (string) th_auth_b64url_decode( $body ), true );
	if ( ! is_array( $data ) || empty( $data['uid'] ) || empty( $data['exp'] ) ) {
		return 0;
	}
	if ( time() > (int) $data['exp'] ) {
		return 0;
	}
	$uid = (int) $data['uid'];
	return get_userdata( $uid ) ? $uid : 0;
}

/**
 * Lee el token de la petición (header X-TH-Auth o Authorization: Bearer).
 *
 * @param WP_REST_Request $request
 * @return int ID de usuario, o 0.
 */
function th_auth_current_user( WP_REST_Request $request ) {
	$token = $request->get_header( 'X-TH-Auth' );
	if ( ! $token ) {
		$auth = (string) $request->get_header( 'Authorization' );
		if ( 0 === stripos( $auth, 'bearer ' ) ) {
			$token = substr( $auth, 7 );
		}
	}
	return th_auth_validate_token( $token );
}

/**
 * permission_callback para los endpoints que exigen sesión.
 */
function th_auth_require( WP_REST_Request $request ) {
	return th_auth_current_user( $request ) > 0;
}

/**
 * Datos públicos del cliente (los que ve el frontend).
 */
function th_auth_user_data( $user_id ) {
	$user = get_userdata( $user_id );
	$data = array(
		'id'           => (int) $user_id,
		'email'        => $user ? $user->user_email : '',
		'first_name'   => (string) get_user_meta( $user_id, 'first_name', true ),
		'last_name'    => (string) get_user_meta( $user_id, 'last_name', true ),
		'display_name' => $user ? $user->display_name : '',
	);

	// Dirección guardada (para "Editar perfil" y autollenar el checkout).
	if ( class_exists( 'WC_Customer' ) ) {
		$c               = new WC_Customer( $user_id );
		$data['billing'] = array(
			'first_name' => $c->get_billing_first_name(),
			'last_name'  => $c->get_billing_last_name(),
			'phone'      => $c->get_billing_phone(),
			'address_1'  => $c->get_billing_address_1(),
			'address_2'  => $c->get_billing_address_2(),
			'city'       => $c->get_billing_city(),
			'state'      => $c->get_billing_state(),
			'postcode'   => $c->get_billing_postcode(),
			'country'    => $c->get_billing_country() ?: 'CO',
		);
	}

	return $data;
}

/**
 * Respuesta estándar: datos del cliente y (opcional) un token nuevo.
 */
function th_auth_user_response( $user_id, $with_token = true ) {
	if ( ! get_userdata( $user_id ) ) {
		return new WP_Error( 'th_auth_user', 'Usuario no encontrado.', array( 'status' => 404 ) );
	}
	$data = array( 'user' => th_auth_user_data( $user_id ) );
	if ( $with_token ) {
		$data['token'] = th_auth_issue_token( $user_id );
	}
	return rest_ensure_response( $data );
}

add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			'tienda-headless/v1',
			'/auth/registro',
			array(
				'methods'             => 'POST',
				'permission_callback' => '__return_true',
				'callback'            => 'th_auth_register',
			)
		);
		register_rest_route(
			'tienda-headless/v1',
			'/auth/login',
			array(
				'methods'             => 'POST',
				'permission_callback' => '__return_true',
				'callback'            => 'th_auth_login',
			)
		);
		register_rest_route(
			'tienda-headless/v1',
			'/auth/yo',
			array(
				'methods'             => 'GET',
				'permission_callback' => 'th_auth_require',
				'callback'            => 'th_auth_me',
			)
		);
		register_rest_route(
			'tienda-headless/v1',
			'/auth/pedidos',
			array(
				'methods'             => 'GET',
				'permission_callback' => 'th_auth_require',
				'callback'            => 'th_auth_orders',
			)
		);
		register_rest_route(
			'tienda-headless/v1',
			'/auth/recuperar',
			array(
				'methods'             => 'POST',
				'permission_callback' => '__return_true',
				'callback'            => 'th_auth_request_reset',
			)
		);
		register_rest_route(
			'tienda-headless/v1',
			'/auth/restablecer',
			array(
				'methods'             => 'POST',
				'permission_callback' => '__return_true',
				'callback'            => 'th_auth_do_reset',
			)
		);
		register_rest_route(
			'tienda-headless/v1',
			'/auth/perfil',
			array(
				'methods'             => 'POST',
				'permission_callback' => 'th_auth_require',
				'callback'            => 'th_auth_update_profile',
			)
		);
	}
);

/**
 * POST /auth/registro
 */
function th_auth_register( WP_REST_Request $request ) {
	if ( ! function_exists( 'wc_create_new_customer' ) ) {
		return new WP_Error( 'th_wc', 'WooCommerce no está disponible.', array( 'status' => 500 ) );
	}

	$email    = sanitize_email( (string) $request['email'] );
	$password = (string) $request['password'];
	$first    = sanitize_text_field( (string) ( $request['first_name'] ?? '' ) );
	$last     = sanitize_text_field( (string) ( $request['last_name'] ?? '' ) );

	if ( ! is_email( $email ) ) {
		return new WP_Error( 'th_email', 'Escribe un correo válido.', array( 'status' => 400 ) );
	}
	if ( strlen( $password ) < 6 ) {
		return new WP_Error( 'th_password', 'La contraseña debe tener al menos 6 caracteres.', array( 'status' => 400 ) );
	}
	if ( email_exists( $email ) ) {
		return new WP_Error( 'th_exists', 'Ya existe una cuenta con ese correo. Inicia sesión.', array( 'status' => 409 ) );
	}

	$user_id = wc_create_new_customer( $email, '', $password );
	if ( is_wp_error( $user_id ) ) {
		return new WP_Error( 'th_register', $user_id->get_error_message(), array( 'status' => 400 ) );
	}

	wp_update_user(
		array(
			'ID'           => $user_id,
			'first_name'   => $first,
			'last_name'    => $last,
			'display_name' => trim( $first . ' ' . $last ) ?: $email,
		)
	);

	return th_auth_user_response( $user_id );
}

/**
 * POST /auth/login
 */
function th_auth_login( WP_REST_Request $request ) {
	$login    = trim( (string) ( $request['email'] ?? $request['username'] ?? '' ) );
	$password = (string) $request['password'];

	if ( '' === $login || '' === $password ) {
		return new WP_Error( 'th_login', 'Escribe tu correo y contraseña.', array( 'status' => 400 ) );
	}

	$user = wp_authenticate( $login, $password );
	if ( is_wp_error( $user ) ) {
		return new WP_Error( 'th_login', 'Correo o contraseña incorrectos.', array( 'status' => 401 ) );
	}

	return th_auth_user_response( $user->ID );
}

/**
 * GET /auth/yo
 */
function th_auth_me( WP_REST_Request $request ) {
	return th_auth_user_response( th_auth_current_user( $request ), false );
}

/**
 * GET /auth/pedidos
 */
function th_auth_orders( WP_REST_Request $request ) {
	$uid  = th_auth_current_user( $request );
	$user = get_userdata( $uid );
	if ( ! $user || ! function_exists( 'wc_get_orders' ) ) {
		return rest_ensure_response( array( 'orders' => array() ) );
	}

	$orders = wc_get_orders(
		array(
			'customer' => $user->user_email,
			'limit'    => 20,
			'orderby'  => 'date',
			'order'    => 'DESC',
		)
	);

	$out = array();
	foreach ( $orders as $order ) {
		$items = array();
		foreach ( $order->get_items() as $item ) {
			$items[] = array(
				'name'     => $item->get_name(),
				'quantity' => $item->get_quantity(),
			);
		}
		$created = $order->get_date_created();
		$out[]   = array(
			'id'           => $order->get_id(),
			'number'       => $order->get_order_number(),
			'date'         => $created ? $created->date( 'Y-m-d' ) : '',
			'status'       => $order->get_status(),
			'status_label' => wc_get_order_status_name( $order->get_status() ),
			'total'        => $order->get_total(),
			'currency'     => $order->get_currency(),
			'items'        => $items,
		);
	}

	return rest_ensure_response( array( 'orders' => $out ) );
}

/**
 * URL pública del frontend (Next.js), tomada de la config de la pasarela. Se
 * usa para el enlace del correo de recuperación. No se acepta del cliente, para
 * que nadie pueda inyectar un enlace a un sitio falso.
 */
function th_auth_frontend_url() {
	$gateway = function_exists( 'th_gateway' ) ? th_gateway() : null;
	$url     = $gateway ? (string) $gateway->get_option( 'frontend_url' ) : '';
	return '' !== $url ? untrailingslashit( $url ) : '';
}

/**
 * POST /auth/recuperar  { email }
 * Siempre responde ok (no revela si el correo existe). Si existe, envía un
 * correo con un enlace al frontend para crear una nueva contraseña.
 */
function th_auth_request_reset( WP_REST_Request $request ) {
	$email = sanitize_email( (string) $request['email'] );
	$user  = ( $email && is_email( $email ) ) ? get_user_by( 'email', $email ) : false;
	$base  = th_auth_frontend_url();

	if ( $user && '' !== $base ) {
		$key = get_password_reset_key( $user );
		if ( ! is_wp_error( $key ) ) {
			$link    = add_query_arg(
				array(
					'key'   => $key,
					'login' => $user->user_login,
				),
				$base . '/restablecer'
			);
			$site = wp_specialchars_decode( (string) get_bloginfo( 'name' ), ENT_QUOTES );
			$safe = esc_url( $link );
			$html = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#27272a;line-height:1.5">'
				. '<p>Hola,</p>'
				. '<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>' . esc_html( $site ) . '</strong>.</p>'
				. '<p style="margin:24px 0"><a href="' . $safe . '" style="background:#2563EB;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;display:inline-block;font-weight:bold">Crear nueva contraseña</a></p>'
				. '<p style="font-size:13px;color:#71717a">O copia este enlace (vence en un día):<br><a href="' . $safe . '" style="color:#2563EB">' . esc_html( $link ) . '</a></p>'
				. '<p style="font-size:13px;color:#71717a">Si no fuiste tú, ignora este correo: tu contraseña no cambiará.</p>'
				. '</div>';
			wp_mail(
				$user->user_email,
				"$site: restablece tu contraseña",
				$html,
				array( 'Content-Type: text/html; charset=UTF-8' )
			);
		}
	}

	return rest_ensure_response( array( 'ok' => true ) );
}

/**
 * POST /auth/restablecer  { login, key, password }
 */
function th_auth_do_reset( WP_REST_Request $request ) {
	$login    = sanitize_user( (string) $request['login'] );
	$key      = (string) $request['key'];
	$password = (string) $request['password'];

	if ( strlen( $password ) < 6 ) {
		return new WP_Error( 'th_password', 'La contraseña debe tener al menos 6 caracteres.', array( 'status' => 400 ) );
	}

	$user = check_password_reset_key( $key, $login );
	if ( is_wp_error( $user ) ) {
		return new WP_Error( 'th_reset', 'El enlace no es válido o ya venció. Pide uno nuevo.', array( 'status' => 400 ) );
	}

	reset_password( $user, $password );
	return rest_ensure_response( array( 'ok' => true ) );
}

/**
 * POST /auth/perfil  { first_name, last_name, billing: {...} }  (requiere sesión)
 * Actualiza el nombre y la dirección guardada (billing y shipping, la misma).
 */
function th_auth_update_profile( WP_REST_Request $request ) {
	$uid = th_auth_current_user( $request );
	if ( ! $uid ) {
		return new WP_Error( 'th_auth', 'No autenticado.', array( 'status' => 401 ) );
	}

	$first = sanitize_text_field( (string) ( $request['first_name'] ?? '' ) );
	$last  = sanitize_text_field( (string) ( $request['last_name'] ?? '' ) );
	$b     = (array) ( $request['billing'] ?? array() );
	$user  = get_userdata( $uid );

	wp_update_user(
		array(
			'ID'           => $uid,
			'first_name'   => $first,
			'last_name'    => $last,
			'display_name' => trim( $first . ' ' . $last ) ?: $user->user_email,
		)
	);

	if ( class_exists( 'WC_Customer' ) ) {
		$c    = new WC_Customer( $uid );
		$addr = array(
			'first_name' => $first,
			'last_name'  => $last,
			'phone'      => sanitize_text_field( (string) ( $b['phone'] ?? '' ) ),
			'address_1'  => sanitize_text_field( (string) ( $b['address_1'] ?? '' ) ),
			'address_2'  => sanitize_text_field( (string) ( $b['address_2'] ?? '' ) ),
			'city'       => sanitize_text_field( (string) ( $b['city'] ?? '' ) ),
			'state'      => sanitize_text_field( (string) ( $b['state'] ?? '' ) ),
			'postcode'   => sanitize_text_field( (string) ( $b['postcode'] ?? '' ) ),
			'country'    => 'CO',
		);
		foreach ( $addr as $field => $value ) {
			$set_billing  = "set_billing_$field";
			$set_shipping = "set_shipping_$field";
			if ( method_exists( $c, $set_billing ) ) {
				$c->$set_billing( $value );
			}
			if ( method_exists( $c, $set_shipping ) ) {
				$c->$set_shipping( $value );
			}
		}
		$c->set_billing_email( $user->user_email );
		$c->save();
	}

	return th_auth_user_response( $uid, false );
}

/**
 * Liga un pedido de invitado a la cuenta cuyo correo coincide, para que
 * aparezca en "Mis pedidos" asociado al cliente.
 */
add_action( 'woocommerce_store_api_checkout_order_processed', 'th_auth_link_order_to_customer', 10, 1 );
function th_auth_link_order_to_customer( $order ) {
	if ( is_numeric( $order ) ) {
		$order = wc_get_order( $order );
	}
	if ( ! $order || $order->get_customer_id() ) {
		return;
	}
	$user = get_user_by( 'email', $order->get_billing_email() );
	if ( $user ) {
		$order->set_customer_id( $user->ID );
		$order->save();
	}
}

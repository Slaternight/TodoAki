<?php
/**
 * Solo para Docker local: envía todos los correos de WordPress a Mailpit.
 * Bandeja de entrada en http://localhost:8025
 */

add_action(
	'phpmailer_init',
	function ( $mailer ) {
		$mailer->isSMTP();
		$mailer->Host     = 'mailpit';
		$mailer->Port     = 1025;
		$mailer->SMTPAuth = false;
	}
);

// WordPress usa wordpress@localhost como remitente y PHPMailer lo rechaza por no tener dominio.
add_filter( 'wp_mail_from', fn() => 'tienda@tienda.test' );

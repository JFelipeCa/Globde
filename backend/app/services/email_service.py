import logging
import smtplib
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from pathlib import Path
from typing import Literal

from app.core.config import settings
from app.db.database import MySQLError, execute

logger = logging.getLogger("globde.email")

TipoEmail = Literal[
    "password_reset",
    "email_verification",
    "confirmacion_cita",
    "cancelacion_cita",
    "recordatorio_cita",
    "factura",
    "notificacion_sistema",
]


# ----------------------------------------------------------------------
# Registro en email_logs
# ----------------------------------------------------------------------

def _log_pendiente(
    destinatario: str, tipo: TipoEmail, asunto: str, id_usuario: int | None
) -> int | None:
    try:
        return execute(
            """INSERT INTO email_logs
                   (id_usuario, destinatario, tipo, asunto, estado, proveedor)
               VALUES (%s, %s, %s, %s, 'pendiente', %s)""",
            (id_usuario, destinatario[:180], tipo, asunto[:200], (settings.SMTP_HOST or "smtp")[:80]),
        )
    except MySQLError as exc:  # pragma: no cover
        logger.warning("No se pudo registrar email_log: %s", exc)
        return None


def _log_enviado(id_email: int | None) -> None:
    if id_email is None:
        return
    try:
        execute(
            "UPDATE email_logs SET estado = 'enviado', enviado_en = NOW() WHERE id_email = %s",
            (id_email,),
        )
    except MySQLError:  
        pass


def _log_fallido(id_email: int | None, error: str) -> None:
    if id_email is None:
        return
    try:
        execute(
            "UPDATE email_logs SET estado = 'fallido', error = %s WHERE id_email = %s",
            (error[:2000], id_email),
        )
    except MySQLError:  
        pass


# ----------------------------------------------------------------------
# Envio
# ----------------------------------------------------------------------

def _crear_mensaje(destinatario: str, asunto: str, html: str, texto: str) -> MIMEMultipart:
    mensaje = MIMEMultipart("related")
    mensaje["Subject"] = asunto
    mensaje["From"] = formataddr(("GLOBDE Barber Gestor", settings.SMTP_FROM))
    mensaje["To"] = destinatario

    alternativas = MIMEMultipart("alternative")
    alternativas.attach(MIMEText(texto, "plain", "utf-8"))
    alternativas.attach(MIMEText(html, "html", "utf-8"))
    mensaje.attach(alternativas)

    ruta_logo = Path(__file__).resolve().parents[1] / "assets" / "email-logo.png"
    with ruta_logo.open("rb") as archivo:
        logo = MIMEImage(archivo.read(), _subtype="png")
    logo.add_header("Content-ID", "<globde-logo>")
    logo.add_header("Content-Disposition", "inline")
    mensaje.attach(logo)
    return mensaje


def _enviar_smtp(destinatario: str, asunto: str, html: str, texto: str) -> None:
    mensaje = _crear_mensaje(destinatario, asunto, html, texto)

    if settings.SMTP_PORT == 465:
        with smtplib.SMTP_SSL(
            settings.SMTP_HOST, settings.SMTP_PORT, timeout=settings.SMTP_TIMEOUT
        ) as servidor:
            servidor.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            servidor.send_message(mensaje)
        return

    with smtplib.SMTP(
        settings.SMTP_HOST, settings.SMTP_PORT, timeout=settings.SMTP_TIMEOUT
    ) as servidor:
        servidor.ehlo()
        if settings.SMTP_STARTTLS:
            servidor.starttls()
            servidor.ehlo()
        servidor.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        servidor.send_message(mensaje)


def enviar_email(
    destinatario: str,
    asunto: str,
    html: str,
    texto: str | None = None,
    tipo: TipoEmail = "notificacion_sistema",
    id_usuario: int | None = None,
) -> bool:
    """Envia un correo y lo registra en email_logs. Devuelve True si se envio."""
    id_email = _log_pendiente(destinatario, tipo, asunto, id_usuario)
    texto = texto or "Este mensaje requiere un cliente de correo compatible con HTML."

    if not settings.EMAIL_ENABLED:
        _log_fallido(id_email, "EMAIL_ENABLED=false: envio deshabilitado por configuracion")
        logger.info("[EMAIL SIMULADO] Para: %s | Asunto: %s", destinatario, asunto)
        return False

    if not settings.smtp_configurado:
        _log_fallido(id_email, "Configuracion SMTP incompleta")
        logger.error("Configuracion SMTP incompleta: no se envio '%s'", asunto)
        return False

    try:
        _enviar_smtp(destinatario, asunto, html, texto)
        _log_enviado(id_email)
        logger.info("Correo '%s' enviado a %s", tipo, destinatario)
        return True
    except Exception as exc:  
        _log_fallido(id_email, str(exc))
        logger.error("Fallo el envio de correo a %s: %s", destinatario, exc)
        return False


# ----------------------------------------------------------------------
# Plantillas
# ----------------------------------------------------------------------

def _plantilla_base(titulo: str, cuerpo_html: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <style>
      :root {{ color-scheme: light dark; supported-color-schemes: light dark; }}
      @media screen and (max-width:600px) {{
        .email-wrap {{ padding:20px 12px !important; }}
        .email-content {{ padding:28px 22px !important; }}
      }}
      @media (prefers-color-scheme:dark) {{
        .email-body, .email-wrap {{ background-color:#0b1220 !important; }}
        .email-shell, .email-header, .email-content {{ background-color:#111827 !important; border-color:#263449 !important; }}
        .email-brand {{ color:#f8fafc !important; }}
        .email-subtitle, .email-footer {{ color:#aab8ca !important; }}
        .email-content {{ color:#e2e8f0 !important; }}
        .email-content h2, .email-content p, .email-content td, .email-content strong {{
          color:#e2e8f0 !important;
        }}
        .email-note {{ background-color:#1e293b !important; border-color:#22d3ee !important; }}
        .email-footer-wrap {{ background-color:#0b1220 !important; border-color:#263449 !important; }}
      }}
      [data-ogsc] .email-body, [data-ogsc] .email-wrap {{ background-color:#0b1220 !important; }}
      [data-ogsc] .email-shell, [data-ogsc] .email-header, [data-ogsc] .email-content {{ background-color:#111827 !important; }}
      [data-ogsc] .email-content h2, [data-ogsc] .email-content p,
      [data-ogsc] .email-content td {{ color:#e2e8f0 !important; }}
      [data-ogsc] .email-note {{ background-color:#1e293b !important; border-color:#22d3ee !important; }}
      [data-ogsc] .email-footer-wrap {{ background-color:#0b1220 !important; }}
    </style>
  </head>
  <body class="email-body" style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,'Segoe UI',Tahoma,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      {titulo} · GLOBDE Barber Gestor
    </div>
    <table role="presentation" cellspacing="0" cellpadding="0" width="100%" class="email-body email-wrap" style="background-color:#f4f7fb;padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" width="100%" class="email-shell" style="max-width:560px;background-color:#ffffff;border:1px solid #e1e8f0;border-radius:18px;overflow:hidden;">
          <tr><td style="height:4px;background-color:#22d3ee;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td align="center" class="email-header" style="padding:26px 24px 22px;background-color:#ffffff;border-bottom:1px solid #e8eef5;">
            <table role="presentation" cellspacing="0" cellpadding="0" align="center">
              <tr>
                <td valign="middle" style="padding-right:11px;">
                  <img src="cid:globde-logo" width="48" height="48" alt="GLOBDE" style="display:block;width:48px;height:48px;background-color:#ffffff;border:1px solid #d8edf2;border-radius:14px;padding:4px;">
                </td>
                <td valign="middle" align="left">
                  <h1 class="email-brand" style="margin:0;font-size:23px;color:#111827;letter-spacing:1px;font-weight:800;">GLOBDE</h1>
                  <p class="email-subtitle" style="margin:3px 0 0;font-size:10px;color:#64748b;letter-spacing:1.8px;text-transform:uppercase;">Barber Gestor</p>
                </td>
              </tr>
            </table>
            <p class="email-subtitle" style="margin:16px 0 0;font-size:13px;color:#64748b;">{titulo}</p>
          </td></tr>
          <tr><td class="email-content" style="padding:34px 32px;background-color:#ffffff;color:#1f2937;">{cuerpo_html}</td></tr>
          <tr><td align="center" class="email-footer-wrap" style="background-color:#f8fafc;padding:18px 20px;border-top:1px solid #e8eef5;">
            <p class="email-footer" style="margin:0;font-size:12px;color:#64748b;">Este es un correo automático de GLOBDE. Por favor, no respondas a este mensaje.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>"""


def _boton(enlace: str, texto: str) -> str:
    return f"""<table role="presentation" cellspacing="0" cellpadding="0" width="100%">
      <tr><td align="center" style="padding:8px 0 28px;">
        <a href="{enlace}" target="_blank" style="background:#0e7490;color:#ffffff;padding:14px 32px;text-decoration:none;border:1px solid #0e7490;border-radius:10px;font-weight:700;font-size:15px;display:inline-block;">{texto}</a>
      </td></tr></table>"""


def enviar_recuperacion_password(
    destinatario: str, nombre: str, token: str, id_usuario: int | None = None
) -> bool:
    enlace = f"{settings.FRONTEND_URL.rstrip('/')}/restablecer-password?token={token}"
    cuerpo = f"""
      <h2 style="margin:0 0 18px;font-size:18px;color:#212529;">Hola, {nombre}:</h2>
      <p style="margin:0 0 26px;font-size:15px;color:#495057;line-height:1.6;">
        Recibimos una solicitud para restablecer la contraseña de tu cuenta.
        Usa el siguiente botón para crear una nueva:
      </p>
      {_boton(enlace, "Restablecer contraseña")}
      <div class="email-note" style="background:#f0f9fc;border-left:4px solid #22d3ee;padding:15px;border-radius:8px;">
        <p style="margin:0;font-size:13px;color:#6c757d;line-height:1.5;">
          El enlace vence en {settings.RESET_TOKEN_MINUTES} minutos y solo puede usarse una vez.
          Si no solicitaste el cambio, ignora este correo.
        </p>
      </div>"""
    texto = (
        f"Hola {nombre}:\n\nRestablece tu contraseña en el siguiente enlace "
        f"(vence en {settings.RESET_TOKEN_MINUTES} minutos):\n{enlace}\n\n"
        "Si no solicitaste el cambio, ignora este mensaje."
    )
    return enviar_email(
        destinatario, "Restablece tu contraseña - GLOBDE", _plantilla_base("Seguridad de la cuenta", cuerpo),
        texto, "password_reset", id_usuario,
    )


def enviar_confirmacion_cita(
    destinatario: str, nombre: str, cita: dict, id_usuario: int | None = None
) -> bool:
    cuerpo = f"""
      <h2 style="margin:0 0 18px;font-size:18px;color:#212529;">Hola, {nombre}:</h2>
      <p style="margin:0 0 22px;font-size:15px;color:#495057;line-height:1.6;">Tu cita quedó registrada correctamente.</p>
      <table role="presentation" width="100%" style="border-collapse:collapse;font-size:14px;color:#495057;">
        <tr><td style="padding:8px 0;color:#6c757d;">Código</td><td style="padding:8px 0;text-align:right;font-weight:600;">{cita.get('codigo_reserva','-')}</td></tr>
        <tr><td style="padding:8px 0;color:#6c757d;">Servicio</td><td style="padding:8px 0;text-align:right;">{cita.get('servicio_nombre','-')}</td></tr>
        <tr><td style="padding:8px 0;color:#6c757d;">Barbero</td><td style="padding:8px 0;text-align:right;">{cita.get('barbero_nombre','-')}</td></tr>
        <tr><td style="padding:8px 0;color:#6c757d;">Fecha</td><td style="padding:8px 0;text-align:right;">{cita.get('fecha','-')}</td></tr>
        <tr><td style="padding:8px 0;color:#6c757d;">Hora</td><td style="padding:8px 0;text-align:right;">{cita.get('hora_inicio','-')} - {cita.get('hora_fin','-')}</td></tr>
      </table>"""
    texto = (
        f"Hola {nombre}: tu cita {cita.get('codigo_reserva','')} quedó registrada para el "
        f"{cita.get('fecha','')} a las {cita.get('hora_inicio','')}."
    )
    return enviar_email(
        destinatario, "Confirmación de tu cita - GLOBDE",
        _plantilla_base("Confirmación de cita", cuerpo), texto, "confirmacion_cita", id_usuario,
    )


def enviar_cancelacion_cita(
    destinatario: str, nombre: str, cita: dict, motivo: str | None = None,
    id_usuario: int | None = None,
) -> bool:
    detalle_motivo = (
        f'<p style="margin:0 0 10px;font-size:14px;color:#6c757d;">Motivo: {motivo}</p>'
        if motivo else ""
    )
    cuerpo = f"""
      <h2 style="margin:0 0 18px;font-size:18px;color:#212529;">Hola, {nombre}:</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#495057;line-height:1.6;">
        Tu cita <strong>{cita.get('codigo_reserva','')}</strong> del {cita.get('fecha','')}
        a las {cita.get('hora_inicio','')} fue cancelada.
      </p>
      {detalle_motivo}
      <p style="margin:16px 0 0;font-size:14px;color:#495057;">Puedes agendar una nueva cuando quieras.</p>"""
    texto = f"Hola {nombre}: tu cita {cita.get('codigo_reserva','')} fue cancelada."
    return enviar_email(
        destinatario, "Cita cancelada - GLOBDE",
        _plantilla_base("Cancelación de cita", cuerpo), texto, "cancelacion_cita", id_usuario,
    )


def enviar_recordatorio_cita(
    destinatario: str, nombre: str, cita: dict, id_usuario: int | None = None
) -> bool:
    cuerpo = f"""
      <h2 style="margin:0 0 18px;font-size:18px;color:#212529;">Hola, {nombre}:</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#495057;line-height:1.6;">
        Te recordamos tu cita <strong>{cita.get('codigo_reserva','')}</strong> para el
        {cita.get('fecha','')} a las {cita.get('hora_inicio','')} con {cita.get('barbero_nombre','tu barbero')}.
      </p>"""
    texto = f"Recordatorio: cita {cita.get('codigo_reserva','')} el {cita.get('fecha','')} a las {cita.get('hora_inicio','')}."
    return enviar_email(
        destinatario, "Recordatorio de tu cita - GLOBDE",
        _plantilla_base("Recordatorio", cuerpo), texto, "recordatorio_cita", id_usuario,
    )


def enviar_notificacion_generica(
    destinatario: str, nombre: str, titulo: str, mensaje: str, id_usuario: int | None = None
) -> bool:
    cuerpo = f"""
      <h2 style="margin:0 0 18px;font-size:18px;color:#212529;">Hola, {nombre}:</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#495057;line-height:1.6;">{mensaje}</p>"""
    return enviar_email(
        destinatario, titulo, _plantilla_base("Notificación", cuerpo), mensaje,
        "notificacion_sistema", id_usuario,
    )


__all__ = [
    "enviar_email",
    "enviar_recuperacion_password",
    "enviar_confirmacion_cita",
    "enviar_cancelacion_cita",
    "enviar_recordatorio_cita",
    "enviar_notificacion_generica",
]

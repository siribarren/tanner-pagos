import logging
from datetime import date

from django.core.mail import send_mail

logger = logging.getLogger(__name__)

MESES_ES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]


def _formato_fecha(fecha: date) -> str:
    return f"{fecha.day} de {MESES_ES[fecha.month - 1]} de {fecha.year}"


def _formato_monto(monto: int) -> str:
    return f"${monto:,.0f}".replace(",", ".")


def enviar_compromiso_creado(destinatario: str, fecha_compromiso: date, monto: int) -> None:
    if not destinatario:
        logger.warning("No se envio correo de compromiso: el credito no tiene correo_deudor.")
        return

    asunto = "Compromiso de pago registrado"
    cuerpo = (
        f"Hola,\n\n"
        f"Se acaba de crear un compromiso de pago por {_formato_monto(monto)} "
        f"con fecha {_formato_fecha(fecha_compromiso)}.\n\n"
        f"Este es un mensaje automatico, no responder."
    )
    try:
        send_mail(asunto, cuerpo, None, [destinatario], fail_silently=False)
    except Exception as e:
        logger.warning(f"No se pudo enviar el correo de compromiso a {destinatario}: {e}")

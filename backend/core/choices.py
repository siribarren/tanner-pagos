from django.db import models

class EstadoCRM(models.TextChoices):
    COMPROMETIDO = "comprometido", "Comprometido"
    SIN_COMPROMISO = "sin_compromiso", "Sin compromiso"
    PAGADO = "pagado", "Pagado"

class TipoPago(models.TextChoices):
    TOTAL = "total", "Total"
    PARCIAL = "parcial", "Parcial"

class Situacion(models.TextChoices):
    PENDIENTE = "pendiente", "Pendiente",
    ENVIADO = "enviado", "Enviado al mandante"
    VALIDADO = "validado", "Validado"

class CanalContacto(models.TextChoices):
    TELEFONO = "telefono", "Teléfono"
    WHATSAPP = "whatsapp", "WhatsApp"
    PRESENCIAL = "presencial", "Presencial"

# Valor del campo "Tipo de pago" del formulario Flokzu, no confundir con TipoPago (total/parcial del compromiso).
class TipoPagoFlokzu(models.TextChoices):
    PAGO_TOTAL = "pago_total", "Pago total"
    PUT_CUOTAS = "put_cuotas", "PUT en cuotas"

class PagoEstado(models.TextChoices):
    PENDIENTE = "pendiente", "Pendiente"
    APROBADO = "aprobado", "Aprobado"
    RECHAZADO = "rechazado", "Rechazado"

class CuotaEstado(models.TextChoices):
    VENCIDA = "vencida", "Vencida",
    VIGENTE = "vigente", "Vigente"

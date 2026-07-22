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
    VALIDADO = "validado", "Validado"

class CuotaEstado(models.TextChoices):
    VENCIDA = "vencida", "Vencida",
    VIGENTE = "vigente", "Vigente"

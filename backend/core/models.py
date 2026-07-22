from django.db import models
from .choices import EstadoCRM, TipoPago, Situacion
# Create your models here.

class CRMFila(models.Model):
    id = models.AutoField(primary_key=True)
    credito_id = models.IntegerField()
    fecha_contacto = models.DateField(null=True)
    fecha_compromiso = models.DateField(null=True)
    fecha_pago = models.DateField(null=True)
    estado = models.CharField(max_length=20, choices=EstadoCRM.choices, default=EstadoCRM.SIN_COMPROMISO)
    pago = models.CharField(max_length=20, choices=TipoPago, null=True)
    situacion = models.CharField(max_length=20, choices=Situacion, null=True)
    cuotas = models.IntegerField()
    monto = models.IntegerField()

    class Meta:
        db_table = 'crm_fila'

#CREDITO
class Credito(models.Model):
    id = models.AutoField(primary_key=True)
    rut_deudor = models.CharField()

    class Meta:
        db_table = 'credito'

# CUOTA -> HEREDA CREDITO_ID
class Cuota(models.Model):
    id = models.AutoField(primary_key=True)
    credito_id = models.ForeignKey(Credito, on_delete=models.CASCADE, db_column='credito_id', related_name='cuotas')
    fecha = models.DateField()
    monto = models.IntegerField()

    class Meta:
        db_table = 'cuota'

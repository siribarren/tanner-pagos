from django.db import models
from .choices import EstadoCRM, TipoPago, Situacion, CuotaEstado
# Create your models here.

#CREDITO
class Credito(models.Model):
    id = models.AutoField(primary_key=True)
    rut_deudor = models.CharField(max_length=20)
    nombre_deudor = models.CharField(max_length=150, default='')
    correo_deudor = models.CharField(max_length=254, default='')

    def __str__(self):
        return f"Deudor: {self.rut_deudor} / Nombre: {self.nombre_deudor}"

    class Meta:
        db_table = 'credito'

class CRMFila(models.Model):
    id = models.AutoField(primary_key=True)
    credito_id = models.ForeignKey(Credito, on_delete=models.CASCADE, db_column='credito_id', related_name='crm_fila')
    fecha_contacto = models.DateField(null=True)
    fecha_compromiso = models.DateField(null=True)
    fecha_pago = models.DateField(null=True)
    estado = models.CharField(max_length=20, choices=EstadoCRM.choices, null=True)
    pago = models.CharField(max_length=20, choices=TipoPago, null=True)
    situacion = models.CharField(max_length=20, choices=Situacion, null=True)

    def __str__(self):
        return f"Credito: {self.credito_id}, Fecha. Cont: {self.fecha_contacto}, Estado: {self.estado}"

    class Meta:
        db_table = 'crm_fila'

# CUOTA -> HEREDA CREDITO_ID
class Cuota(models.Model):
    id = models.AutoField(primary_key=True)
    credito_id = models.ForeignKey(Credito, on_delete=models.CASCADE, db_column='credito_id', related_name='cuotas')
    estado = models.CharField(max_length=20, choices=CuotaEstado.choices)
    fecha = models.DateField()
    monto = models.IntegerField()

    def __str__(self):
        return f"Cuota: {self.fecha} por {self.monto}"

    class Meta:
        db_table = 'cuota'

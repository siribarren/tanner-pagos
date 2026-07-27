from django.db import models
from .choices import CanalContacto, EstadoCRM, TipoPago, Situacion, CuotaEstado, PagoEstado, TipoPagoFlokzu
from .managers import CRMFilaManager, CuotaManager, PagoManager, RequestCacheManager
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
        db_table = 'db_credito'

class CRMFila(models.Model):
    id = models.AutoField(primary_key=True)
    credito_id = models.ForeignKey(Credito, on_delete=models.CASCADE, db_column='credito_id', related_name='crm_fila')
    fecha_contacto = models.DateField(null=True)
    fecha_compromiso = models.DateField(null=True)
    fecha_pago = models.DateField(null=True)
    canal_contacto = models.CharField(
        max_length=20,
        choices=CanalContacto.choices,
        default=CanalContacto.TELEFONO,
    )
    estado = models.CharField(max_length=20, choices=EstadoCRM.choices, null=True)
    pago = models.CharField(max_length=20, choices=TipoPago, null=True)
    situacion = models.CharField(max_length=20, choices=Situacion, null=True)
    monto = models.IntegerField(null=True)

    objects = CRMFilaManager()

    def __str__(self):
        return f"Credito: {self.credito_id}, Fecha. Cont: {self.fecha_contacto}, Estado: {self.estado}"

    class Meta:
        db_table = 'db_crm_fila'
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    canal_contacto__in=[choice.value for choice in CanalContacto]
                ),
                name='crm_fila_canal_contacto_valid',
            ),
        ]

# CUOTA -> HEREDA CREDITO_ID
class Cuota(models.Model):
    id = models.AutoField(primary_key=True)
    credito_id = models.ForeignKey(Credito, on_delete=models.CASCADE, db_column='credito_id', related_name='cuotas')
    estado = models.CharField(max_length=20, choices=CuotaEstado.choices)
    fecha = models.DateField()
    monto = models.IntegerField()
    crm_fila_id = models.ForeignKey(
        CRMFila, null=True, blank=True, on_delete=models.SET_NULL,
        db_column='crm_fila_id', related_name='cuotas',
    )

    objects = CuotaManager()

    def __str__(self):
        return f"Cuota: {self.fecha} por {self.monto}"

    class Meta:
        db_table = 'db_cuota'


#REQUESTCACHE
class RequestCache(models.Model):
    id = models.AutoField(primary_key=True)
    model = models.CharField(max_length=50)
    fecha = models.DateField()
    request_text = models.CharField(default="")
    request_hash = models.CharField(max_length=64)
    response_text = models.CharField()
    tokens_input = models.IntegerField(default=0)
    tokens_thoughts = models.IntegerField(default=0)
    tokens_output = models.IntegerField(default=0)
    tokens_total = models.IntegerField(default=0)

    objects = RequestCacheManager()

    class Meta:
        db_table = 'db_request_cache'
        constraints = [
            models.UniqueConstraint(fields=['model', 'request_hash'], name='uq_request_cache_model_hash'),
        ]

#PAGO / SE OBTENDRA DESDE EL LLM / VARIOS CAMPOS DEBERAN SER NULLABLES
# Cabecera: una fila por carga de comprobantes (= un PDF, con N imagenes de transferencia dentro).
class Pago(models.Model):
    id = models.AutoField(primary_key=True)
    crm_fila_id = models.ForeignKey(CRMFila, on_delete=models.CASCADE, db_column='crm_fila_id', related_name='pagos')
    pdf_path = models.CharField(max_length=255)
    monto_total = models.IntegerField()
    fecha_pago = models.DateField(null=True)
    cuenta_destino = models.CharField(max_length=50, null=True)
    cuentas_distintas = models.BooleanField(default=False)
    cantidad_transferencias = models.IntegerField(default=0)
    # Un pago se guarda cuando el ejecutivo confirma el envio, y solo cuenta como verdad contable
    # cuando el MANDANTE lo aprueba en Flokzu.
    estado = models.CharField(max_length=20, choices=PagoEstado.choices, default=PagoEstado.PENDIENTE)
    # Los tres campos del formulario Flokzu que el ejecutivo puede corregir y no se derivan de otra columna.
    tipo_pago = models.CharField(max_length=20, choices=TipoPagoFlokzu.choices, null=True)
    monto_ceco = models.IntegerField(default=0)
    monto_saf = models.IntegerField(default=0)
    creado_en = models.DateTimeField(auto_now_add=True)

    objects = PagoManager()

    def __str__(self):
        return f"Pago {self.id}: {self.monto_total} en {self.cantidad_transferencias} transferencia(s)"

    class Meta:
        db_table = 'db_pago'


# Detalle: una fila por transferencia identificada dentro del PDF.
class PagoTransferencia(models.Model):
    id = models.AutoField(primary_key=True)
    pago_id = models.ForeignKey(Pago, on_delete=models.CASCADE, db_column='pago_id', related_name='transferencias')
    orden = models.IntegerField()
    monto = models.IntegerField()
    fecha = models.DateField(null=True)
    cuenta_destino = models.CharField(max_length=50, null=True)
    banco = models.CharField(max_length=100, null=True)
    n_operacion = models.CharField(max_length=50, null=True)

    def __str__(self):
        return f"Transferencia {self.orden} del pago {self.pago_id_id}: {self.monto}"

    class Meta:
        db_table = 'db_pago_transferencia'
        ordering = ['orden']
        constraints = [
            models.UniqueConstraint(fields=['pago_id', 'orden'], name='uq_pago_transferencia_orden'),
        ]


# Imputacion: cuanto del pago se aplica a cada cuota comprometida.
class PagoCuota(models.Model):
    id = models.AutoField(primary_key=True)
    pago_id = models.ForeignKey(Pago, on_delete=models.CASCADE, db_column='pago_id', related_name='imputaciones')
    cuota_id = models.ForeignKey(Cuota, on_delete=models.CASCADE, db_column='cuota_id', related_name='imputaciones')
    monto_imputado = models.IntegerField()

    def __str__(self):
        return f"Pago {self.pago_id_id} imputa {self.monto_imputado} a la cuota {self.cuota_id_id}"

    class Meta:
        db_table = 'db_pago_cuota'
        constraints = [
            models.UniqueConstraint(fields=['pago_id', 'cuota_id'], name='uq_pago_cuota'),
        ]

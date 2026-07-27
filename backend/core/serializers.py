from datetime import date
from pathlib import Path

from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from .choices import CanalContacto, EstadoCRM, Situacion, TipoPago, TipoPagoFlokzu
from .models import CRMFila, Credito, Cuota, Pago, PagoCuota, PagoTransferencia
from .pdf_service import EXTENSIONES_COMPROBANTE, PdfService


class CRMFilaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMFila
        fields = (
            "id",
            "fecha_contacto",
            "fecha_compromiso",
            "fecha_pago",
            "canal_contacto",
            "estado",
            "pago",
            "situacion",
            "monto",
        )


class ContactoCreateSerializer(serializers.Serializer):
    fecha_contacto = serializers.DateField()

    def validate_fecha_contacto(self, value):
        if value < date.today():
            raise serializers.ValidationError("La fecha de contacto no puede ser anterior a hoy.")
        return value


class CompromisoCreateSerializer(serializers.Serializer):
    fecha_compromiso = serializers.DateField()
    canal_contacto = serializers.ChoiceField(choices=CanalContacto.choices)
    monto = serializers.IntegerField(min_value=1)
    cuota_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)

    def validate_fecha_compromiso(self, value):
        if value < date.today():
            raise serializers.ValidationError("La fecha de compromiso no puede ser anterior a hoy.")
        return value

    def validate(self, attrs):
        credito = self.context["credito"]
        # Se puede comprometer cualquier cuota, vencida o vigente, pero siempre partiendo de la mas
        # antigua: la seleccion tiene que ser el tramo inicial de las cuotas del credito, sin saltos.
        cuotas = list(Cuota.objects.filter(credito_id=credito).order_by("fecha", "id").values_list("id", flat=True))
        seleccionadas = set(attrs["cuota_ids"])
        if seleccionadas != set(cuotas[:len(seleccionadas)]):
            raise serializers.ValidationError(
                {"cuota_ids": "Las cuotas deben pertenecer al crédito y seleccionarse desde la más antigua, sin saltarse ninguna."}
            )

        ultima = CRMFila.objects.para_credito(credito).first()
        if not ultima or not ultima.fecha_contacto:
            raise serializers.ValidationError(
                {"fecha_contacto": "Debe registrar la fecha de contacto antes de crear el compromiso."}
            )

        attrs["_todas_ids"] = set(cuotas)
        return attrs


class CuotaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cuota
        fields = (
            "id",
            "estado",
            "fecha",
            "monto",
            "crm_fila_id",
        )


class CreditoResumenSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    rut = serializers.CharField()
    cliente = serializers.CharField()


class CarteraListSerializer(serializers.ModelSerializer):
    rut = serializers.CharField(source="rut_deudor")
    cliente = serializers.CharField(source="nombre_deudor")
    fecha_contacto = serializers.SerializerMethodField()
    fecha_compromiso = serializers.SerializerMethodField()
    fecha_pago = serializers.SerializerMethodField()
    canal_contacto = serializers.SerializerMethodField()
    estado = serializers.SerializerMethodField()
    pago = serializers.SerializerMethodField()
    situacion = serializers.SerializerMethodField()
    cuotas = serializers.IntegerField(source="cuotas_vencidas")
    monto = serializers.IntegerField(source="monto_vencido")

    class Meta:
        model = Credito
        fields = (
            "id",
            "rut",
            "cliente",
            "fecha_contacto",
            "fecha_compromiso",
            "fecha_pago",
            "canal_contacto",
            "estado",
            "pago",
            "situacion",
            "cuotas",
            "monto",
        )

    def _crm(self, obj):
        filas = getattr(obj, "_crm_filas", ())
        return filas[0] if filas else None

    def _value(self, obj, field):
        crm = self._crm(obj)
        return getattr(crm, field, None) if crm else None

    @extend_schema_field(serializers.DateField(allow_null=True))
    def get_fecha_contacto(self, obj):
        return self._value(obj, "fecha_contacto")

    @extend_schema_field(serializers.DateField(allow_null=True))
    def get_fecha_compromiso(self, obj):
        return self._value(obj, "fecha_compromiso")

    @extend_schema_field(serializers.DateField(allow_null=True))
    def get_fecha_pago(self, obj):
        return self._value(obj, "fecha_pago")

    @extend_schema_field(serializers.ChoiceField(choices=CanalContacto.choices, allow_null=True))
    def get_canal_contacto(self, obj):
        return self._value(obj, "canal_contacto")

    @extend_schema_field(serializers.ChoiceField(choices=EstadoCRM.choices, allow_null=True))
    def get_estado(self, obj):
        return self._value(obj, "estado")

    @extend_schema_field(serializers.ChoiceField(choices=TipoPago.choices, allow_null=True))
    def get_pago(self, obj):
        return self._value(obj, "pago")

    @extend_schema_field(serializers.ChoiceField(choices=Situacion.choices, allow_null=True))
    def get_situacion(self, obj):
        return self._value(obj, "situacion")


class CarteraDetailSerializer(serializers.ModelSerializer):
    credito = serializers.SerializerMethodField()
    crm = serializers.SerializerMethodField()
    cuotas = serializers.SerializerMethodField()

    class Meta:
        model = Credito
        fields = ("credito", "crm", "cuotas")

    @extend_schema_field(CreditoResumenSerializer)
    def get_credito(self, obj):
        return {
            "id": obj.id,
            "rut": obj.rut_deudor,
            "cliente": obj.nombre_deudor,
        }

    @extend_schema_field(CRMFilaSerializer(allow_null=True))
    def get_crm(self, obj):
        filas = getattr(obj, "_crm_filas", ())
        crm = filas[0] if filas else None
        return CRMFilaSerializer(crm).data if crm else None

    @extend_schema_field(CuotaSerializer(many=True))
    def get_cuotas(self, obj):
        cuotas = getattr(obj, "_cuotas", ())
        return CuotaSerializer(cuotas, many=True).data


class PagoCargaSerializer(serializers.Serializer):
    # El limite de 15 es el maximo de paginas que procesa DocumentAI en modo sincrono.
    imagenes = serializers.ListField(child=serializers.FileField(), allow_empty=False, max_length=15)

    def validate_imagenes(self, value):
        for archivo in value:
            if Path(archivo.name).suffix.lower() not in EXTENSIONES_COMPROBANTE:
                raise serializers.ValidationError(f"{archivo.name}: solo se aceptan archivos PNG, JPG, JPEG o PDF.")
        return value


class PagoTransferenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PagoTransferencia
        fields = ("id", "orden", "monto", "fecha", "cuenta_destino", "banco", "n_operacion")


class PagoCuotaSerializer(serializers.ModelSerializer):
    cuota_fecha = serializers.DateField(source="cuota_id.fecha", read_only=True)
    cuota_monto = serializers.IntegerField(source="cuota_id.monto", read_only=True)

    class Meta:
        model = PagoCuota
        fields = ("cuota_id", "cuota_fecha", "cuota_monto", "monto_imputado")


class PagoSerializer(serializers.ModelSerializer):
    transferencias = PagoTransferenciaSerializer(many=True, read_only=True)
    imputaciones = PagoCuotaSerializer(many=True, read_only=True)
    monto_comprometido = serializers.IntegerField(source="crm_fila_id.monto", read_only=True)

    class Meta:
        model = Pago
        fields = (
            "id",
            "pdf_path",
            "monto_total",
            "monto_comprometido",
            "fecha_pago",
            "cuenta_destino",
            "cuentas_distintas",
            "cantidad_transferencias",
            "estado",
            "tipo_pago",
            "monto_ceco",
            "monto_saf",
            "creado_en",
            "transferencias",
            "imputaciones",
        )


class PagoEnviadoSerializer(serializers.ModelSerializer):
    """Fila de "Mis pagos enviados": el pago con los datos del credito al que pertenece."""

    credito_id = serializers.IntegerField(source="crm_fila_id.credito_id_id")
    rut = serializers.CharField(source="crm_fila_id.credito_id.rut_deudor")
    cliente = serializers.CharField(source="crm_fila_id.credito_id.nombre_deudor")

    class Meta:
        model = Pago
        fields = ("id", "credito_id", "rut", "cliente", "fecha_pago", "monto_total", "estado")


# ── Analisis de comprobantes: la propuesta que se muestra en cuadratura, antes de persistir nada ──

class TransferenciaAnalisisSerializer(serializers.Serializer):
    orden = serializers.IntegerField()
    monto = serializers.IntegerField()
    fecha = serializers.DateField(allow_null=True, required=False, default=None)
    cuenta_destino = serializers.CharField(allow_null=True, required=False, default=None)
    banco = serializers.CharField(allow_null=True, required=False, default=None)
    n_operacion = serializers.CharField(allow_null=True, required=False, default=None)


class ImputacionPropuestaSerializer(serializers.Serializer):
    cuota_id = serializers.IntegerField()
    cuota_fecha = serializers.DateField()
    cuota_monto = serializers.IntegerField()
    monto_imputado = serializers.IntegerField()
    saldo = serializers.IntegerField()


class CuadraturaCheckSerializer(serializers.Serializer):
    n = serializers.IntegerField()
    titulo = serializers.CharField()
    resultado = serializers.CharField()
    tono = serializers.ChoiceField(choices=["ok", "observado"])
    # Pares [etiqueta, valor] ya formateados para mostrar bajo el resultado.
    campos = serializers.ListField(child=serializers.ListField(child=serializers.CharField()))


class CuadraturaSerializer(serializers.Serializer):
    estado = serializers.CharField()
    checks = CuadraturaCheckSerializer(many=True)
    saldo_a_favor = serializers.IntegerField()
    resumen = serializers.CharField()
    control = serializers.ListField(child=serializers.ListField(child=serializers.CharField()))


class SolicitudFlokzuSerializer(serializers.Serializer):
    tipo_solicitud = serializers.CharField()
    empresa = serializers.CharField()
    empresa_cobranza = serializers.CharField()
    correo_cobranza = serializers.CharField()
    correos_adicionales = serializers.CharField()
    id_credito = serializers.IntegerField()
    forma_pago = serializers.CharField()
    rut_transfiere = serializers.CharField()
    monto_pago = serializers.IntegerField()
    cuenta = serializers.CharField(allow_null=True)
    fecha_pago = serializers.DateField(allow_null=True)
    cantidad_movimientos = serializers.IntegerField()
    tipo_pago = serializers.ChoiceField(choices=TipoPagoFlokzu.choices)
    considera_otros_id = serializers.BooleanField()
    adjunto = serializers.CharField()
    monto_ceco = serializers.IntegerField()
    monto_saf = serializers.IntegerField()


class PagoAnalisisSerializer(serializers.Serializer):
    pdf_path = serializers.CharField()
    monto_total = serializers.IntegerField()
    monto_comprometido = serializers.IntegerField()
    fecha_pago = serializers.DateField(allow_null=True)
    cuenta_destino = serializers.CharField(allow_null=True)
    cuentas_distintas = serializers.BooleanField()
    cantidad_transferencias = serializers.IntegerField()
    transferencias = TransferenciaAnalisisSerializer(many=True)
    imputaciones = ImputacionPropuestaSerializer(many=True)
    cuadratura = CuadraturaSerializer()
    flokzu = SolicitudFlokzuSerializer()
    opciones_cuenta = serializers.ListField(child=serializers.CharField())


class PagoConfirmarSerializer(serializers.Serializer):
    """Lo que el ejecutivo confirmo en el modal de Flokzu. Es lo unico que se persiste."""

    pdf_path = serializers.CharField()
    fecha_pago = serializers.DateField()
    cuenta_destino = serializers.CharField(allow_null=True, required=False, allow_blank=True)
    cuentas_distintas = serializers.BooleanField(default=False)
    transferencias = TransferenciaAnalisisSerializer(many=True, allow_empty=False)
    tipo_pago = serializers.ChoiceField(choices=TipoPagoFlokzu.choices)
    monto_ceco = serializers.IntegerField(min_value=0, default=0)
    monto_saf = serializers.IntegerField(min_value=0, default=0)

    def validate_pdf_path(self, value):
        try:
            PdfService.ruta_absoluta(value, self.context["credito"].id)
        except ValueError as e:
            raise serializers.ValidationError(str(e))
        return value

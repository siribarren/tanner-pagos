from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from .choices import CanalContacto, EstadoCRM, Situacion, TipoPago
from .models import CRMFila, Credito, Cuota


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
        )


class CuotaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cuota
        fields = (
            "id",
            "estado",
            "fecha",
            "monto",
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

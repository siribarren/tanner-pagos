from django.contrib.auth.models import User
from django.db.models import Count, Prefetch, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.http import FileResponse
from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, OpenApiParameter


# ponytail: emite JWT sin validar credenciales — prototipo, no auth real.
@api_view(["POST"])
@permission_classes([AllowAny])
def obtener_token(request):
    user, _ = User.objects.get_or_create(username="prototipo")
    refresh = RefreshToken.for_user(user)
    return Response({"access": str(refresh.access_token), "refresh": str(refresh)})

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser

from .choices import CuotaEstado, EstadoCRM, Situacion
from .email_service import EmailService
from .llm.estructuras import PagoResponse, TransferenciaResponse
from .models import CRMFila, Credito, Cuota, Pago
from .pago_service import PagoService
from .pdf_service import PdfService
from .serializers import (
    CarteraDetailSerializer,
    CarteraListSerializer,
    CompromisoCreateSerializer,
    ContactoCreateSerializer,
    CRMFilaSerializer,
    PagoAnalisisSerializer,
    PagoCargaSerializer,
    PagoConfirmarSerializer,
    PagoEnviadoSerializer,
    PagoSerializer,
)


@extend_schema(tags=["Pagos"])
class PagoViewSet(viewsets.ReadOnlyModelViewSet):
    """Los pagos ya enviados al mandante, del mas reciente al mas antiguo."""

    serializer_class = PagoEnviadoSerializer

    def get_queryset(self):
        # select_related: la fila necesita el credito de cada pago, y sin esto es una query por fila.
        return Pago.objects.select_related("crm_fila_id__credito_id").order_by("-creado_en")


@extend_schema(tags=["Cartera"])
class CarteraViewSet(viewsets.ReadOnlyModelViewSet):
    lookup_field = "pk"

    def get_queryset(self):
        crm_filas = CRMFila.objects.order_by("-id")
        cuotas = Cuota.objects.order_by("fecha", "id")

        queryset = Credito.objects.prefetch_related(
            Prefetch("crm_fila", queryset=crm_filas, to_attr="_crm_filas"),
            Prefetch("cuotas", queryset=cuotas, to_attr="_cuotas"),
        ).annotate(
            cuotas_vencidas=Count(
                "cuotas",
                filter=Q(cuotas__estado=CuotaEstado.VENCIDA),
                distinct=True,
            ),
            monto_vencido=Coalesce(
                Sum(
                    "cuotas__monto",
                    filter=Q(cuotas__estado=CuotaEstado.VENCIDA),
                ),
                Value(0),
            ),
        )

        return queryset

    def get_serializer_class(self):
        if self.action == "retrieve":
            return CarteraDetailSerializer
        return CarteraListSerializer

    @extend_schema(tags=["Cartera"], request=ContactoCreateSerializer, responses=CRMFilaSerializer)
    @action(detail=True, methods=["post"], url_path="contacto")
    def contacto(self, request, pk=None):
        credito = self.get_object()
        serializer = ContactoCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        fila = CRMFila.objects.guardar_fecha_contacto(credito, serializer.validated_data["fecha_contacto"])
        return Response(CRMFilaSerializer(fila).data)

    @extend_schema(tags=["Cartera"], request=CompromisoCreateSerializer, responses=CRMFilaSerializer)
    @action(detail=True, methods=["post"], url_path="compromiso")
    def compromiso(self, request, pk=None):
        credito = self.get_object()
        serializer = CompromisoCreateSerializer(data=request.data, context={"credito": credito})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        fila = CRMFila.objects.crear_compromiso(
            credito,
            fecha_compromiso=data["fecha_compromiso"],
            canal_contacto=data["canal_contacto"],
            monto=data["monto"],
            cuota_ids=data["cuota_ids"],
            todas_ids=data["_todas_ids"],
        )
        EmailService().enviar_compromiso_creado(credito.correo_deudor, data["fecha_compromiso"], data["monto"])
        return Response(CRMFilaSerializer(fila).data)

    @extend_schema(tags=["Cartera"], request=PagoCargaSerializer, responses=PagoAnalisisSerializer)
    @action(detail=True, methods=["post"], url_path="pago/analizar", parser_classes=[MultiPartParser])
    def pago_analizar(self, request, pk=None):
        """Procesa los comprobantes y devuelve la cuadratura propuesta. No escribe nada en la base."""
        credito = self.get_object()
        serializer = PagoCargaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        fila = self._compromiso_vigente(credito)

        try:
            analisis = PagoService().analizar_comprobantes(fila, credito, serializer.validated_data["imagenes"])
        except ValueError as e:
            raise ValidationError({"imagenes": str(e)})

        return Response(PagoAnalisisSerializer(analisis).data)

    @extend_schema(tags=["Cartera"], request=PagoConfirmarSerializer, responses=PagoSerializer)
    @action(detail=True, methods=["post"], url_path="pago")
    def pago(self, request, pk=None):
        """Persiste el pago que el ejecutivo reviso y confirmo, a la espera de que el mandante lo apruebe."""
        credito = self.get_object()
        serializer = PagoConfirmarSerializer(data=request.data, context={"credito": credito})
        serializer.is_valid(raise_exception=True)
        datos = serializer.validated_data
        fila = self._compromiso_vigente(credito)

        transferencias = [TransferenciaResponse(**t) for t in datos["transferencias"]]
        try:
            pago = Pago.objects.registrar(
                fila,
                datos["pdf_path"],
                PagoResponse(
                    pago_total=sum(transferencia.monto for transferencia in transferencias),
                    fecha_pago=datos["fecha_pago"],
                    cuenta_destino=datos.get("cuenta_destino") or None,
                    cuentas_distintas=datos["cuentas_distintas"],
                    transferencias=transferencias,
                ),
                tipo_pago=datos["tipo_pago"],
                monto_ceco=datos["monto_ceco"],
                monto_saf=datos["monto_saf"],
            )
        except ValueError as e:
            # Puede ocurrir si otra confirmacion envio el mismo compromiso
            # despues de la validacion temprana y antes de tomar el lock.
            raise ValidationError({"credito": str(e)}) from e
        return Response(PagoSerializer(pago).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        tags=["Cartera"],
        parameters=[OpenApiParameter("archivo", str, description="pdf_path que devolvio el analisis.")],
        responses={200: OpenApiTypes.BINARY},
    )
    @action(detail=True, methods=["get"], url_path="comprobante")
    def comprobante(self, request, pk=None):
        """Entrega el PDF con los comprobantes, para revisarlo antes de enviar la solicitud a Flokzu."""
        credito = self.get_object()
        try:
            ruta = PdfService.ruta_absoluta(request.query_params.get("archivo", ""), credito.id)
        except ValueError as e:
            raise ValidationError({"archivo": str(e)})

        return FileResponse(ruta.open("rb"), content_type="application/pdf", filename=ruta.name)

    @staticmethod
    def _compromiso_vigente(credito) -> CRMFila:
        fila = CRMFila.objects.para_credito(credito).first()
        if fila is None or fila.estado != EstadoCRM.COMPROMETIDO:
            raise ValidationError({"credito": "El credito no tiene un compromiso de pago vigente."})
        # Sin esto se puede cargar un segundo comprobante sobre un pago ya enviado y volver a
        # imputarlo a las mismas cuotas.
        if fila.situacion == Situacion.ENVIADO:
            raise ValidationError({"credito": "El pago ya fue enviado y espera la aprobacion del mandante."})
        return fila

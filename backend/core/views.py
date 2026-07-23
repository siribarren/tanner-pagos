from django.db.models import Count, Prefetch, Q, Sum, Value
from django.db.models.functions import Coalesce
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from .choices import CuotaEstado
from .email_service import enviar_compromiso_creado
from .models import CRMFila, Credito, Cuota
from .serializers import (
    CarteraDetailSerializer,
    CarteraListSerializer,
    CompromisoCreateSerializer,
    ContactoCreateSerializer,
    CRMFilaSerializer,
)


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
            vencidas_ids=data["_vencidas_ids"],
        )
        enviar_compromiso_creado(credito.correo_deudor, data["fecha_compromiso"], data["monto"])
        return Response(CRMFilaSerializer(fila).data)

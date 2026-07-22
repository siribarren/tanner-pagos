from django.db.models import Count, Prefetch, Q, Sum, Value
from django.db.models.functions import Coalesce
from rest_framework import viewsets
from drf_spectacular.utils import extend_schema

from .choices import CuotaEstado
from .models import CRMFila, Credito, Cuota
from .serializers import CarteraDetailSerializer, CarteraListSerializer


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

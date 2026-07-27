from __future__ import annotations

from typing import TYPE_CHECKING, Iterable

from django.db import models
from django.db.models import Sum, Value
from django.db.models.functions import Coalesce

from core.choices import CuotaEstado, EstadoCRM

if TYPE_CHECKING:
    from core.models import CRMFila, Credito


class CuotaManager(models.Manager):
    def saldos_vencidos(self, credito: "Credito") -> dict[int, int]:
        """Saldo pendiente de cada cuota vencida del credito, descontando lo que ya cubrieron pagos previos."""
        cuotas = (
            self.filter(credito_id=credito, estado=CuotaEstado.VENCIDA)
            .annotate(imputado=Coalesce(Sum("imputaciones__monto_imputado"), Value(0)))
            .values_list("id", "monto", "imputado")
        )
        return {cuota_id: monto - imputado for cuota_id, monto, imputado in cuotas}

    def vincular_a_compromiso(self, cuota_ids: Iterable[int], crm_fila: "CRMFila") -> None:
        if crm_fila.estado != EstadoCRM.COMPROMETIDO:
            raise ValueError("Solo se pueden vincular cuotas a un CRMFila con estado COMPROMETIDO.")
        self.filter(id__in=cuota_ids).update(crm_fila_id=crm_fila)

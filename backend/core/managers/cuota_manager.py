from __future__ import annotations

from typing import TYPE_CHECKING, Iterable

from django.db import models

from core.choices import EstadoCRM

if TYPE_CHECKING:
    from core.models import CRMFila


class CuotaManager(models.Manager):
    def vincular_a_compromiso(self, cuota_ids: Iterable[int], crm_fila: "CRMFila") -> None:
        if crm_fila.estado != EstadoCRM.COMPROMETIDO:
            raise ValueError("Solo se pueden vincular cuotas a un CRMFila con estado COMPROMETIDO.")
        self.filter(id__in=cuota_ids).update(crm_fila_id=crm_fila)

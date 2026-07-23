from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING, Iterable

from django.db import models, transaction

from core.choices import EstadoCRM, Situacion, TipoPago

if TYPE_CHECKING:
    from core.models import CRMFila, Credito


class CRMFilaManager(models.Manager):
    def para_credito(self, credito: "Credito"):
        return self.filter(credito_id=credito).order_by("-id")

    def ultima_o_nueva(self, credito: "Credito") -> "CRMFila":
        fila = self.para_credito(credito).first()
        return fila if fila is not None else self.create(credito_id=credito)

    def guardar_fecha_contacto(self, credito: "Credito", fecha_contacto: date) -> "CRMFila":
        fila = self.ultima_o_nueva(credito)
        fila.fecha_contacto = fecha_contacto
        fila.save(update_fields=["fecha_contacto"])
        return fila

    def crear_compromiso(
        self,
        credito: "Credito",
        *,
        fecha_compromiso: date,
        canal_contacto: str,
        monto: int,
        cuota_ids: Iterable[int],
        vencidas_ids: set[int],
    ) -> "CRMFila":
        from core.models import Cuota

        with transaction.atomic():
            fila = self.ultima_o_nueva(credito)
            fila.fecha_compromiso = fecha_compromiso
            fila.canal_contacto = canal_contacto
            fila.monto = monto
            fila.pago = TipoPago.TOTAL if set(cuota_ids) == vencidas_ids else TipoPago.PARCIAL
            fila.situacion = Situacion.PENDIENTE
            fila.estado = EstadoCRM.COMPROMETIDO
            fila.save(update_fields=["fecha_compromiso", "canal_contacto", "monto", "pago", "situacion", "estado"])

            Cuota.objects.vincular_a_compromiso(cuota_ids, fila)

        return fila

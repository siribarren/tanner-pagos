from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from django.db import models, transaction
from django.db.models import Sum

if TYPE_CHECKING:
    from core.llm.estructuras import PagoResponse
    from core.models import CRMFila, Pago

logger = logging.getLogger(__name__)


class PagoManager(models.Manager):
    def registrar(self, crm_fila: "CRMFila", pdf_path: str, pago_response: "PagoResponse") -> "Pago":
        """Guarda la carga completa: cabecera + una fila por transferencia + imputacion a las cuotas."""
        from core.models import PagoTransferencia

        transferencias = pago_response.transferencias
        if not transferencias:
            raise ValueError("El documento no contiene transferencias que se puedan registrar.")

        monto_total = sum(transferencia.monto for transferencia in transferencias)
        if monto_total != pago_response.pago_total:
            logger.warning(
                f"El total informado por el LLM ({pago_response.pago_total}) no coincide con la suma "
                f"de las transferencias ({monto_total}); se guarda la suma del detalle."
            )

        with transaction.atomic():
            pago = self.create(
                crm_fila_id=crm_fila,
                pdf_path=pdf_path,
                monto_total=monto_total,
                fecha_pago=pago_response.fecha_pago,
                cuenta_destino=pago_response.cuenta_destino,
                cuentas_distintas=pago_response.cuentas_distintas,
                cantidad_transferencias=len(transferencias),
            )
            PagoTransferencia.objects.bulk_create([
                PagoTransferencia(
                    pago_id=pago,
                    orden=transferencia.orden,
                    monto=transferencia.monto,
                    fecha=transferencia.fecha,
                    cuenta_destino=transferencia.cuenta_destino,
                    banco=transferencia.banco,
                    n_operacion=transferencia.n_operacion,
                )
                for transferencia in transferencias
            ])
            self.imputar_a_cuotas(pago)

            crm_fila.fecha_pago = pago.fecha_pago
            crm_fila.save(update_fields=["fecha_pago"])

        return pago

    @staticmethod
    def imputar_a_cuotas(pago: "Pago") -> None:
        """Reparte el total del pago entre las cuotas del compromiso, de la mas antigua a la mas nueva."""
        from core.models import Cuota, PagoCuota

        cuotas = list(Cuota.objects.filter(crm_fila_id=pago.crm_fila_id).order_by("fecha", "id"))
        # Un compromiso se puede pagar en varias cargas: descontar lo que ya cubrieron los pagos previos.
        imputado_previo = dict(
            PagoCuota.objects.filter(cuota_id__in=cuotas)
            .values_list("cuota_id")
            .annotate(total=Sum("monto_imputado"))
        )

        restante = pago.monto_total
        imputaciones = []
        for cuota in cuotas:
            if restante <= 0:
                break
            saldo = cuota.monto - imputado_previo.get(cuota.id, 0)
            if saldo <= 0:
                continue
            monto = min(restante, saldo)
            imputaciones.append(PagoCuota(pago_id=pago, cuota_id=cuota, monto_imputado=monto))
            restante -= monto

        PagoCuota.objects.bulk_create(imputaciones)
        if restante > 0:
            logger.info(f"Pago {pago.id}: quedan {restante} sin imputar (excedente sobre las cuotas comprometidas).")

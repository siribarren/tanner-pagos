from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from django.db import models, transaction
from django.db.models import Sum

from core.choices import EstadoCRM, Situacion

if TYPE_CHECKING:
    from core.llm.estructuras import PagoResponse
    from core.models import CRMFila, Pago

logger = logging.getLogger(__name__)


class PagoManager(models.Manager):
    def registrar(
        self,
        crm_fila: "CRMFila",
        pdf_path: str,
        pago_response: "PagoResponse",
        *,
        tipo_pago: str | None = None,
        monto_ceco: int = 0,
        monto_saf: int = 0,
    ) -> "Pago":
        """Guarda la carga completa: cabecera + una fila por transferencia + imputacion a las cuotas.

        Se llama recien cuando el ejecutivo confirma el envio, no al subir los comprobantes.
        """
        from core.models import CRMFila, PagoTransferencia

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
            # La validacion temprana del ViewSet mejora el mensaje al usuario, pero no
            # protege contra dos confirmaciones que entren al mismo tiempo. Bloquear y
            # releer la fila dentro de la transaccion hace que solo una pueda registrar.
            crm_fila_bloqueada = CRMFila.objects.select_for_update().get(pk=crm_fila.pk)
            if crm_fila_bloqueada.estado != EstadoCRM.COMPROMETIDO:
                raise ValueError("El credito no tiene un compromiso de pago vigente.")
            if crm_fila_bloqueada.situacion == Situacion.ENVIADO:
                raise ValueError("El pago ya fue enviado y espera la aprobacion del mandante.")

            pago = self.create(
                crm_fila_id=crm_fila_bloqueada,
                pdf_path=pdf_path,
                monto_total=monto_total,
                fecha_pago=pago_response.fecha_pago,
                cuenta_destino=pago_response.cuenta_destino,
                cuentas_distintas=pago_response.cuentas_distintas,
                cantidad_transferencias=len(transferencias),
                tipo_pago=tipo_pago,
                monto_ceco=monto_ceco,
                monto_saf=monto_saf,
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

            # El compromiso queda esperando la respuesta del mandante en Flokzu.
            crm_fila_bloqueada.fecha_pago = pago.fecha_pago
            crm_fila_bloqueada.situacion = Situacion.ENVIADO
            crm_fila_bloqueada.save(update_fields=["fecha_pago", "situacion"])

        return pago

    @staticmethod
    def calcular_imputacion(crm_fila: "CRMFila", monto_total: int) -> tuple[list[dict], int]:
        """Reparte un monto entre las cuotas del compromiso, de la mas antigua a la mas nueva.

        No escribe nada: la pantalla de cuadratura lo usa para previsualizar antes de que el ejecutivo
        confirme. Devuelve una entrada por CADA cuota del compromiso (aunque no reciba nada, para que la
        tabla las muestre todas) y el excedente que no se pudo imputar.
        """
        from core.models import Cuota, PagoCuota

        cuotas = list(Cuota.objects.filter(crm_fila_id=crm_fila).order_by("fecha", "id"))
        # Un compromiso se puede pagar en varias cargas: descontar lo que ya cubrieron los pagos previos.
        imputado_previo = dict(
            PagoCuota.objects.filter(cuota_id__in=cuotas)
            .values_list("cuota_id")
            .annotate(total=Sum("monto_imputado"))
        )

        restante = monto_total
        imputaciones = []
        for cuota in cuotas:
            saldo = cuota.monto - imputado_previo.get(cuota.id, 0)
            monto = min(restante, saldo) if saldo > 0 and restante > 0 else 0
            restante -= monto
            imputaciones.append({"cuota": cuota, "monto_imputado": monto, "saldo": saldo - monto})

        return imputaciones, restante

    def imputar_a_cuotas(self, pago: "Pago") -> None:
        """Persiste la imputacion calculada para el pago recien creado."""
        from core.models import PagoCuota

        imputaciones, restante = self.calcular_imputacion(pago.crm_fila_id, pago.monto_total)
        PagoCuota.objects.bulk_create([
            PagoCuota(pago_id=pago, cuota_id=imputacion["cuota"], monto_imputado=imputacion["monto_imputado"])
            for imputacion in imputaciones
            if imputacion["monto_imputado"] > 0
        ])
        if restante > 0:
            logger.info(f"Pago {pago.id}: quedan {restante} sin imputar (excedente sobre las cuotas comprometidas).")

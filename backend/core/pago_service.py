import logging

from core.cuadratura_service import CuadraturaService
from core.flokzu_service import FlokzuService
from core.gpc.docai_service import DocumentAIService
from core.llm.openai_cantidad_pagos import OpenAiCantidadPagosService
from core.llm.openai_pago import OpenAiPagoService
from core.models import CRMFila, Cuota, Pago
from core.pdf_service import PdfService

logger = logging.getLogger(__name__)


class PagoService:
    def __init__(self):
        self.pdf_service = PdfService()
        self.docai_service = DocumentAIService()
        self.cantidad_service = OpenAiCantidadPagosService()
        self.openai_pago_service = OpenAiPagoService()
        self.cuadratura_service = CuadraturaService()
        self.flokzu_service = FlokzuService()

    def analizar_comprobantes(self, crm_fila: CRMFila, credito, archivos) -> dict:
        """Comprobantes -> PDF unico -> DocumentAI -> cantidad de transferencias -> detalle -> cuadratura.

        No escribe nada en la base: devuelve la propuesta para que el ejecutivo la revise. La escritura
        ocurre despues, cuando confirma el envio (ver PagoManager.registrar).
        """
        pdf_path = self.pdf_service.generar_pdf_desde_comprobantes(archivos, credito.id)

        texto = self.docai_service.procesar(pdf_path.read_bytes())
        if not texto.strip():
            raise ValueError("DocumentAI no obtuvo texto desde los comprobantes cargados.")

        cantidad = self.cantidad_service.obtener_cantidad_pagos(texto).cantidad
        logger.info(f"Transferencias identificadas en {pdf_path.name}: {cantidad}")
        if cantidad <= 0:
            raise ValueError("No se identificaron transferencias en los comprobantes cargados.")

        pago_response = self.openai_pago_service.obtener_pago(texto, cantidad)
        if len(pago_response.transferencias) != cantidad:
            logger.warning(
                f"Se esperaban {cantidad} transferencias y el detalle trajo {len(pago_response.transferencias)}."
            )

        return self._armar_analisis(crm_fila, credito, self.pdf_service.ruta_relativa(pdf_path), pago_response)

    def _armar_analisis(self, crm_fila: CRMFila, credito, pdf_path: str, pago_response) -> dict:
        monto_total = sum(transferencia.monto for transferencia in pago_response.transferencias)
        imputaciones, restante = Pago.objects.calcular_imputacion(crm_fila, monto_total)

        return {
            "pdf_path": pdf_path,
            "monto_total": monto_total,
            "monto_comprometido": crm_fila.monto or 0,
            "fecha_pago": pago_response.fecha_pago,
            "cuenta_destino": pago_response.cuenta_destino,
            "cuentas_distintas": pago_response.cuentas_distintas,
            "cantidad_transferencias": len(pago_response.transferencias),
            "transferencias": pago_response.transferencias,
            "imputaciones": [
                {
                    "cuota_id": imputacion["cuota"].id,
                    "cuota_fecha": imputacion["cuota"].fecha,
                    "cuota_monto": imputacion["cuota"].monto,
                    "monto_imputado": imputacion["monto_imputado"],
                    "saldo": imputacion["saldo"],
                }
                for imputacion in imputaciones
            ],
            "cuadratura": self.cuadratura_service.evaluar(crm_fila, pago_response, imputaciones, restante),
            "flokzu": self.flokzu_service.armar_solicitud(
                credito, crm_fila, pago_response, pdf_path, self._cubre_todas_las_vencidas(credito, imputaciones)
            ),
            "opciones_cuenta": self.flokzu_service.opciones_cuenta(),
        }

    @staticmethod
    def _cubre_todas_las_vencidas(credito, imputaciones: list[dict]) -> bool:
        """Decide el "Tipo de pago" de Flokzu: pago total solo si no queda ninguna cuota vencida con saldo."""
        imputado_ahora = {i["cuota"].id: i["monto_imputado"] for i in imputaciones}
        saldos = Cuota.objects.saldos_vencidos(credito)
        return all(saldo - imputado_ahora.get(cuota_id, 0) <= 0 for cuota_id, saldo in saldos.items())

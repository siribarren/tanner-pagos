import logging

from core.gpc.docai_service import DocumentAIService
from core.llm.openai_cantidad_pagos import OpenAiCantidadPagosService
from core.llm.openai_pago import OpenAiPagoService
from core.models import CRMFila, Pago
from core.pdf_service import generar_pdf_desde_comprobantes, ruta_relativa

logger = logging.getLogger(__name__)


def procesar_comprobantes(crm_fila: CRMFila, credito_id: int, archivos) -> Pago:
    """Comprobantes -> PDF unico -> DocumentAI -> cantidad de transferencias -> detalle -> db_pago."""
    pdf_path = generar_pdf_desde_comprobantes(archivos, credito_id)

    texto = DocumentAIService().procesar(pdf_path.read_bytes())
    if not texto.strip():
        raise ValueError("DocumentAI no obtuvo texto desde los comprobantes cargados.")

    cantidad = OpenAiCantidadPagosService().obtener_cantidad_pagos(texto).cantidad
    logger.info(f"Transferencias identificadas en {pdf_path.name}: {cantidad}")
    if cantidad <= 0:
        raise ValueError("No se identificaron transferencias en los comprobantes cargados.")

    pago_response = OpenAiPagoService().obtener_pago(texto, cantidad)
    if len(pago_response.transferencias) != cantidad:
        logger.warning(
            f"Se esperaban {cantidad} transferencias y el detalle trajo {len(pago_response.transferencias)}."
        )

    return Pago.objects.registrar(crm_fila, ruta_relativa(pdf_path), pago_response)

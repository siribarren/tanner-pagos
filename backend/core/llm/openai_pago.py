import logging
import time

from openai import OpenAI
from openai.types.responses import EasyInputMessageParam, Response, ResponseInputTextContentParam

from core.config.llm_config import LlmConfig, get_llm_config
from core.llm.estructuras import PagoResponse, TokenInfo
from core.llm.openai_utils import OpenAiUtils

logger = logging.getLogger(__name__)

class OpenAiPagoService:
    def __init__(self):
        llm_config: LlmConfig = get_llm_config()
        self.client = OpenAI(api_key=llm_config.openai_api_key)
        self.model_name = llm_config.openai_model
        logger.info(f"OpenAiPagoService inicializado con modelo: {self.model_name}")

    def obtener_pago(self, texto: str, cantidad_transferencias: int) -> PagoResponse:
        try:
            user_prompt_str = self.get_prompt(texto, cantidad_transferencias)
            request_text = f"Prompt: {user_prompt_str}"
            request_hash = OpenAiUtils.hash_contenido_1(user_prompt_str)
            cached_response = OpenAiUtils.obtener_request_hash(self.model_name, request_hash)
            if cached_response:
                logger.debug("Respuesta obtenida desde caché.")
                try:
                    return PagoResponse.model_validate_json(cached_response.response_text)
                except Exception as e:
                    logger.warning(f"Cache invalida para pago, se recalcula con OpenAI: {e}")

            logger.debug("No se encontro respuesta en caché. Procesando con OpenAI...")
            start_time = time.time()
            response, pago_respuesta = self.obtener_respuesta(user_prompt_str)
            response_text = pago_respuesta.model_dump_json(indent=2)
            token_info = OpenAiUtils.get_tokens_openai(response)
            tiempo_ms = int((time.time() - start_time) * 1000)
            logger.info(f"Proceso de pago con OpenAI en {tiempo_ms} ms")

            self.guardar_pago_hash(request_text, request_hash, response_text, token_info)
            return pago_respuesta
        except Exception as e:
            logger.error(f"Error al obtener el pago: {e}")
            return PagoResponse()

    @staticmethod
    def get_prompt(texto: str, cantidad_transferencias: int) -> str:
        cabecera = f"""
        A continuacion se te presentará el texto OCR (ruidoso, con lineas sueltas y posibles
        errores) de {cantidad_transferencias} comprobante(s) de transferencia bancaria.

        Contexto:
            - Cada comprobante suele repetir las mismas etiquetas: "Monto transferido", "Destinatario",
              "Institución financiera", "Tipo de cuenta", "Número de cuenta" (o "Nº de cuenta"),
              "Fecha y hora" (o "Fecha" / "Hora" en lineas separadas).
            - El monto aparece como texto tipo "$250.000".
            - La fecha de la transferencia aparece cerca de "Fecha y hora"/"Fecha", en formatos como
              "15 jun. 2026 12:31 hrs" o "15/06/2026". NO la confundas con el "Nº de operación",
              el "RUT"/"C.I.", el "TELEFONO", ni con números de cuenta.
            - Para determinar la cuenta destino de CADA comprobante, sigue este procedimiento estricto:
              1. Busca en el texto la etiqueta literal "Número de cuenta" o "Nº de cuenta".
              2. La cuenta destino de ese comprobante es SOLO el numero que aparece justo despues de
                 esa etiqueta (misma linea o linea siguiente), asociado al Destinatario (no al Origen).
              3. Cualquier otro numero que aparezca en el comprobante SIN estar precedido por esa
                 etiqueta literal (por ejemplo, pegado al nombre del destinatario, un RUT, telefono,
                 "Nº de operación", C.I., etc.) NO es una cuenta destino: ignoralo por completo, no lo
                 compares ni lo reportes.
              4. Si un comprobante no tiene la etiqueta "Número de cuenta"/"Nº de cuenta" en el texto,
                 ese comprobante no aporta informacion de cuenta destino (no cuenta como "distinta").
            - cuentas_distintas = true SOLO si, entre los comprobantes donde sí identificaste la cuenta
              destino con el procedimiento anterior, hay 2 o mas numeros de cuenta diferentes entre si.
              Si todos los que tienen cuenta identificada comparten el mismo numero, cuentas_distintas
              es false y cuenta_destino es ese numero.

        Por favor, organiza esta información en una estructura con las siguientes columnas:
            - pago_total: La suma en pesos de todos los "Monto transferido" encontrados
            - fecha_pago: La fecha (formato YYYY-MM-DD) mas reciente entre las fechas de transferencia
              encontradas (ej: si hay transferencias en enero, abril y diciembre del mismo año, usar la de diciembre)
            - cuenta_destino: Si cuentas_distintas es false, este campo DEBE ser ese numero de cuenta
              compartido (nunca null en ese caso). Si cuentas_distintas es true, este campo debe ser null
            - cuentas_distintas: true si los comprobantes tienen distintos numeros de cuenta destino
              entre si (esto no deberia ocurrir), false si todos comparten la misma cuenta destino
        ```text
        """
        contenido: list[str] = []
        for linea in texto.splitlines():
            if linea.strip():
                linea_full = linea.strip().replace("  ", " ")
                contenido.append(linea_full)
        return cabecera + "\n".join(contenido) + "\n```"

    def obtener_respuesta(self, user_prompt_str: str) -> tuple[Response, PagoResponse]:
        content_txt = ResponseInputTextContentParam(type="input_text", text=user_prompt_str)
        input_message = EasyInputMessageParam(content=[content_txt], role="user")
        response = self.client.responses.parse(model=self.model_name, input=[input_message], text_format=PagoResponse)
        pago_response: PagoResponse = response.output_parsed
        return response, pago_response

    def guardar_pago_hash(self, request_text: str, request_hash: str, response_text: str, token_info: TokenInfo | None) -> None:
        OpenAiUtils.guardar_request_hash(self.model_name, request_text, request_hash, response_text, token_info)
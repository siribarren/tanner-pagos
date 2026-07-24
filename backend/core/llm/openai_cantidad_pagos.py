import logging
import time

from openai import OpenAI
from openai.types.responses import EasyInputMessageParam, Response, ResponseInputTextContentParam

from core.config.llm_config import LlmConfig, get_llm_config
from core.llm.estructuras import CantidadTransferenciasResponse, TokenInfo
from core.llm.openai_utils import OpenAiUtils

logger = logging.getLogger(__name__)

class OpenAiCantidadPagosService:
    def __init__(self):
        llm_config: LlmConfig = get_llm_config()
        self.client = OpenAI(api_key=llm_config.openai_api_key)
        self.model_name = llm_config.openai_model
        logger.info(f"OpenAiCantidadPagosService inicializado con modelo: {self.model_name}")

    def obtener_cantidad_pagos(self, texto: str) -> CantidadTransferenciasResponse:
        try:
            user_prompt_str = self.get_prompt(texto)
            request_text = f"Prompt: {user_prompt_str}"
            request_hash = OpenAiUtils.hash_contenido_1(user_prompt_str)
            cached_response = OpenAiUtils.obtener_request_hash(self.model_name, request_hash)
            if cached_response:
                logger.debug("Respuesta obtenida desde caché.")
                try:
                    return CantidadTransferenciasResponse.model_validate_json(cached_response.response_text)
                except Exception as e:
                    logger.warning(f"Cache invalida para cantidad de pagos, se recalcula con OpenAI: {e}")

            logger.debug("No se encontro respuesta en caché. Procesando con OpenAI...")
            start_time = time.time()
            response, cantidad_pagos_respuesta = self.obtener_respuesta(user_prompt_str)
            response_text = cantidad_pagos_respuesta.model_dump_json(indent=2)
            token_info = OpenAiUtils.get_tokens_openai(response)
            tiempo_ms = int((time.time() - start_time) * 1000)
            logger.info(f"Proceso de cantidad de pagos con OpenAI en {tiempo_ms} ms")

            self.guardar_cantidad_pagos_hash(request_text, request_hash, response_text, token_info)
            return cantidad_pagos_respuesta
        except Exception as e:
            logger.error(f"Error al obtener la cantidad de pagos: {e}")
            return CantidadTransferenciasResponse()

    @staticmethod
    def get_prompt(texto: str) -> str:
        cabecera = """
        A continuacion se te presentará un texto el cual puede presentar una o varias transferencias

        Contexto:
            - Si no se encuentra ninguna transferencia devolver 0.

        Por favor, organiza esta información en una estructura con las siguientes columnas:
            - cantidad: Cantidad de transferencias distintas encontradas en este texto
            - evidencia: Fundamente de tu respuesta
        ```text
        """
        contenido: list[str] = []
        for linea in texto.splitlines():
            if linea.strip():
                linea_full = linea.strip().replace("  ", " ")
                contenido.append(linea_full)
        return cabecera + "\n".join(contenido) + "\n```"

    def obtener_respuesta(self, user_prompt_str: str) -> tuple[Response, CantidadTransferenciasResponse]:
        content_txt = ResponseInputTextContentParam(type="input_text", text=user_prompt_str)
        input_message = EasyInputMessageParam(content=[content_txt], role="user")
        response = self.client.responses.parse(model=self.model_name, input=[input_message], text_format=CantidadTransferenciasResponse)
        cantidad_pagos_response: CantidadTransferenciasResponse = response.output_parsed
        return response, cantidad_pagos_response

    def guardar_cantidad_pagos_hash(self, request_text: str, request_hash: str, response_text: str, token_info: TokenInfo | None) -> None:
        OpenAiUtils.guardar_request_hash(self.model_name, request_text, request_hash, response_text, token_info)

import logging
import time

from openai import OpenAI
from openai.types.responses import EasyInputMessageParam, Response, ResponseInputTextContentParam

from core.config.llm_config import LlmConfig, get_llm_config
from core.llm.estructuras import PagoResponse, TokenInfo
from core.llm.openai_utils import OpenAiUtils

logger = logging.getLogger(__name__)

MODEL_PAGO = "OpenAiPago"


class OpenAiPagoService:
    def __init__(self):
        llm_config: LlmConfig = get_llm_config()
        self.client = OpenAI(api_key=llm_config.openai_api_key)
        self.model_name = llm_config.openai_model
        logger.info(f"OpenAiPagoService inicializado con modelo: {self.model_name}")

    def obtener_pago(self, texto: str) -> PagoResponse:
        try:
            user_prompt_str = self.get_prompt(texto)
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
    def get_prompt(texto: str) -> str:
        cabecera = """
        A continuacion se presentará el texto de un documento relacionado a una transferencia bancaria

        Este es el contexto:
            - Este document deberia contener información de un pago
            - Si no se encuentra la información requerida, la tabla debe quedar vacia.

        Por favor, organiza esta información en una estructura con las siguientes columnas 
        """

    def obtener_respuesta(self, user_prompt_str: str) -> tuple[Response, PagoResponse]:
        content_txt = ResponseInputTextContentParam(type="input_text", text=user_prompt_str)
        input_message = EasyInputMessageParam(content=[content_txt], role="user")
        response = self.client.responses.parse(model=self.model_name, input=[input_message], text_format=PagoResponse)
        pago_response: PagoResponse = response.output_parsed
        return response, pago_response

    def guardar_pago_hash(self, request_text: str, request_hash: str, response_text: str, token_info: TokenInfo | None) -> None:
        OpenAiUtils.guardar_request_hash(self.model_name, request_text, request_hash, response_text, token_info)

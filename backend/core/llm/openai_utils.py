import hashlib
import logging

from openai.types.responses import Response

from core.llm.estructuras import TokenInfo
from core.models import RequestCache

logger = logging.getLogger(__name__)


class OpenAiUtils:
    @staticmethod
    def hash_contenido_1(prompt: str) -> str:
        h = hashlib.sha256()
        h.update(prompt.encode("utf-8"))
        return h.hexdigest()

    @staticmethod
    def get_tokens_openai(response: Response) -> TokenInfo | None:
        try:
            usage = response.usage
            if usage is None:
                return None
            output_tokens_details = usage.output_tokens_details
            thoughts_tokens = output_tokens_details.reasoning_tokens if output_tokens_details else 0
            return TokenInfo(
                input_tokens=usage.input_tokens,
                thoughts_tokens=thoughts_tokens,
                output_token=usage.output_tokens,
                total_tokens=usage.total_tokens,
            )
        except Exception as e:
            logger.info(f"No se pudieron registrar los tokens de OpenAi: {e}")
            return None

    @staticmethod
    def obtener_request_hash(model_name: str, request_hash: str) -> RequestCache | None:
        return RequestCache.objects.obtener_request_cache(model_name, request_hash)

    @staticmethod
    def guardar_request_hash(model_name: str, req_text: str, req_hash: str, res_text: str, token_info: TokenInfo | None) -> None:
        RequestCache.objects.guardar_request_cache(
            model=model_name,
            request_text=req_text,
            request_hash=req_hash,
            response_text=res_text,
            tokens_input=token_info.input_tokens if token_info else 0,
            tokens_thoughts=token_info.thoughts_tokens if token_info else 0,
            tokens_output=token_info.output_token if token_info else 0,
            tokens_total=token_info.total_tokens if token_info else 0,
        )

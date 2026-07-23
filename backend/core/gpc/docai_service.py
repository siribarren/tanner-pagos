import hashlib
import json
import logging
from os import environ
from pathlib import Path

from google.api_core.client_options import ClientOptions
from google.api_core.exceptions import InvalidArgument
from google.cloud import documentai

from core.config.docai_config import DocAiConfig, get_docai_config
from core.models import RequestCache

MODEL_DOCAI = "DocumentAi"

logger = logging.getLogger(__name__)


class DocumentAIService:
    def __init__(self):
        self.cfg: DocAiConfig = get_docai_config()

        credentials_path = environ.get("DOCAI_CREDENTIALS_PATH")
        assert credentials_path is not None, "DOCAI_CREDENTIALS_PATH no esta configurada."

        client_options = ClientOptions(api_endpoint=f"{self.cfg.location}-documentai.googleapis.com")
        self._client = self.get_document_ai_client(credentials_path, client_options)

    @property
    def processor_name(self) -> str:
        """Resource name del processor."""
        return self._client.processor_path(self.cfg.project_id, self.cfg.location, self.cfg.ocr_processor)

    def procesar(self, content: bytes, mime_type: str = "application/pdf") -> str:
        request_hash = hashlib.sha256(content).hexdigest()
        cache = RequestCache.objects.buscar(MODEL_DOCAI, request_hash)
        if cache is not None:
            logger.info("Texto obtenido desde RequestCache, se omite DocumentAI")
            return cache.response_text

        request = documentai.ProcessRequest(
            name=self.processor_name,
            raw_document=documentai.RawDocument(content=content, mime_type=mime_type),
        )
        logger.info("Procesando documento con DocumentAI")
        try:
            result = self._client.process_document(request=request)
        except InvalidArgument as e:
            if self.es_error_limite_paginas(e):
                raise ValueError("DocumentAI excedio el limite de paginas del documento") from e
            raise

        texto = result.document.text
        RequestCache.objects.guardar(model=MODEL_DOCAI, request_text="", request_hash=request_hash, response_text=texto)
        return texto

    @staticmethod
    def es_error_limite_paginas(error: InvalidArgument) -> bool:
        mensaje = str(error)
        return "PAGE_LIMIT_EXCEEDED" in mensaje or "page limit" in mensaje.lower() or "non-imageless mode exceed the limit" in mensaje.lower()

    @staticmethod
    def get_document_ai_client(credentials_path: str, client_options: ClientOptions) -> documentai.DocumentProcessorServiceClient:
        sa_json = json.loads(Path(credentials_path).read_text())
        return documentai.DocumentProcessorServiceClient.from_service_account_info(sa_json, client_options=client_options)

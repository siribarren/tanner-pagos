import hashlib
import json
import logging
from dataclasses import dataclass
from os import environ
from pathlib import Path

from google.api_core.client_options import ClientOptions
from google.api_core.exceptions import InvalidArgument
from google.cloud import documentai

from core.config.docai_config import DocAiConfig, get_docai_config
from core.models import RequestCache

# El sufijo -layout invalida el cache de la version que guardaba document.text plano.
MODEL_DOCAI = "DocumentAI"

# Dos lineas van en la misma fila si sus alturas se solapan al menos este porcentaje.
SOLAPE_MINIMO_FILA = 0.4

# Deteccion de sub-imagenes pegadas lado a lado: el ancho de la pagina se divide en BINS_X
# franjas y una canaleta vacia de al menos ANCHO_MINIMO_CANALETA separa dos documentos.
BINS_X = 200
ANCHO_MINIMO_CANALETA = 0.01

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class LineaOcr:
    """Una linea de OCR con su posicion normalizada (0..1) dentro de la pagina."""
    texto: str
    x_min: float
    x_max: float
    y_min: float
    y_max: float

    @property
    def centro_x(self) -> float:
        return (self.x_min + self.x_max) / 2


class DocumentAIService:
    def __init__(self):
        self.cfg: DocAiConfig = get_docai_config()

        credentials_path = environ.get("GCP_CREDENTIALS_PATH")
        assert credentials_path is not None, "GCP_CREDENTIALS_PATH no esta configurada."

        client_options = ClientOptions(api_endpoint=f"{self.cfg.location}-documentai.googleapis.com")
        self._client = self.get_document_ai_client(credentials_path, client_options)

    @property
    def processor_name(self) -> str:
        """Resource name del processor."""
        return self._client.processor_path(self.cfg.project_id, self.cfg.location, self.cfg.ocr_processor)

    def procesar(self, content: bytes, mime_type: str = "application/pdf") -> str:
        request_hash = hashlib.sha256(content).hexdigest()
        cache = RequestCache.objects.obtener_request_cache(MODEL_DOCAI, request_hash)
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

        texto = self.texto_por_filas(result.document)
        RequestCache.objects.guardar_request_cache(
            model=MODEL_DOCAI,
            request_text="",
            request_hash=request_hash,
            response_text=texto,
        )
        return texto

    def texto_por_filas(self, document: documentai.Document) -> str:
        """Rearma el texto respetando la estructura visual.

        `document.text` entrega las lineas en el orden de lectura que decide DocumentAI, que en un
        comprobante a dos columnas agrupa primero las etiquetas y despues los valores (se pierde la
        relacion etiqueta/valor). Como cada linea trae su bounding box, aca se reagrupan las que
        estaban a la misma altura en la imagen y se unen con " | ", separando antes las sub-imagenes
        que vengan pegadas lado a lado.
        """
        filas: list[str] = []
        for numero, pagina in enumerate(document.pages, start=1):
            lineas = [self._leer_linea(linea.layout, document.text) for linea in pagina.lines]
            visibles = [linea for linea in lineas if linea is not None]
            if not visibles:
                continue
            # Las columnas se emiten una despues de otra, sin marcarlas: marcarlas hacia que el LLM
            # contara "una transferencia por columna" en vez de contar por contenido.
            filas.append(f"[pagina {numero}]")
            for columna in self._separar_columnas(visibles):
                filas.extend(self._agrupar_en_filas(columna))

        if not filas:
            logger.warning("DocumentAI no devolvio lineas con geometria; se usa el texto plano.")
            return document.text
        return "\n".join(filas)

    @staticmethod
    def _leer_linea(layout: documentai.Document.Page.Layout, texto_documento: str) -> "LineaOcr | None":
        texto = "".join(
            texto_documento[int(segmento.start_index):int(segmento.end_index)]
            for segmento in layout.text_anchor.text_segments
        ).strip()
        vertices = layout.bounding_poly.normalized_vertices
        if not texto or not vertices:
            return None
        return LineaOcr(
            texto=texto,
            x_min=min(vertice.x for vertice in vertices),
            x_max=max(vertice.x for vertice in vertices),
            y_min=min(vertice.y for vertice in vertices),
            y_max=max(vertice.y for vertice in vertices),
        )

    def _separar_columnas(self, lineas: list["LineaOcr"]) -> list[list["LineaOcr"]]:
        """Separa las sub-imagenes que vienen pegadas lado a lado en un mismo comprobante.

        Cuando alguien pega varias capturas en una sola imagen, unirlas por altura mezcla el
        comprobante de la izquierda con el de la derecha. Una canaleta vertical vacia de punta a
        punta delata esa separacion: dentro de un mismo comprobante siempre hay algo (titulo,
        botones, totales) que la cruza.
        """
        ocupado = [False] * BINS_X
        for linea in lineas:
            desde = max(0, int(linea.x_min * BINS_X))
            hasta = min(BINS_X - 1, int(linea.x_max * BINS_X))
            for indice in range(desde, hasta + 1):
                ocupado[indice] = True

        cortes = [
            (inicio + fin) / 2 / BINS_X
            for inicio, fin in self._tramos_vacios(ocupado)
            if inicio > 0 and (fin - inicio) / BINS_X >= ANCHO_MINIMO_CANALETA
        ]
        if not cortes:
            return [lineas]

        grupos: list[list[LineaOcr]] = [[] for _ in range(len(cortes) + 1)]
        for linea in lineas:
            grupos[sum(1 for corte in cortes if linea.centro_x > corte)].append(linea)
        return [grupo for grupo in grupos if grupo]

    @staticmethod
    def _tramos_vacios(ocupado: list[bool]) -> list[tuple[int, int]]:
        """Tramos [inicio, fin) sin ninguna linea. El tramo final (margen derecho) queda fuera."""
        tramos: list[tuple[int, int]] = []
        inicio = None
        for indice, lleno in enumerate(ocupado):
            if not lleno and inicio is None:
                inicio = indice
            elif lleno and inicio is not None:
                tramos.append((inicio, indice))
                inicio = None
        return tramos

    def _agrupar_en_filas(self, lineas: list["LineaOcr"]) -> list[str]:
        filas: list[str] = []
        actual: list[LineaOcr] = []
        for linea in sorted(lineas, key=lambda item: (item.y_min, item.x_min)):
            if actual and self._misma_fila(actual[0], linea):
                actual.append(linea)
                continue
            if actual:
                filas.append(self._unir_fila(actual))
            actual = [linea]
        if actual:
            filas.append(self._unir_fila(actual))
        return filas

    @staticmethod
    def _misma_fila(referencia: "LineaOcr", linea: "LineaOcr") -> bool:
        solape = min(referencia.y_max, linea.y_max) - max(referencia.y_min, linea.y_min)
        alto = min(referencia.y_max - referencia.y_min, linea.y_max - linea.y_min)
        return alto > 0 and solape >= alto * SOLAPE_MINIMO_FILA

    @staticmethod
    def _unir_fila(lineas: list["LineaOcr"]) -> str:
        return " | ".join(linea.texto for linea in sorted(lineas, key=lambda item: item.x_min))

    @staticmethod
    def es_error_limite_paginas(error: InvalidArgument) -> bool:
        mensaje = str(error)
        return "PAGE_LIMIT_EXCEEDED" in mensaje or "page limit" in mensaje.lower() or "non-imageless mode exceed the limit" in mensaje.lower()

    @staticmethod
    def get_document_ai_client(credentials_path: str, client_options: ClientOptions) -> documentai.DocumentProcessorServiceClient:
        sa_json = json.loads(Path(credentials_path).read_text())
        return documentai.DocumentProcessorServiceClient.from_service_account_info(sa_json, client_options=client_options)

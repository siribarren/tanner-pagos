import logging
from datetime import datetime
from io import BytesIO
from pathlib import Path

from django.conf import settings
from PIL import Image, UnidentifiedImageError
from pypdf import PdfWriter

logger = logging.getLogger(__name__)

EXTENSIONES_IMAGEN = {".png", ".jpg", ".jpeg"}
EXTENSION_PDF = ".pdf"
EXTENSIONES_COMPROBANTE = EXTENSIONES_IMAGEN | {EXTENSION_PDF}
DIRECTORIO_PDFS = Path(settings.BASE_DIR) / "downloads" / "pdfs"


def generar_pdf_desde_comprobantes(archivos, credito_id: int) -> Path:
    """Une los comprobantes cargados en un unico PDF: una pagina por imagen, y los PDF tal cual vienen."""
    if not archivos:
        raise ValueError("Se requiere al menos un comprobante para generar el PDF.")

    DIRECTORIO_PDFS.mkdir(parents=True, exist_ok=True)
    destino = DIRECTORIO_PDFS / f"{credito_id}_{datetime.now():%Y%m%d_%H%M%S_%f}.pdf"

    # Un unico PDF se guarda tal cual: conserva el archivo original y reusa el cache de DocumentAI.
    if len(archivos) == 1 and _es_pdf(archivos[0]):
        destino.write_bytes(archivos[0].read())
        logger.info(f"Comprobante PDF guardado sin modificar en {destino}")
        return destino

    documento = PdfWriter()
    for archivo in archivos:
        documento.append(archivo if _es_pdf(archivo) else _imagen_como_pdf(archivo))

    with open(destino, "wb") as salida:
        documento.write(salida)
    logger.info(f"PDF generado con {len(documento.pages)} pagina(s) en {destino}")
    return destino


def _es_pdf(archivo) -> bool:
    return Path(getattr(archivo, "name", "")).suffix.lower() == EXTENSION_PDF


def ruta_relativa(pdf_path: Path) -> str:
    """Ruta que se guarda en db_pago.pdf_path, relativa a BASE_DIR para no depender del equipo."""
    return pdf_path.relative_to(settings.BASE_DIR).as_posix()


def _imagen_como_pdf(imagen) -> BytesIO:
    buffer = BytesIO()
    _abrir_imagen(imagen).save(buffer, "PDF")
    buffer.seek(0)
    return buffer


def _abrir_imagen(imagen) -> Image.Image:
    try:
        with Image.open(imagen) as img:
            return img.convert("RGB")
    except UnidentifiedImageError as e:
        nombre = getattr(imagen, "name", "imagen")
        raise ValueError(f"El archivo {nombre} no es una imagen valida.") from e

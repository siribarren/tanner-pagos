from functools import lru_cache
from os import environ

class DocAiConfig:
    project_id: str
    location: str
    ocr_processor: str

    def __init__(self, project_id: str, location: str, ocr_processor: str):
        self.project_id = project_id
        self.location = location
        self.ocr_processor = ocr_processor

@lru_cache(maxsize=1)
def get_docai_config() -> DocAiConfig:
    project_id = environ.get("DOCAI_PROJECT_ID")
    assert project_id, "La variable de entorno DOCAI_PROJECT_ID no está configurada."

    location = environ.get("DOCAI_LOCATION")
    assert location in ("us", "eu"), "DOCAI_LOCATION debe ser 'us' o 'eu'."

    ocr_processor = environ.get("DOCAI_OCR_PROCESSOR_ID")
    assert ocr_processor, "La variable de entorno DOCAI_OCR_PROCESSOR_ID no está configurada."

    return DocAiConfig(
        project_id=project_id,
        location=location,
        ocr_processor=ocr_processor,
    )
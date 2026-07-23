from __future__ import annotations

from typing import TYPE_CHECKING

from django.db import models
from django.utils import timezone

if TYPE_CHECKING:
    from core.models import RequestCache


class RequestCacheManager(models.Manager):
    def obtener_request_cache(self, model: str, request_hash: str) -> "RequestCache | None":
        return self.filter(model=model, request_hash=request_hash).first()

    def guardar_request_cache(
        self,
        model: str,
        request_text: str,
        request_hash: str,
        response_text: str,
        tokens_input: int = 0,
        tokens_thoughts: int = 0,
        tokens_output: int = 0,
        tokens_total: int = 0,
    ) -> "RequestCache":
        cache, _creado = self.get_or_create(
            model=model,
            request_hash=request_hash,
            defaults={
                "fecha": timezone.now().date(),
                "request_text": request_text,
                "response_text": response_text,
                "tokens_input": tokens_input,
                "tokens_thoughts": tokens_thoughts,
                "tokens_output": tokens_output,
                "tokens_total": tokens_total,
            },
        )
        return cache

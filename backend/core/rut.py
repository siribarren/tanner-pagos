"""Utilidades para normalizar y validar RUT chilenos."""

import re


_RUT_RE = re.compile(r"^(\d{7,8})-?([0-9K])$")


def normalizar_rut(valor: str | None) -> str | None:
    """Devuelve un RUT en formato ``12.345.678-9`` o ``None`` si no es valido.

    La normalizacion tolera puntos, espacios y el prefijo ``RUT``/``C.I.`` que puede
    devolver OCR/IA, pero no intenta calcular ni corregir el digito verificador.
    """
    if valor is None:
        return None

    texto = str(valor).strip().upper()
    texto = re.sub(r"^(?:RUT|C\.?I\.?)\s*[:#]?\s*", "", texto)
    compacto = re.sub(r"[.\s]", "", texto)
    coincidencia = _RUT_RE.fullmatch(compacto)
    if not coincidencia:
        return None

    cuerpo, verificador = coincidencia.groups()
    cuerpo_formateado = f"{int(cuerpo):,}".replace(",", ".")
    return f"{cuerpo_formateado}-{verificador}"

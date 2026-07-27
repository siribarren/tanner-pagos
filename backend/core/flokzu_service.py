"""Arma la solicitud que el ejecutivo va a cargar en Flokzu (BPM de Tanner).

Todavia no hay integracion: el resultado se le muestra en pantalla para que la revise, la corrija
si hace falta y la tipee alla. Los campos siguen el formulario de "Recupero de castigo"
(backend/docs/05..08-flokzu-formulario.png).
"""

import re

from core.choices import TipoPagoFlokzu

TIPO_SOLICITUD = "Recupero de castigo"
EMPRESA = "TSF"
EMPRESA_COBRANZA = "PHOENIX"
CORREO_COBRANZA = "phoenix@tanner.cl"
CORREOS_ADICIONALES = "ejemplo@gmail.com"
FORMA_PAGO = "Transferencia"

# Cuentas que acepta el dropdown "Cuenta" del formulario (backend/docs/10..12-flokzu-cuentas.png).
CUENTAS_VALIDAS = {
    "1130002250": "Cobranza",
    "1130002242": "Prepagos",
    "983522211": "Cobranza",
    "983522203": "NTFS",
    "2000000552": "DNI COBRANZA",
    "2000000524": "TRANSITORIA COBRANZA",
    "1000007150": "RECLASIFICACIÓN TSF",
    "1000007170": "RECLASIFICACIÓN NTFS",
    "925349610": "Upago Prepago NTFS",
    "924356942": "Upago Prepago TSF",
    "918859463": "Upago Cuotas TSF",
    "1000006419": "Transitoria NTFS",
    "1000002742": "Transitoria TSF",
    "1190803": "División Empresas",
    "661608": "BRP",
    "983522238": "Seguros NTFS",
}


class FlokzuService:
    @staticmethod
    def cuenta_flokzu(cuenta_destino: str | None) -> str | None:
        """La cuenta que extrajo el LLM, mapeada al valor del dropdown; None si no es una cuenta valida."""
        if not cuenta_destino:
            return None
        # El comprobante trae la cuenta con formato libre ("Cuenta Corriente 918.859.463") y algunos
        # bancos la rellenan con ceros a la izquierda ("001130002250" en Santander): se comparan solo
        # los digitos significativos. Ninguna cuenta del listado empieza en cero, asi que no hay ambiguedad.
        digitos = re.sub(r"\D", "", cuenta_destino).lstrip("0")
        etiqueta = CUENTAS_VALIDAS.get(digitos)
        return f"{digitos}-{etiqueta}" if etiqueta else None

    @staticmethod
    def opciones_cuenta() -> list[str]:
        return [f"{numero}-{etiqueta}" for numero, etiqueta in CUENTAS_VALIDAS.items()]

    @staticmethod
    def tipo_pago(cubre_todas_las_vencidas: bool) -> str:
        return TipoPagoFlokzu.PAGO_TOTAL if cubre_todas_las_vencidas else TipoPagoFlokzu.PUT_CUOTAS

    @staticmethod
    def armar_solicitud(credito, crm_fila, pago_response, pdf_path: str, cubre_todas_las_vencidas: bool) -> dict:
        monto_total = sum(t.monto for t in pago_response.transferencias)
        # El deudor pago de mas -> el excedente es saldo a favor; pago de menos -> la diferencia va a CECO.
        diferencia = monto_total - (crm_fila.monto or 0)

        return {
            "tipo_solicitud": TIPO_SOLICITUD,
            "empresa": EMPRESA,
            "empresa_cobranza": EMPRESA_COBRANZA,
            "correo_cobranza": CORREO_COBRANZA,
            "correos_adicionales": CORREOS_ADICIONALES,
            "id_credito": credito.id,
            "forma_pago": FORMA_PAGO,
            "rut_transfiere": credito.rut_deudor,
            "monto_pago": monto_total,
            "cuenta": FlokzuService.cuenta_flokzu(pago_response.cuenta_destino),
            "fecha_pago": pago_response.fecha_pago,
            "cantidad_movimientos": len(pago_response.transferencias),
            "tipo_pago": FlokzuService.tipo_pago(cubre_todas_las_vencidas),
            "considera_otros_id": False,
            "adjunto": pdf_path,
            "monto_ceco": -diferencia if diferencia < 0 else 0,
            "monto_saf": diferencia if diferencia > 0 else 0,
        }

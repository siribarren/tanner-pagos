"""Evalua un pago contra su compromiso: los cuatro chequeos que ve el ejecutivo antes de enviar.

Es aritmetica sobre datos ya extraidos, no una llamada a LLM. El texto del resumen es el
"explicacion automatica" que pide la seccion 16 del requerimiento de la plataforma.
"""

from datetime import date

from core.choices import TipoPago

MESES_ES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]

ESTADO_EXACTO = "Cuadrado exacto"
ESTADO_SAF = "Cuadrado con saldo a favor"
ESTADO_OBSERVADO = "Observado"


def pesos(monto: int) -> str:
    return f"${monto:,.0f}".replace(",", ".")


def fecha_larga(fecha: date | None) -> str:
    return f"{fecha.day} de {MESES_ES[fecha.month - 1]}" if fecha else "sin fecha"


class CuadraturaService:
    def evaluar(self, crm_fila, pago_response, imputaciones: list[dict], restante: int) -> dict:
        monto_total = sum(t.monto for t in pago_response.transferencias)
        comprometido = crm_fila.monto or 0
        # El compromiso queda cubierto solo si ninguna de sus cuotas quedo con saldo.
        cubre_compromiso = all(imputacion["saldo"] <= 0 for imputacion in imputaciones)

        checks = [
            self._check_monto(comprometido, monto_total),
            self._check_fecha(crm_fila.fecha_compromiso, pago_response.fecha_pago),
            self._check_pago(crm_fila.pago, cubre_compromiso),
            self._check_verificacion(pago_response),
        ]
        observados = [check for check in checks if check["tono"] != "ok"]

        if observados:
            estado = ESTADO_OBSERVADO
        elif restante > 0:
            estado = ESTADO_SAF
        else:
            estado = ESTADO_EXACTO

        return {
            "estado": estado,
            "checks": checks,
            "saldo_a_favor": restante,
            "resumen": self._resumen(monto_total, comprometido, pago_response.fecha_pago, imputaciones, restante),
            "control": [
                ["Estado de cuadratura", estado],
                ["Diferencia detectada", pesos(monto_total - comprometido)],
                ["Saldo a favor", pesos(restante)],
                ["Transferencias identificadas", str(len(pago_response.transferencias))],
                ["Comprobante validado", "No" if pago_response.cuentas_distintas else "Sí"],
                ["Requiere autorización", "Sí" if observados else "No"],
            ],
        }

    @staticmethod
    def _check_monto(comprometido: int, transferido: int) -> dict:
        diferencia = transferido - comprometido
        if diferencia == 0:
            resultado, tono = "Cliente paga monto exacto.", "ok"
        elif diferencia > 0:
            resultado, tono = f"Cliente paga {pesos(diferencia)} de mas.", "observado"
        else:
            resultado, tono = f"Cliente paga {pesos(-diferencia)} de menos.", "observado"
        return {
            "n": 1,
            "titulo": "Monto",
            "resultado": resultado,
            "tono": tono,
            "campos": [["Monto comprometido", pesos(comprometido)], ["Monto transferido", pesos(transferido)]],
        }

    @staticmethod
    def _check_fecha(fecha_compromiso: date | None, fecha_pago: date | None) -> dict:
        if fecha_pago is None:
            resultado, tono = "No se identifico la fecha de pago en los comprobantes.", "observado"
        elif fecha_compromiso is None:
            resultado, tono = "El compromiso no tiene fecha registrada.", "observado"
        elif fecha_pago <= fecha_compromiso:
            resultado, tono = "Cliente paga en la fecha comprometida.", "ok"
        else:
            dias = (fecha_pago - fecha_compromiso).days
            resultado, tono = f"Cliente paga {dias} dia(s) despues de lo comprometido.", "observado"
        return {
            "n": 2,
            "titulo": "Fecha",
            "resultado": resultado,
            "tono": tono,
            "campos": [
                ["Fecha comprometida", fecha_larga(fecha_compromiso)],
                ["Fecha de pago", fecha_larga(fecha_pago)],
            ],
        }

    @staticmethod
    def _check_pago(tipo_compromiso: str | None, cubre_compromiso: bool) -> dict:
        etiqueta = TipoPago(tipo_compromiso).label if tipo_compromiso else "No definido"
        realizado = etiqueta if cubre_compromiso else TipoPago.PARCIAL.label
        return {
            "n": 3,
            "titulo": "Pago",
            "resultado": (
                f"Pago {etiqueta.lower()} cumplido."
                if cubre_compromiso
                else "El pago no alcanza a cubrir todas las cuotas comprometidas."
            ),
            "tono": "ok" if cubre_compromiso else "observado",
            "campos": [["Tipo de pago", etiqueta], ["Pago realizado", realizado]],
        }

    @staticmethod
    def _check_verificacion(pago_response) -> dict:
        if pago_response.cuentas_distintas:
            resultado, tono = "Los comprobantes apuntan a cuentas de destino distintas.", "observado"
        else:
            resultado, tono = "Transferencia verificada.", "ok"
        return {
            "n": 4,
            "titulo": "Verificación",
            "resultado": resultado,
            "tono": tono,
            "campos": [
                ["Tipo de verificación", "Comprobante de transferencia validado"],
                ["Cuenta de destino", pago_response.cuenta_destino or "No identificada"],
            ],
        }

    @staticmethod
    def _resumen(monto_total: int, comprometido: int, fecha_pago, imputaciones: list[dict], restante: int) -> str:
        cubiertas = [i["cuota"] for i in imputaciones if i["monto_imputado"] > 0]
        detalle_cuotas = ", ".join(str(cuota.id) for cuota in cubiertas) or "ninguna cuota"
        diferencia = monto_total - comprometido

        resumen = (
            f"El cliente transfirió {pesos(monto_total)} el {fecha_larga(fecha_pago)}, "
            f"que se imputan a las cuotas {detalle_cuotas}. "
        )
        if diferencia == 0:
            resumen += "El monto coincide exactamente con lo comprometido"
        elif diferencia > 0:
            resumen += f"El monto supera en {pesos(diferencia)} lo comprometido"
        else:
            resumen += f"El monto queda {pesos(-diferencia)} bajo lo comprometido"
        resumen += (
            f", quedando {pesos(restante)} como saldo a favor." if restante > 0 else ", sin saldo a favor."
        )
        return resumen

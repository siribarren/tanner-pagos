import logging
import time

from openai import OpenAI
from openai.types.responses import EasyInputMessageParam, Response, ResponseInputTextContentParam

from core.config.llm_config import LlmConfig, get_llm_config
from core.llm.estructuras import PagoResponse, TokenInfo
from core.llm.openai_utils import OpenAiUtils

logger = logging.getLogger(__name__)

class OpenAiPagoService:
    def __init__(self):
        llm_config: LlmConfig = get_llm_config()
        self.client = OpenAI(api_key=llm_config.openai_api_key)
        self.model_name = llm_config.openai_model
        logger.info(f"OpenAiPagoService inicializado con modelo: {self.model_name}")

    def obtener_pago(self, texto: str, cantidad_transferencias: int) -> PagoResponse:
        try:
            user_prompt_str = self.get_prompt(texto, cantidad_transferencias)
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
            raise ValueError("No se pudo extraer el detalle del pago desde los comprobantes.") from e

    @staticmethod
    def get_prompt(texto: str, cantidad_transferencias: int) -> str:
        cabecera = f"""
        A continuacion se te presentará el texto OCR de {cantidad_transferencias} comprobante(s) de
        transferencia bancaria.

        Formato del texto:
            - Viene reconstruido desde la imagen: cada fila junta con " | " los textos que estaban a la
              misma altura, normalmente "etiqueta | valor". Un valor puede continuar en la fila siguiente.
            - "[pagina N]" marca el inicio de cada imagen cargada. Una misma pagina puede traer varias
              capturas pegadas lado a lado: si dentro de una fila se repite una etiqueta ("Monto
              transferido | Monto transferido"), son comprobantes distintos y cada uno va con su
              propio monto y hora.

        Contexto:
            - Cada banco usa etiquetas distintas para lo mismo. Considera equivalentes:
              monto = "Monto" / "Monto transferido"; destinatario = "Destinatario" / "Beneficiario";
              banco = "Banco" / "Institución financiera"; cuenta = "Cuenta" / "Nº de cuenta" /
              "Número de cuenta"; y el valor de la cuenta puede venir con su tipo ("Cuenta Corriente
              8013244705", "Cuenta Vista 123", "CuentaRUT 00021326044").
            - El monto aparece como texto tipo "$250.000".
            - La fecha de la transferencia aparece cerca de "Fecha y hora"/"Fecha", en formatos como
              "15 jun. 2026 12:31 hrs" o "15/06/2026". NO la confundas con el "Nº de operación",
              el "RUT"/"C.I.", el "TELEFONO", ni con números de cuenta.
            - rut_transfiere = el RUT/C.I. de la persona que ordena o realiza la transferencia,
              cuando aparece en la seccion de origen/pagador (por ejemplo "De", "Ordenante",
              "Remitente", "Titular" o "Cuenta de origen"). No uses el RUT del destinatario,
              beneficiario ni un RUT del credito. Si no aparece, devuelve null.
            - Para determinar la cuenta destino de CADA comprobante:
              1. Ubica la seccion del DESTINATARIO/BENEFICIARIO. NUNCA uses la seccion de origen
                 ("Cuenta de origen", "Origen", "Cuenta cargada", "Desde"): esa es la cuenta del pagador.
              2. Dentro de esa seccion, la cuenta destino es el numero asociado a la etiqueta de cuenta,
                 este en la misma fila o en la fila inmediatamente siguiente.
              3. Reporta SOLO los digitos: si el valor dice "Cuenta Corriente 8013244705", la cuenta es
                 "8013244705".
              4. El RUT/C.I., el telefono, el "Nº de operación" y el correo NUNCA son cuenta destino.
              5. Solo si ese comprobante realmente no muestra ninguna cuenta del destinatario, devuelve null.
            - cuentas_distintas = true SOLO si, entre los comprobantes donde sí identificaste la cuenta
              destino con el procedimiento anterior, hay 2 o mas numeros de cuenta diferentes entre si.
              Si todos los que tienen cuenta identificada comparten el mismo numero, cuentas_distintas
              es false y cuenta_destino es ese numero.

        Por favor, organiza esta información en una estructura con las siguientes columnas:
            - transferencias: Una entrada por cada comprobante detectado (deben ser
              {cantidad_transferencias}), en el mismo orden en que aparecen en el texto, con:
                * orden: correlativo desde 1
                * monto: el "Monto transferido" de ESE comprobante
                * fecha: la fecha (formato YYYY-MM-DD) de ESE comprobante, null si no aparece
                * cuenta_destino: la cuenta destino de ESE comprobante segun el procedimiento
                  anterior, null si ese comprobante no la declara
                * banco: la "Institución financiera" del destinatario, null si no aparece
                * n_operacion: el "Nº de operación" de ESE comprobante, null si no aparece
            - rut_transfiere: el RUT/C.I. de quien transfiere, como solo 7 u 8 digitos de cuerpo,
              con puntos, guion y digito verificador (por ejemplo "12.345.678-9"). Si no aparece
              en los comprobantes, devuelve null. Si hay varios comprobantes y no tienen un RUT
              comun inequivoco, devuelve null. Nunca lo infieras desde el credito.
            - pago_total: La suma en pesos de todos los "Monto transferido" encontrados
            - fecha_pago: La fecha (formato YYYY-MM-DD) mas reciente entre las fechas de transferencia
              encontradas (ej: si hay transferencias en enero, abril y diciembre del mismo año, usar la de diciembre)
            - cuenta_destino: Si cuentas_distintas es false, este campo DEBE ser ese numero de cuenta
              compartido (nunca null en ese caso). Si cuentas_distintas es true, este campo debe ser null
            - cuentas_distintas: true si los comprobantes tienen distintos numeros de cuenta destino
              entre si (esto no deberia ocurrir), false si todos comparten la misma cuenta destino
        ```text
        """
        contenido: list[str] = []
        for linea in texto.splitlines():
            if linea.strip():
                linea_full = linea.strip().replace("  ", " ")
                contenido.append(linea_full)
        return cabecera + "\n".join(contenido) + "\n```"

    def obtener_respuesta(self, user_prompt_str: str) -> tuple[Response, PagoResponse]:
        content_txt = ResponseInputTextContentParam(type="input_text", text=user_prompt_str)
        input_message = EasyInputMessageParam(content=[content_txt], role="user")
        response = self.client.responses.parse(model=self.model_name, input=[input_message], text_format=PagoResponse)
        pago_response: PagoResponse = response.output_parsed
        return response, pago_response

    def guardar_pago_hash(self, request_text: str, request_hash: str, response_text: str, token_info: TokenInfo | None) -> None:
        OpenAiUtils.guardar_request_hash(self.model_name, request_text, request_hash, response_text, token_info)

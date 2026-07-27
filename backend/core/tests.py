import shutil
from datetime import date
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth.models import User
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError
from django.test import TestCase, override_settings
from google.cloud import documentai
from PIL import Image
from pypdf import PdfReader
from rest_framework.test import APIClient

from .choices import CanalContacto, CuotaEstado, EstadoCRM, PagoEstado, Situacion, TipoPago, TipoPagoFlokzu
from .flokzu_service import FlokzuService
from .gpc.docai_service import DocumentAIService
from .pdf_service import PdfService
from .llm.estructuras import CantidadTransferenciasResponse, PagoResponse, TransferenciaResponse
from .models import CRMFila, Credito, Cuota, Pago, PagoCuota, PagoTransferencia


def cliente_autenticado() -> APIClient:
    client = APIClient()
    client.force_authenticate(user=User.objects.create(username=f"test-{User.objects.count()}"))
    return client


@override_settings(ALLOWED_HOSTS=["testserver"])
class CarteraApiTests(TestCase):
    def setUp(self):
        self.client = cliente_autenticado()
        self.credito = Credito.objects.create(
            id=9000001,
            rut_deudor="11.111.111-1",
            nombre_deudor="Cliente de prueba",
        )
        CRMFila.objects.create(
            credito_id=self.credito,
            fecha_contacto=date(2026, 7, 1),
            fecha_compromiso=date(2026, 7, 15),
            estado=EstadoCRM.COMPROMETIDO,
            pago=TipoPago.PARCIAL,
            situacion=Situacion.PENDIENTE,
        )
        Cuota.objects.create(
            credito_id=self.credito,
            estado=CuotaEstado.VENCIDA,
            fecha=date(2026, 5, 20),
            monto=100000,
        )
        Cuota.objects.create(
            credito_id=self.credito,
            estado=CuotaEstado.VIGENTE,
            fecha=date(2026, 8, 20),
            monto=900000,
        )

    def test_listado_agrega_solo_cuotas_vencidas(self):
        response = self.client.get("/api/cartera/")

        self.assertEqual(response.status_code, 200)
        item = next(row for row in response.json() if row["id"] == self.credito.id)
        self.assertEqual(item["cuotas"], 1)
        self.assertEqual(item["monto"], 100000)
        self.assertEqual(item["estado"], EstadoCRM.COMPROMETIDO)
        self.assertEqual(item["situacion"], Situacion.PENDIENTE)
        self.assertEqual(item["canal_contacto"], CanalContacto.TELEFONO)

    def test_detalle_devuelve_crm_y_cuotas(self):
        response = self.client.get(f"/api/cartera/{self.credito.id}/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["credito"]["cliente"], "Cliente de prueba")
        self.assertEqual(payload["crm"]["pago"], TipoPago.PARCIAL)
        self.assertEqual(payload["crm"]["canal_contacto"], CanalContacto.TELEFONO)
        self.assertEqual(len(payload["cuotas"]), 2)

    def test_canal_contacto_solo_acepta_valores_permitidos(self):
        with self.assertRaises(IntegrityError):
            CRMFila.objects.create(
                credito_id=self.credito,
                canal_contacto="email",
            )


@override_settings(ALLOWED_HOSTS=["testserver"])
class CompromisoApiTests(TestCase):
    def setUp(self):
        self.client = cliente_autenticado()
        self.credito = Credito.objects.create(
            id=9100001,
            rut_deudor="22.222.222-2",
            nombre_deudor="Cliente compromiso",
            correo_deudor="cliente@example.com",
        )
        self.otro_credito = Credito.objects.create(
            id=9100002,
            rut_deudor="33.333.333-3",
            nombre_deudor="Otro cliente",
        )
        self.vencida_1 = Cuota.objects.create(
            credito_id=self.credito, estado=CuotaEstado.VENCIDA, fecha=date(2026, 5, 20), monto=100000,
        )
        self.vencida_2 = Cuota.objects.create(
            credito_id=self.credito, estado=CuotaEstado.VENCIDA, fecha=date(2026, 6, 20), monto=100000,
        )
        self.vigente = Cuota.objects.create(
            credito_id=self.credito, estado=CuotaEstado.VIGENTE, fecha=date(2026, 8, 20), monto=100000,
        )
        self.cuota_otro_credito = Cuota.objects.create(
            credito_id=self.otro_credito, estado=CuotaEstado.VENCIDA, fecha=date(2026, 5, 20), monto=50000,
        )

    def test_guardar_fecha_contacto_persiste_y_es_idempotente(self):
        fecha = date.today()
        response = self.client.post(f"/api/cartera/{self.credito.id}/contacto/", {"fecha_contacto": fecha.isoformat()})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(CRMFila.objects.filter(credito_id=self.credito).count(), 1)

        response = self.client.post(f"/api/cartera/{self.credito.id}/contacto/", {"fecha_contacto": fecha.isoformat()})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(CRMFila.objects.filter(credito_id=self.credito).count(), 1)

    def test_compromiso_rechaza_sin_fecha_contacto(self):
        response = self.client.post(
            f"/api/cartera/{self.credito.id}/compromiso/",
            {
                "fecha_compromiso": date.today().isoformat(),
                "canal_contacto": CanalContacto.TELEFONO,
                "monto": 100000,
                "cuota_ids": [self.vencida_1.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def _crear_compromiso(self, cuota_ids: list[int]):
        return self.client.post(
            f"/api/cartera/{self.credito.id}/compromiso/",
            {
                "fecha_compromiso": date.today().isoformat(),
                "canal_contacto": CanalContacto.TELEFONO,
                "monto": 100000,
                "cuota_ids": cuota_ids,
            },
            format="json",
        )

    def test_compromiso_rechaza_cuota_de_otro_credito_o_seleccion_con_saltos(self):
        self.client.post(f"/api/cartera/{self.credito.id}/contacto/", {"fecha_contacto": date.today().isoformat()})

        self.assertEqual(self._crear_compromiso([self.cuota_otro_credito.id]).status_code, 400)
        # Saltarse la mas antigua no se permite, aunque las cuotas sean del credito.
        self.assertEqual(self._crear_compromiso([self.vencida_2.id]).status_code, 400)
        self.assertEqual(self._crear_compromiso([self.vencida_1.id, self.vigente.id]).status_code, 400)

    def test_compromiso_acepta_cuota_vigente_si_van_desde_la_mas_antigua(self):
        self.client.post(f"/api/cartera/{self.credito.id}/contacto/", {"fecha_contacto": date.today().isoformat()})

        response = self._crear_compromiso([self.vencida_1.id, self.vencida_2.id, self.vigente.id])
        self.assertEqual(response.status_code, 200)
        # Cubre todas las cuotas del credito, asi que el compromiso es TOTAL.
        self.assertEqual(response.json()["pago"], TipoPago.TOTAL)

        self.vigente.refresh_from_db()
        self.assertEqual(self.vigente.crm_fila_id_id, response.json()["id"])

    def test_compromiso_total_vs_parcial_y_vinculo_cuotas(self):
        self.client.post(f"/api/cartera/{self.credito.id}/contacto/", {"fecha_contacto": date.today().isoformat()})

        response = self.client.post(
            f"/api/cartera/{self.credito.id}/compromiso/",
            {
                "fecha_compromiso": date.today().isoformat(),
                "canal_contacto": CanalContacto.WHATSAPP,
                "monto": 100000,
                "cuota_ids": [self.vencida_1.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["pago"], TipoPago.PARCIAL)
        self.assertEqual(payload["situacion"], Situacion.PENDIENTE)
        self.assertEqual(payload["estado"], EstadoCRM.COMPROMETIDO)

        fila_id = payload["id"]
        self.vencida_1.refresh_from_db()
        self.vencida_2.refresh_from_db()
        self.assertEqual(self.vencida_1.crm_fila_id_id, fila_id)
        self.assertIsNone(self.vencida_2.crm_fila_id_id)

        detalle = self.client.get(f"/api/cartera/{self.credito.id}/").json()
        cuotas_por_id = {c["id"]: c for c in detalle["cuotas"]}
        self.assertEqual(cuotas_por_id[self.vencida_1.id]["crm_fila_id"], fila_id)
        self.assertIsNone(cuotas_por_id[self.vencida_2.id]["crm_fila_id"])

    def test_compromiso_envia_correo_al_deudor(self):
        self.client.post(f"/api/cartera/{self.credito.id}/contacto/", {"fecha_contacto": date.today().isoformat()})

        response = self.client.post(
            f"/api/cartera/{self.credito.id}/compromiso/",
            {
                "fecha_compromiso": date.today().isoformat(),
                "canal_contacto": CanalContacto.TELEFONO,
                "monto": 100000,
                "cuota_ids": [self.vencida_1.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)

        self.assertEqual(len(mail.outbox), 1)
        enviado = mail.outbox[0]
        self.assertEqual(enviado.to, ["cliente@example.com"])
        self.assertIn("100.000", enviado.body)

    def test_compromiso_rechaza_fecha_anterior_a_hoy(self):
        self.client.post(f"/api/cartera/{self.credito.id}/contacto/", {"fecha_contacto": date.today().isoformat()})

        response = self.client.post(
            f"/api/cartera/{self.credito.id}/compromiso/",
            {
                "fecha_compromiso": date(2020, 1, 1).isoformat(),
                "canal_contacto": CanalContacto.TELEFONO,
                "monto": 100000,
                "cuota_ids": [self.vencida_1.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_cuota_manager_rechaza_vincular_sin_estado_comprometido(self):
        fila = CRMFila.objects.create(credito_id=self.credito)
        with self.assertRaises(ValueError):
            Cuota.objects.vincular_a_compromiso([self.vencida_1.id], fila)


def documento_ocr(lineas: list[tuple[str, float, float, float]]) -> documentai.Document:
    """Arma un Document como el de DocumentAI: cada linea es (texto, x_min, x_max, y)."""
    texto = ""
    objetos = []
    for contenido, x_min, x_max, y in lineas:
        inicio = len(texto)
        texto += contenido + "\n"
        objetos.append(documentai.Document.Page.Line(
            layout=documentai.Document.Page.Layout(
                text_anchor=documentai.Document.TextAnchor(
                    text_segments=[documentai.Document.TextAnchor.TextSegment(
                        start_index=inicio, end_index=inicio + len(contenido),
                    )],
                ),
                bounding_poly=documentai.BoundingPoly(normalized_vertices=[
                    documentai.NormalizedVertex(x=x_min, y=y),
                    documentai.NormalizedVertex(x=x_max, y=y),
                    documentai.NormalizedVertex(x=x_max, y=y + 0.02),
                    documentai.NormalizedVertex(x=x_min, y=y + 0.02),
                ]),
            ),
        ))
    return documentai.Document(text=texto, pages=[documentai.Document.Page(lines=objetos)])


class DocumentAITextoTests(TestCase):
    def test_reconstruye_etiqueta_y_valor_que_documentai_separo_por_columnas(self):
        # Caso real BancoEstado: document.text trae la columna de etiquetas y despues la de valores.
        # El titulo cruza el centro, asi que no hay canaleta y la pagina es una sola columna.
        document = documento_ocr([
            ("Comprobante de Transferencia", 0.20, 0.80, 0.20),
            ("RUT", 0.09, 0.20, 0.30),
            ("Banco", 0.09, 0.22, 0.34),
            ("Cuenta", 0.09, 0.23, 0.38),
            ("20.035.137-1", 0.50, 0.75, 0.30),
            ("Banco De Chile", 0.50, 0.78, 0.34),
            ("Cuenta Corriente 8013244705", 0.50, 0.85, 0.38),
        ])

        filas = DocumentAIService().texto_por_filas(document).splitlines()

        self.assertEqual(filas, [
            "[pagina 1]",
            "Comprobante de Transferencia",
            "RUT | 20.035.137-1",
            "Banco | Banco De Chile",
            "Cuenta | Cuenta Corriente 8013244705",
        ])

    def test_separa_dos_comprobantes_pegados_lado_a_lado(self):
        # Caso real MARCIA CARTES: varias capturas en una sola imagen. Sin separar, la fila de
        # "Monto" del comprobante izquierdo se pegaria con la cuenta del derecho.
        document = documento_ocr([
            ("Comprobante 1", 0.02, 0.40, 0.10),
            ("Monto", 0.02, 0.15, 0.30),
            ("$100", 0.25, 0.40, 0.30),
            ("Cuenta", 0.02, 0.16, 0.40),
            ("111", 0.25, 0.40, 0.40),
            ("Comprobante 2", 0.55, 0.95, 0.10),
            ("Monto", 0.55, 0.68, 0.30),
            ("$200", 0.78, 0.95, 0.30),
            ("Cuenta", 0.55, 0.69, 0.40),
            ("222", 0.78, 0.95, 0.40),
        ])

        filas = DocumentAIService().texto_por_filas(document).splitlines()

        self.assertEqual(filas, [
            "[pagina 1]",
            "Comprobante 1",
            "Monto | $100",
            "Cuenta | 111",
            "Comprobante 2",
            "Monto | $200",
            "Cuenta | 222",
        ])

    def test_sin_geometria_cae_al_texto_plano(self):
        document = documentai.Document(text="texto sin lineas", pages=[documentai.Document.Page()])

        self.assertEqual(DocumentAIService().texto_por_filas(document), "texto sin lineas")


def imagen_subida(nombre: str, formato: str = "PNG") -> SimpleUploadedFile:
    buffer = BytesIO()
    Image.new("RGB", (60, 40), "white").save(buffer, format=formato)
    return SimpleUploadedFile(nombre, buffer.getvalue(), content_type=f"image/{formato.lower()}")


def pdf_subido(nombre: str, paginas: int = 1) -> SimpleUploadedFile:
    buffer = BytesIO()
    imagenes = [Image.new("RGB", (60, 40), "white") for _ in range(paginas)]
    imagenes[0].save(buffer, format="PDF", save_all=True, append_images=imagenes[1:])
    return SimpleUploadedFile(nombre, buffer.getvalue(), content_type="application/pdf")


def respuesta_pago(montos: list[int]) -> PagoResponse:
    return PagoResponse(
        pago_total=sum(montos),
        fecha_pago=date(2026, 7, 10),
        cuenta_destino="12345678",
        cuentas_distintas=False,
        transferencias=[
            TransferenciaResponse(
                orden=indice + 1,
                monto=monto,
                fecha=date(2026, 7, 10),
                cuenta_destino="12345678",
                banco="Banco de Chile",
                n_operacion=f"000{indice + 1}",
            )
            for indice, monto in enumerate(montos)
        ],
    )


@override_settings(ALLOWED_HOSTS=["testserver"])
class PagoTests(TestCase):
    def setUp(self):
        self.client = cliente_autenticado()

        # Los PDF de prueba se generan dentro de BASE_DIR (para que ruta_relativa funcione) y se borran al final.
        self.directorio_pdfs = Path(settings.BASE_DIR) / "downloads" / "pdfs_test"
        patcher = patch("core.pdf_service.DIRECTORIO_PDFS", self.directorio_pdfs)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.addCleanup(shutil.rmtree, self.directorio_pdfs, True)

        self.credito = Credito.objects.create(id=9200001, rut_deudor="44.444.444-4", nombre_deudor="Cliente pago")
        self.fila = CRMFila.objects.create(
            credito_id=self.credito,
            fecha_contacto=date(2026, 7, 1),
            fecha_compromiso=date(2026, 7, 15),
            estado=EstadoCRM.COMPROMETIDO,
            situacion=Situacion.PENDIENTE,
            monto=5000000,
        )
        self.cuota_1 = Cuota.objects.create(
            credito_id=self.credito, estado=CuotaEstado.VENCIDA, fecha=date(2026, 5, 20),
            monto=3000000, crm_fila_id=self.fila,
        )
        self.cuota_2 = Cuota.objects.create(
            credito_id=self.credito, estado=CuotaEstado.VENCIDA, fecha=date(2026, 6, 20),
            monto=2000000, crm_fila_id=self.fila,
        )

    def test_pdf_tiene_una_pagina_por_imagen(self):
        pdf_path = PdfService().generar_pdf_desde_comprobantes(
            [imagen_subida("t1.png"), imagen_subida("t2.png")], self.credito.id,
        )

        self.assertTrue(pdf_path.read_bytes().startswith(b"%PDF"))
        self.assertEqual(len(PdfReader(pdf_path).pages), 2)

    def test_un_unico_pdf_se_guarda_sin_modificar(self):
        original = pdf_subido("comprobante.pdf", paginas=2)
        esperado = original.read()
        original.seek(0)

        pdf_path = PdfService().generar_pdf_desde_comprobantes([original], self.credito.id)

        self.assertEqual(pdf_path.read_bytes(), esperado)

    def test_pdf_conserva_las_paginas_de_un_comprobante_ya_en_pdf(self):
        pdf_path = PdfService().generar_pdf_desde_comprobantes(
            [imagen_subida("t1.png"), pdf_subido("comprobante.pdf", paginas=2)], self.credito.id,
        )

        self.assertEqual(len(PdfReader(pdf_path).pages), 3)

    def test_registrar_guarda_detalle_e_imputa_por_antiguedad(self):
        pago = Pago.objects.registrar(self.fila, "downloads/pdfs/demo.pdf", respuesta_pago([4000000, 1000000]))

        self.assertEqual(pago.monto_total, 5000000)
        self.assertEqual(pago.cantidad_transferencias, 2)
        self.assertEqual(
            list(PagoTransferencia.objects.filter(pago_id=pago).values_list("orden", "monto")),
            [(1, 4000000), (2, 1000000)],
        )
        imputado = dict(PagoCuota.objects.filter(pago_id=pago).values_list("cuota_id", "monto_imputado"))
        self.assertEqual(imputado, {self.cuota_1.id: 3000000, self.cuota_2.id: 2000000})

        self.fila.refresh_from_db()
        self.assertEqual(self.fila.fecha_pago, date(2026, 7, 10))

    def test_segundo_pago_imputa_solo_el_saldo_pendiente(self):
        primero = Pago.objects.registrar(self.fila, "downloads/pdfs/demo1.pdf", respuesta_pago([4000000]))
        # Simula que el mandante aprobo el primer abono y el compromiso parcial
        # quedo disponible para recibir un nuevo pago.
        primero.estado = PagoEstado.APROBADO
        primero.save(update_fields=["estado"])
        self.fila.situacion = Situacion.PENDIENTE
        self.fila.save(update_fields=["situacion"])

        segundo = Pago.objects.registrar(self.fila, "downloads/pdfs/demo2.pdf", respuesta_pago([1000000]))

        self.assertEqual(
            dict(PagoCuota.objects.filter(pago_id=segundo).values_list("cuota_id", "monto_imputado")),
            {self.cuota_2.id: 1000000},
        )
        total_cuota_2 = sum(PagoCuota.objects.filter(cuota_id=self.cuota_2).values_list("monto_imputado", flat=True))
        self.assertEqual(total_cuota_2, 2000000)

    def test_registrar_revalida_una_fila_desactualizada_antes_de_crear(self):
        fila_desactualizada = CRMFila.objects.get(pk=self.fila.pk)
        CRMFila.objects.filter(pk=self.fila.pk).update(situacion=Situacion.ENVIADO)

        with self.assertRaisesMessage(ValueError, "El pago ya fue enviado"):
            Pago.objects.registrar(
                fila_desactualizada,
                "downloads/pdfs/demo.pdf",
                respuesta_pago([5000000]),
            )

        self.assertEqual(Pago.objects.count(), 0)

    def analizar(self, montos: list[int], credito=None):
        """POST al endpoint de analisis con DocumentAI y OpenAI mockeados; deja los mocks en self.mocks."""
        with (
            patch("core.pago_service.DocumentAIService") as docai,
            patch("core.pago_service.OpenAiCantidadPagosService") as cantidad_service,
            patch("core.pago_service.OpenAiPagoService") as detalle_service,
        ):
            docai.return_value.procesar.return_value = "texto ocr de los comprobantes"
            cantidad_service.return_value.obtener_cantidad_pagos.return_value = CantidadTransferenciasResponse(
                cantidad=len(montos), evidencia="montos transferidos"
            )
            detalle_service.return_value.obtener_pago.return_value = respuesta_pago(montos)
            self.mocks = (docai, cantidad_service, detalle_service)

            return self.client.post(
                f"/api/cartera/{(credito or self.credito).id}/pago/analizar/",
                {"imagenes": [imagen_subida("t1.png"), imagen_subida("t2.jpg", "JPEG")]},
                format="multipart",
            )

    @staticmethod
    def cuerpo_confirmacion(analisis: dict) -> dict:
        """Lo que manda el front al confirmar: el analisis tal cual, con los campos editables de Flokzu."""
        return {
            "pdf_path": analisis["pdf_path"],
            "fecha_pago": analisis["fecha_pago"],
            "cuenta_destino": analisis["cuenta_destino"],
            "cuentas_distintas": analisis["cuentas_distintas"],
            "transferencias": analisis["transferencias"],
            "tipo_pago": analisis["flokzu"]["tipo_pago"],
            "monto_ceco": analisis["flokzu"]["monto_ceco"],
            "monto_saf": analisis["flokzu"]["monto_saf"],
        }

    def test_analizar_devuelve_la_cuadratura_y_no_escribe_en_la_bd(self):
        response = self.analizar([4000000, 1000000])

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["monto_total"], 5000000)
        self.assertEqual(payload["monto_comprometido"], 5000000)
        self.assertEqual(payload["cantidad_transferencias"], 2)
        self.assertEqual([t["monto"] for t in payload["transferencias"]], [4000000, 1000000])
        self.assertEqual([i["monto_imputado"] for i in payload["imputaciones"]], [3000000, 2000000])
        self.assertEqual([i["saldo"] for i in payload["imputaciones"]], [0, 0])

        # Los cuatro compromisos cuadran: monto exacto, en fecha, cubre el compromiso y cuenta unica.
        self.assertEqual([c["tono"] for c in payload["cuadratura"]["checks"]], ["ok"] * 4)
        self.assertEqual(payload["cuadratura"]["saldo_a_favor"], 0)

        # Nada tocó la base: el pago se guarda recién al confirmar el envío.
        self.assertEqual(Pago.objects.count(), 0)
        self.assertEqual(PagoTransferencia.objects.count(), 0)
        self.assertEqual(PagoCuota.objects.count(), 0)

        # El PDF se generó una sola vez y quedó en disco a la espera de la confirmación.
        self.assertTrue(payload["pdf_path"].startswith("downloads/pdfs_test/"))
        self.assertTrue((Path(settings.BASE_DIR) / payload["pdf_path"]).exists())
        _, cantidad_service, detalle_service = self.mocks
        self.assertEqual(cantidad_service.return_value.obtener_cantidad_pagos.call_count, 1)
        detalle_service.return_value.obtener_pago.assert_called_once_with("texto ocr de los comprobantes", 2)

    def test_analizar_propone_el_formulario_de_flokzu(self):
        flokzu = self.analizar([4000000, 1000000]).json()["flokzu"]

        self.assertEqual(flokzu["tipo_solicitud"], "Recupero de castigo")
        self.assertEqual(flokzu["empresa"], "TSF")
        self.assertEqual(flokzu["empresa_cobranza"], "PHOENIX")
        self.assertEqual(flokzu["id_credito"], self.credito.id)
        self.assertEqual(flokzu["rut_transfiere"], self.credito.rut_deudor)
        self.assertEqual(flokzu["monto_pago"], 5000000)
        self.assertEqual(flokzu["cantidad_movimientos"], 2)
        # El pago salda las dos cuotas vencidas del crédito.
        self.assertEqual(flokzu["tipo_pago"], TipoPagoFlokzu.PAGO_TOTAL)
        self.assertEqual((flokzu["monto_ceco"], flokzu["monto_saf"]), (0, 0))
        # La cuenta del comprobante no está en el listado de Flokzu: queda vacía para que el ejecutivo elija.
        self.assertIsNone(flokzu["cuenta"])

    def test_flokzu_marca_saf_si_paga_de_mas_y_ceco_si_paga_de_menos(self):
        de_mas = self.analizar([5200000]).json()["flokzu"]
        self.assertEqual((de_mas["monto_saf"], de_mas["monto_ceco"]), (200000, 0))

        de_menos = self.analizar([4700000]).json()["flokzu"]
        self.assertEqual((de_menos["monto_saf"], de_menos["monto_ceco"]), (0, 300000))

    def test_tipo_pago_es_put_en_cuotas_si_queda_una_vencida_con_saldo(self):
        payload = self.analizar([3000000]).json()

        self.assertEqual(payload["flokzu"]["tipo_pago"], TipoPagoFlokzu.PUT_CUOTAS)
        self.assertEqual([i["saldo"] for i in payload["imputaciones"]], [0, 2000000])

    def test_confirmar_persiste_el_pago_con_estado_pendiente(self):
        analisis = self.analizar([4000000, 1000000]).json()

        response = self.client.post(
            f"/api/cartera/{self.credito.id}/pago/", self.cuerpo_confirmacion(analisis), format="json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["estado"], PagoEstado.PENDIENTE)
        self.assertEqual(payload["monto_total"], 5000000)
        self.assertEqual(payload["tipo_pago"], TipoPagoFlokzu.PAGO_TOTAL)

        pago = Pago.objects.get(id=payload["id"])
        self.assertEqual(pago.pdf_path, analisis["pdf_path"])
        self.assertEqual(
            list(PagoTransferencia.objects.filter(pago_id=pago).values_list("orden", "monto")),
            [(1, 4000000), (2, 1000000)],
        )
        self.assertEqual(
            dict(PagoCuota.objects.filter(pago_id=pago).values_list("cuota_id", "monto_imputado")),
            {self.cuota_1.id: 3000000, self.cuota_2.id: 2000000},
        )
        self.fila.refresh_from_db()
        self.assertEqual(self.fila.fecha_pago, date(2026, 7, 10))

    def test_confirmar_deja_el_compromiso_enviado_al_mandante(self):
        analisis = self.analizar([5000000]).json()

        self.client.post(f"/api/cartera/{self.credito.id}/pago/", self.cuerpo_confirmacion(analisis), format="json")

        self.fila.refresh_from_db()
        self.assertEqual(self.fila.situacion, Situacion.ENVIADO)

    def test_no_se_puede_enviar_dos_veces_el_mismo_compromiso(self):
        analisis = self.analizar([5000000]).json()
        cuerpo = self.cuerpo_confirmacion(analisis)
        self.client.post(f"/api/cartera/{self.credito.id}/pago/", cuerpo, format="json")

        # Reenviar duplicaria la imputacion sobre las mismas cuotas.
        repetido = self.client.post(f"/api/cartera/{self.credito.id}/pago/", cuerpo, format="json")
        self.assertEqual(repetido.status_code, 400)
        self.assertEqual(Pago.objects.count(), 1)

        # Y tampoco deja volver a analizar comprobantes mientras el mandante no responda.
        self.assertEqual(self.analizar([5000000]).status_code, 400)

    def test_listado_de_pagos_devuelve_credito_rut_y_estado(self):
        self.assertEqual(self.client.get("/api/pagos/").json(), [])

        analisis = self.analizar([4000000, 1000000]).json()
        self.client.post(f"/api/cartera/{self.credito.id}/pago/", self.cuerpo_confirmacion(analisis), format="json")

        payload = self.client.get("/api/pagos/").json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["credito_id"], self.credito.id)
        self.assertEqual(payload[0]["rut"], self.credito.rut_deudor)
        self.assertEqual(payload[0]["cliente"], self.credito.nombre_deudor)
        self.assertEqual(payload[0]["monto_total"], 5000000)
        self.assertEqual(payload[0]["estado"], PagoEstado.PENDIENTE)
        self.assertEqual(payload[0]["fecha_pago"], "2026-07-10")

    def test_confirmar_rechaza_un_pdf_fuera_del_directorio_de_comprobantes(self):
        analisis = self.analizar([5000000]).json()
        cuerpo = self.cuerpo_confirmacion(analisis) | {"pdf_path": "../../etc/passwd"}

        response = self.client.post(f"/api/cartera/{self.credito.id}/pago/", cuerpo, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Pago.objects.count(), 0)

    def test_endpoint_entrega_el_pdf_de_los_comprobantes(self):
        analisis = self.analizar([5000000]).json()

        response = self.client.get(f"/api/cartera/{self.credito.id}/comprobante/?archivo={analisis['pdf_path']}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertTrue(b"".join(response.streaming_content).startswith(b"%PDF"))

    def test_endpoint_no_entrega_comprobantes_de_otro_credito_ni_rutas_arbitrarias(self):
        analisis = self.analizar([5000000]).json()
        otro = Credito.objects.create(id=9200003, rut_deudor="66.666.666-6", nombre_deudor="Otro deudor")

        ajeno = self.client.get(f"/api/cartera/{otro.id}/comprobante/?archivo={analisis['pdf_path']}")
        self.assertEqual(ajeno.status_code, 400)

        fuera = self.client.get(f"/api/cartera/{self.credito.id}/comprobante/?archivo=../../etc/passwd")
        self.assertEqual(fuera.status_code, 400)

    def test_cuenta_flokzu_solo_acepta_las_cuentas_del_listado(self):
        self.assertEqual(FlokzuService.cuenta_flokzu("Cuenta Corriente 918.859.463"), "918859463-Upago Cuotas TSF")
        # Santander rellena la cuenta con ceros a la izquierda; es la misma cuenta del listado.
        self.assertEqual(FlokzuService.cuenta_flokzu("001130002250"), "1130002250-Cobranza")
        self.assertIsNone(FlokzuService.cuenta_flokzu("12345678"))
        self.assertIsNone(FlokzuService.cuenta_flokzu(""))
        self.assertIsNone(FlokzuService.cuenta_flokzu(None))

    def test_endpoint_rechaza_archivo_que_no_es_png_ni_jpg(self):
        response = self.client.post(
            f"/api/cartera/{self.credito.id}/pago/analizar/",
            {"imagenes": [imagen_subida("t1.gif", "GIF")]},
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)

    def test_endpoint_rechaza_credito_sin_compromiso(self):
        otro = Credito.objects.create(id=9200002, rut_deudor="55.555.555-5", nombre_deudor="Sin compromiso")

        response = self.client.post(
            f"/api/cartera/{otro.id}/pago/analizar/",
            {"imagenes": [imagen_subida("t1.png")]},
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)

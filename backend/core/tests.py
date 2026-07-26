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

from .choices import CanalContacto, CuotaEstado, EstadoCRM, Situacion, TipoPago
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

    def test_compromiso_rechaza_cuota_de_otro_credito_o_vigente(self):
        self.client.post(f"/api/cartera/{self.credito.id}/contacto/", {"fecha_contacto": date.today().isoformat()})

        response = self.client.post(
            f"/api/cartera/{self.credito.id}/compromiso/",
            {
                "fecha_compromiso": date.today().isoformat(),
                "canal_contacto": CanalContacto.TELEFONO,
                "monto": 100000,
                "cuota_ids": [self.cuota_otro_credito.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

        response = self.client.post(
            f"/api/cartera/{self.credito.id}/compromiso/",
            {
                "fecha_compromiso": date.today().isoformat(),
                "canal_contacto": CanalContacto.TELEFONO,
                "monto": 100000,
                "cuota_ids": [self.vigente.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

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
        Pago.objects.registrar(self.fila, "downloads/pdfs/demo1.pdf", respuesta_pago([4000000]))
        segundo = Pago.objects.registrar(self.fila, "downloads/pdfs/demo2.pdf", respuesta_pago([1000000]))

        self.assertEqual(
            dict(PagoCuota.objects.filter(pago_id=segundo).values_list("cuota_id", "monto_imputado")),
            {self.cuota_2.id: 1000000},
        )
        total_cuota_2 = sum(PagoCuota.objects.filter(cuota_id=self.cuota_2).values_list("monto_imputado", flat=True))
        self.assertEqual(total_cuota_2, 2000000)

    @patch("core.pago_service.OpenAiPagoService")
    @patch("core.pago_service.OpenAiCantidadPagosService")
    @patch("core.pago_service.DocumentAIService")
    def test_endpoint_carga_comprobantes(self, docai, cantidad_service, pago_service):
        docai.return_value.procesar.return_value = "texto ocr de dos comprobantes"
        cantidad_service.return_value.obtener_cantidad_pagos.return_value = CantidadTransferenciasResponse(
            cantidad=2, evidencia="dos montos transferidos"
        )
        pago_service.return_value.obtener_pago.return_value = respuesta_pago([4000000, 1000000])

        response = self.client.post(
            f"/api/cartera/{self.credito.id}/pago/",
            {"imagenes": [imagen_subida("t1.png"), imagen_subida("t2.jpg", "JPEG")]},
            format="multipart",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["monto_total"], 5000000)
        self.assertEqual(payload["monto_comprometido"], 5000000)
        self.assertEqual(payload["cantidad_transferencias"], 2)
        self.assertEqual([t["monto"] for t in payload["transferencias"]], [4000000, 1000000])
        self.assertEqual([i["monto_imputado"] for i in payload["imputaciones"]], [3000000, 2000000])

        # El PDF se generó una sola vez y quedó referenciado en la fila de pago.
        self.assertTrue(payload["pdf_path"].startswith("downloads/pdfs_test/"))
        self.assertTrue((Path(settings.BASE_DIR) / payload["pdf_path"]).exists())
        self.assertEqual(cantidad_service.return_value.obtener_cantidad_pagos.call_count, 1)
        pago_service.return_value.obtener_pago.assert_called_once_with("texto ocr de dos comprobantes", 2)

    def test_endpoint_rechaza_archivo_que_no_es_png_ni_jpg(self):
        response = self.client.post(
            f"/api/cartera/{self.credito.id}/pago/",
            {"imagenes": [imagen_subida("t1.gif", "GIF")]},
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)

    def test_endpoint_rechaza_credito_sin_compromiso(self):
        otro = Credito.objects.create(id=9200002, rut_deudor="55.555.555-5", nombre_deudor="Sin compromiso")

        response = self.client.post(
            f"/api/cartera/{otro.id}/pago/",
            {"imagenes": [imagen_subida("t1.png")]},
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)

from datetime import date

from django.core import mail
from django.db import IntegrityError
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .choices import CanalContacto, CuotaEstado, EstadoCRM, Situacion, TipoPago
from .models import CRMFila, Credito, Cuota


@override_settings(ALLOWED_HOSTS=["testserver"])
class CarteraApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
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
        self.client = APIClient()
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

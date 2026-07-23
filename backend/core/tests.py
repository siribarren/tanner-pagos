from datetime import date

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

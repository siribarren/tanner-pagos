from datetime import date

from django.core.management.base import BaseCommand
from django.core.management.color import no_style
from django.db import connection, transaction

from core.choices import CanalContacto, CuotaEstado, EstadoCRM, Situacion, TipoPago
from core.management.commands.seed_demo_data import correo_desde_nombre
from core.models import CRMFila, Credito, Cuota

# Un caso por comprobante real de backend/docs: el compromiso y sus cuotas se arman con
# el monto que efectivamente aparece en el documento, para poder validar el pago end-to-end.
CASOS = {
    1375790: {
        "rut_deudor": "13.757.900-5",
        "nombre_deudor": "Jose Poblete Munoz",
        "fecha_contacto": date(2026, 6, 20),
        "fecha_compromiso": date(2026, 6, 27),
        "cuotas": [(date(2026, 6, 5), 260890)],
        "comprometidas": 1,
        "archivos": ["1375790 - JOSE POBLETE[58].pdf"],
        "nota": "Pago exacto. El archivo [97].pdf es el MISMO comprobante: subir ambos simula el duplicado.",
    },
    2000666: {
        "rut_deudor": "20.006.660-1",
        "nombre_deudor": "Ivonne Fajardo Rojas",
        "fecha_contacto": date(2026, 6, 10),
        "fecha_compromiso": date(2026, 6, 17),
        "cuotas": [(date(2026, 4, 20), 492096), (date(2026, 5, 20), 492096), (date(2026, 6, 20), 492096)],
        "comprometidas": 3,
        "archivos": ["2000666 03 CUOTAS 1.476.288.pdf"],
        "nota": "3 transferencias de $492.096 en un solo documento: cubren las 3 cuotas comprometidas.",
    },
    2374982: {
        "rut_deudor": "23.749.820-4",
        "nombre_deudor": "Marcia Cartes Leiva",
        "fecha_contacto": date(2026, 6, 8),
        "fecha_compromiso": date(2026, 6, 16),
        "cuotas": [(date(2026, 5, 15), 1250000), (date(2026, 6, 15), 1250000)],
        "comprometidas": 2,
        "archivos": ["2374982 - MARCIA CARTES.pdf"],
        "nota": "Collage de 3 comprobantes distintos: caso ruidoso, esperado que salga con observacion.",
    },
    3447277: {
        "rut_deudor": "13.447.277-9",
        "nombre_deudor": "Sandra Contreras Munoz",
        "fecha_contacto": date(2026, 6, 5),
        "fecha_compromiso": date(2026, 6, 12),
        "cuotas": [(date(2026, 6, 1), 381378)],
        "comprometidas": 1,
        "archivos": ["3447277 - SANDRA CONTRERAS.pdf"],
        "nota": "Pago exacto. La cuenta de abono viene con guiones (00-113-00022-50).",
    },
    1461826: {
        "rut_deudor": "14.618.260-7",
        "nombre_deudor": "Hector Alvarez Pino",
        "fecha_contacto": date(2026, 6, 9),
        "fecha_compromiso": date(2026, 6, 15),
        "cuotas": [(date(2026, 5, 30), 2043000)],
        "comprometidas": 1,
        "archivos": ["20260615_1461826.jpg"],
        "nota": "Deposito en efectivo por caja (Scotiabank), no transferencia: foto del voucher.",
    },
    1651569: {
        "rut_deudor": "16.515.690-2",
        "nombre_deudor": "Maria Luisa Sanhueza Seguel",
        "fecha_contacto": date(2026, 6, 12),
        "fecha_compromiso": date(2026, 6, 19),
        "cuotas": [(date(2026, 5, 19), 167000), (date(2026, 6, 19), 167000)],
        "comprometidas": 2,
        "archivos": ["20260619_1651569.png"],
        "nota": "Comprometio 2 cuotas ($334.000) y solo transfirio $167.000: pago parcial.",
    },
}


class Command(BaseCommand):
    help = "Carga creditos, compromisos y cuotas que calzan con los comprobantes reales de backend/docs."

    @transaction.atomic
    def handle(self, *args, **options):
        for credito_id, caso in CASOS.items():
            credito, _ = Credito.objects.update_or_create(
                id=credito_id,
                defaults={
                    "rut_deudor": caso["rut_deudor"],
                    "nombre_deudor": caso["nombre_deudor"],
                    "correo_deudor": correo_desde_nombre(caso["nombre_deudor"], credito_id),
                },
            )

            comprometidas = caso["comprometidas"]
            monto = sum(monto for _, monto in caso["cuotas"][:comprometidas])

            fila, _ = CRMFila.objects.update_or_create(
                id=credito_id,
                defaults={
                    "credito_id": credito,
                    "fecha_contacto": caso["fecha_contacto"],
                    "fecha_compromiso": caso["fecha_compromiso"],
                    "fecha_pago": None,
                    "canal_contacto": CanalContacto.TELEFONO,
                    "estado": EstadoCRM.COMPROMETIDO,
                    "pago": TipoPago.TOTAL if comprometidas == len(caso["cuotas"]) else TipoPago.PARCIAL,
                    "situacion": Situacion.PENDIENTE,
                    "monto": monto,
                },
            )

            cuota_ids = []
            for indice, (fecha, monto_cuota) in enumerate(caso["cuotas"]):
                cuota, _ = Cuota.objects.update_or_create(
                    id=credito_id * 10 + indice + 1,
                    defaults={
                        "credito_id": credito,
                        "estado": CuotaEstado.VENCIDA,
                        "fecha": fecha,
                        "monto": monto_cuota,
                    },
                )
                cuota_ids.append(cuota.id)

            Cuota.objects.filter(credito_id=credito).update(crm_fila_id=None)
            Cuota.objects.vincular_a_compromiso(cuota_ids[:comprometidas], fila)

            self.stdout.write(
                f"{credito_id} | {caso['nombre_deudor']:<30} | comprometido ${monto:,} en {comprometidas} cuota(s) "
                f"| {', '.join(caso['archivos'])}"
            )

        sequence_sql = connection.ops.sequence_reset_sql(no_style(), [Credito, CRMFila, Cuota])
        with connection.cursor() as cursor:
            for sql in sequence_sql:
                cursor.execute(sql)

        self.stdout.write(self.style.SUCCESS(f"Casos de prueba cargados: {len(CASOS)}."))

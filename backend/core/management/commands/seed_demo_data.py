from datetime import date
import re
import unicodedata

from django.core.management.color import no_style
from django.core.management.base import BaseCommand
from django.db import connection, transaction

from core.choices import CanalContacto, CuotaEstado, EstadoCRM, Situacion, TipoPago
from core.models import CRMFila, Credito, Cuota


CREDITOS = {
    3350049: {
        "rut_deudor": "15.221.775-7",
        "nombre_deudor": "Pamela González Álvarez",
        "crm": {
            "fecha_contacto": date(2026, 7, 1),
            "fecha_compromiso": date(2026, 7, 15),
            "fecha_pago": None,
            "canal_contacto": CanalContacto.TELEFONO,
            "estado": EstadoCRM.COMPROMETIDO,
            "pago": TipoPago.PARCIAL,
            "situacion": Situacion.PENDIENTE,
        },
        "cuotas": (4, 813058, 2),
    },
    3287612: {
        "rut_deudor": "12.344.892-3",
        "nombre_deudor": "Rodrigo Soto Fuentes",
        "crm": {
            "fecha_contacto": date(2026, 6, 28),
            "fecha_compromiso": date(2026, 7, 12),
            "fecha_pago": date(2026, 7, 13),
            "canal_contacto": CanalContacto.TELEFONO,
            "estado": EstadoCRM.COMPROMETIDO,
            "pago": TipoPago.PARCIAL,
            "situacion": Situacion.VALIDADO,
        },
        "cuotas": (3, 879514, 1),
    },
    2941087: {
        "rut_deudor": "9.876.543-2",
        "nombre_deudor": "Claudia Reyes Mora",
        "crm": {
            "fecha_contacto": date(2026, 7, 2),
            "fecha_compromiso": date(2026, 7, 18),
            "fecha_pago": None,
            "canal_contacto": CanalContacto.TELEFONO,
            "estado": EstadoCRM.COMPROMETIDO,
            "pago": TipoPago.TOTAL,
            "situacion": Situacion.PENDIENTE,
        },
        "cuotas": (6, 785671, 6),
    },
    3102456: {
        "rut_deudor": "17.654.321-K",
        "nombre_deudor": "Jorge Espinoza Torres",
        "crm": {
            "fecha_contacto": date(2026, 6, 25),
            "fecha_compromiso": None,
            "fecha_pago": None,
            "canal_contacto": CanalContacto.TELEFONO,
            "estado": EstadoCRM.SIN_COMPROMISO,
            "pago": None,
            "situacion": None,
        },
        "cuotas": (6, 988917, 0),
    },
    2876543: {
        "rut_deudor": "14.876.543-1",
        "nombre_deudor": "Ana Castillo Bravo",
        "crm": {
            "fecha_contacto": None,
            "fecha_compromiso": None,
            "fecha_pago": None,
            "canal_contacto": CanalContacto.TELEFONO,
            "estado": EstadoCRM.SIN_COMPROMISO,
            "pago": None,
            "situacion": None,
        },
        "cuotas": (4, 623259, 0),
    },
    2198734: {
        "rut_deudor": "20.123.456-7",
        "nombre_deudor": "Patricio Vargas Leiva",
        "crm": {
            "fecha_contacto": date(2026, 7, 14),
            "fecha_compromiso": None,
            "fecha_pago": None,
            "canal_contacto": CanalContacto.TELEFONO,
            "estado": EstadoCRM.SIN_COMPROMISO,
            "pago": None,
            "situacion": None,
        },
        "cuotas": (3, 1400950, 0),
    },
    3876209: {
        "rut_deudor": "16.987.654-3",
        "nombre_deudor": "Francisca Ibáñez Rojas",
        "crm": {
            "fecha_contacto": None,
            "fecha_compromiso": None,
            "fecha_pago": None,
            "canal_contacto": CanalContacto.TELEFONO,
            "estado": EstadoCRM.SIN_COMPROMISO,
            "pago": None,
            "situacion": None,
        },
        "cuotas": (4, 775000, 0),
    },
}


def correo_desde_nombre(nombre, credito_id):
    nombre_normalizado = unicodedata.normalize("NFKD", nombre)
    nombre_normalizado = "".join(
        caracter
        for caracter in nombre_normalizado
        if not unicodedata.combining(caracter)
    ).lower()
    nombre_normalizado = re.sub(r"[^a-z0-9]+", ".", nombre_normalizado).strip(".")
    identificador = nombre_normalizado or f"deudor{credito_id}"
    return f"{identificador}@gmail.com"


class Command(BaseCommand):
    help = "Carga datos demo deterministas para la cartera de pagos."

    @transaction.atomic
    def handle(self, *args, **options):
        cuotas_creadas = 0

        for credito_id, data in CREDITOS.items():
            credito, _ = Credito.objects.update_or_create(
                id=credito_id,
                defaults={
                    "rut_deudor": data["rut_deudor"],
                    "nombre_deudor": data["nombre_deudor"],
                    "correo_deudor": correo_desde_nombre(data["nombre_deudor"], credito_id),
                },
            )

            count, amount, comprometidas = data["cuotas"]
            monto_comprometido = comprometidas * amount if comprometidas else None

            fila, _ = CRMFila.objects.update_or_create(
                id=credito_id,
                defaults={
                    "credito_id": credito,
                    "monto": monto_comprometido,
                    **data["crm"],
                },
            )

            cuota_ids = []
            for index in range(count):
                cuota, _ = Cuota.objects.update_or_create(
                    id=credito_id * 10 + index + 1,
                    defaults={
                        "credito_id": credito,
                        "estado": CuotaEstado.VENCIDA,
                        "fecha": date(2026, index + 1, 20),
                        "monto": amount,
                    },
                )
                cuota_ids.append(cuota.id)
                cuotas_creadas += 1

            Cuota.objects.filter(credito_id=credito).update(crm_fila_id=None)
            if comprometidas:
                Cuota.objects.vincular_a_compromiso(cuota_ids[:comprometidas], fila)

        sequence_sql = connection.ops.sequence_reset_sql(
            no_style(),
            [Credito, CRMFila, Cuota],
        )
        with connection.cursor() as cursor:
            for sql in sequence_sql:
                cursor.execute(sql)

        self.stdout.write(
            self.style.SUCCESS(
                f"Datos demo cargados: {len(CREDITOS)} créditos y {cuotas_creadas} cuotas."
            )
        )

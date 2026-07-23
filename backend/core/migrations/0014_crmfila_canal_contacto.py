from django.db import migrations, models


def prellenar_canal_contacto(apps, schema_editor):
    CRMFila = apps.get_model("core", "CRMFila")
    CRMFila.objects.all().update(canal_contacto="telefono")


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0013_alter_credito_table_alter_crmfila_table_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="crmfila",
            name="canal_contacto",
            field=models.CharField(
                choices=[
                    ("telefono", "Teléfono"),
                    ("whatsapp", "WhatsApp"),
                    ("presencial", "Presencial"),
                ],
                default="telefono",
                max_length=20,
            ),
        ),
        migrations.RunPython(
            prellenar_canal_contacto,
            migrations.RunPython.noop,
        ),
        migrations.AddConstraint(
            model_name="crmfila",
            constraint=models.CheckConstraint(
                condition=models.Q(
                    canal_contacto__in=["telefono", "whatsapp", "presencial"]
                ),
                name="crm_fila_canal_contacto_valid",
            ),
        ),
    ]

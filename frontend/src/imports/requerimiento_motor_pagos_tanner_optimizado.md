# Requerimiento Funcional Completo – Motor Optimizado de Pagos Tanner

## 1. Propósito del documento

Este documento describe el flujo óptimo para construir un motor de gestión, reliquidación y cuadratura de pagos para Tanner, considerando el caso general y los casos excepcionales donde actualmente se concentran la mayor cantidad de errores operativos.

El objetivo final no es digitalizar el flujo actual de Excel + Flokzu, sino construir un **motor de pagos** capaz de gestionar acuerdos comerciales, eventos reales de pago, reliquidaciones por fecha efectiva, pagos parciales, pagos en múltiples fechas, saldos a favor, tolerancias y excepciones.

La plataforma debe reducir la intervención manual del ejecutivo, eliminar la dependencia operativa de Excel, disminuir rechazos por Recaudaciones y dejar trazabilidad completa de cada decisión de negocio.

---

## 2. Contexto operativo actual

El flujo actual funciona de la siguiente forma:

1. El ejecutivo contacta telefónicamente al cliente.
2. El ejecutivo informa al cliente que mantiene una deuda.
3. El ejecutivo consulta Mónaco para obtener el detalle puntual de la deuda a la fecha de consulta.
4. Mónaco entrega, por crédito y cuota, información como fecha de vencimiento, capital, interés, interés mora, gastos de cobranza, monto cuota, monto a pagar, saldo insoluto y estado.
5. El ejecutivo negocia con el cliente una fecha de transferencia.
6. El cliente transfiere el monto acordado.
7. El ejecutivo recibe el comprobante.
8. El ejecutivo valida manualmente que el monto transferido corresponda al valor comprometido.
9. El ejecutivo llena una planilla Excel con el detalle del pago.
10. El ejecutivo completa un formulario en Flokzu.
11. El ejecutivo adjunta Excel y comprobante.
12. El pago queda disponible para revisión y aplicación posterior.

El flujo presenta mayor complejidad cuando el cliente paga fuera de fecha, paga parcialmente, paga en más de una transferencia o paga un monto que no permite cuadrar contra el acuerdo original.

---

## 3. Sistemas actuales y responsabilidad de cada uno

### 3.1. Mónaco

Mónaco entrega la fotografía puntual de la deuda al momento de la consulta. Su función principal dentro del proceso es entregar la información base para negociar con el cliente.

Mónaco informa, entre otros datos:

- ID crédito.
- RUT.
- Nombre del cliente.
- Número de cuota.
- Fecha de vencimiento.
- Capital.
- Interés.
- Interés mora.
- Gastos de cobranza.
- Monto cuota.
- Monto a pagar.
- Monto pagado.
- Saldo insoluto.
- Estado de la cuota.

Mónaco responde principalmente a la pregunta:

> ¿Cuál es la deuda del cliente al momento de la consulta?

### 3.2. Simulador Tanner

El simulador responde a una necesidad distinta. Se utiliza cuando el cliente paga en una fecha distinta a la comprometida o cuando paga un monto distinto al acuerdo original.

El simulador responde a preguntas como:

> El cliente pagó hoy, en una fecha distinta a la comprometida. ¿Cómo queda detallada esa cuota en capital, interés, interés mora y gastos?

También debe cubrir casos como:

> El cliente comprometió una cuota o varias cuotas, pero pagó un 40% en una fecha y un 60% en otra. ¿Cómo queda detallada la cuota o el grupo de cuotas después de esos eventos reales de pago?

En la nueva plataforma, el simulador debe ser tratado como un **servicio de reliquidación**. El ejecutivo no debería operarlo manualmente.

### 3.3. Excel

Excel opera hoy como una capa manual de cálculo, registro, ajuste y cuadratura. Es una de las principales fuentes de error y debe ser reemplazado por una entidad sistémica llamada **Liquidación de Pago**.

### 3.4. Flokzu

Flokzu opera como plataforma BPM para enviar el formulario y los respaldos. En el nuevo diseño, Flokzu puede mantenerse como destino de workflow o integrarse como sistema posterior, pero no debe contener la lógica financiera del proceso.

---

## 4. Principio de diseño del nuevo motor

La plataforma debe separar claramente tres conceptos que hoy se mezclan manualmente:

1. **Acuerdo comercial:** lo que el cliente prometió pagar.
2. **Evento de pago:** lo que el cliente realmente transfirió.
3. **Liquidación:** cómo debe imputarse financieramente el pago recibido.

Esta separación es crítica porque el acuerdo es histórico, pero la liquidación depende de la fecha real y del monto real pagado.

---

## 5. Modelo conceptual del proceso

```text
Mónaco
  ↓
Consulta deuda vigente
  ↓
Acuerdo comercial
  ↓
Cliente transfiere
  ↓
Evento de pago
  ↓
OCR / validación comprobante
  ↓
Motor de reliquidación usando simulador
  ↓
Motor de cuadre e imputación
  ↓
Liquidación de pago
  ↓
Workflow / Recaudaciones / Flokzu
```

La unidad de procesamiento del motor no debe ser sólo el acuerdo. Debe ser el **evento de pago**. Cada transferencia recibida debe generar evaluación, reliquidación y actualización del estado del acuerdo.

---

## 6. Objetivos funcionales

La plataforma debe permitir:

1. Consultar deuda y cuotas desde Mónaco.
2. Crear acuerdos comerciales sobre una o más cuotas.
3. Registrar fecha comprometida de pago.
4. Registrar monto comprometido.
5. Recibir comprobantes de transferencia.
6. Extraer datos mediante OCR.
7. Crear eventos de pago por cada transferencia recibida.
8. Reliquidar cuotas usando el simulador según fecha real y monto real pagado.
9. Aplicar pagos a cuotas completas cuando corresponda.
10. Identificar pagos parciales.
11. Identificar pagos fuera de fecha.
12. Identificar pagos en múltiples transferencias.
13. Identificar pagos que no cuadran contra el acuerdo completo.
14. Buscar subconjuntos de cuotas imputables cuando el monto no permita cuadrar contra todas las cuotas comprometidas.
15. Calcular saldo a favor, SAF.
16. Aplicar tolerancia operativa de hasta $10.000 según reglas Tanner.
17. Derivar excepciones a revisión manual.
18. Generar liquidación automática reemplazando Excel.
19. Enviar el caso a Flokzu o Recaudaciones.
20. Mantener auditoría completa.

---

## 7. Actores del proceso

### 7.1. Ejecutivo de cobranza

Responsable de contactar al cliente, consultar deuda, negociar el acuerdo, registrar compromiso y cargar comprobantes cuando corresponda.

### 7.2. Supervisor

Responsable de revisar excepciones, aprobar ajustes, validar casos no cuadrables y resolver ambigüedades.

### 7.3. Recaudaciones Tanner

Responsable de recibir pagos liquidados correctamente para su aplicación final.

### 7.4. Administrador funcional

Responsable de mantener parámetros, reglas, tolerancias, usuarios, empresas, catálogos y estados.

### 7.5. Motor de pagos

Componente sistémico responsable de ejecutar la lógica de reliquidación, cuadre, imputación y generación de liquidaciones.

---

## 8. Flujo óptimo completo

## 8.1. Etapa 1: Consulta de deuda

El ejecutivo ingresa a la plataforma y busca al cliente por RUT, nombre, crédito, operación, teléfono, cartera, campaña o empresa.

La plataforma consulta Mónaco y muestra la deuda vigente por crédito y cuota.

Debe mostrar:

- Cliente.
- RUT.
- ID crédito.
- Operación.
- Número de cuota.
- Fecha de vencimiento.
- Capital.
- Interés.
- Interés mora.
- Gastos de cobranza.
- Monto cuota.
- Monto a pagar.
- Monto pagado.
- Saldo insoluto.
- Estado.
- Fecha de consulta.

Resultado: el ejecutivo cuenta con la información oficial para negociar.

---

## 8.2. Etapa 2: Creación del acuerdo comercial

El ejecutivo selecciona una o más cuotas que el cliente se compromete a pagar.

Debe registrar:

- Cuotas comprometidas.
- Monto total comprometido.
- Fecha compromiso de transferencia.
- Canal de contacto.
- Observación.
- Ejecutivo responsable.
- Empresa o cartera.

El sistema crea un acuerdo inmutable con estado inicial **Pendiente de pago**.

El acuerdo debe guardar la fotografía de Mónaco usada al momento de negociar. Esta fotografía no se modifica, aunque el cliente pague en otra fecha o por otro monto.

---

## 8.3. Etapa 3: Espera del pago

La plataforma mantiene el acuerdo abierto hasta recibir uno o más eventos de pago.

Los estados posibles durante esta etapa son:

- Pendiente de pago.
- Vencido sin pago.
- Pago recibido pendiente de validación.
- Pago parcial recibido.
- Pendiente de segundo pago.

---

## 8.4. Etapa 4: Recepción del comprobante y creación del evento de pago

Cuando el cliente realiza una transferencia, se crea un evento de pago.

El evento puede originarse por:

- Carga manual del comprobante por el ejecutivo.
- OCR sobre imagen o PDF.
- Recepción vía correo.
- Integración bancaria futura.

El evento de pago debe contener:

- ID evento.
- ID acuerdo asociado.
- Fecha real de transferencia.
- Fecha de carga.
- Monto transferido.
- Banco origen.
- Banco destino.
- RUT o nombre del pagador, si está disponible.
- Número de operación o comprobante.
- Archivo comprobante.
- Resultado OCR.
- Nivel de confianza OCR.
- Usuario que cargó el evento.

---

## 8.5. Etapa 5: Validación del comprobante

La plataforma debe validar:

- Que el comprobante sea legible.
- Que exista monto.
- Que exista fecha.
- Que el monto OCR coincida con el monto registrado.
- Que la fecha OCR coincida con la fecha real declarada.
- Que el comprobante no esté duplicado.
- Que el comprobante no haya sido usado en otro acuerdo.

Si falla una validación crítica, el evento pasa a estado **Observado** o **Revisión manual**.

---

## 8.6. Etapa 6: Reliquidación mediante simulador

Por cada evento de pago válido, la plataforma debe invocar el servicio de simulador/reliquidación.

Entradas mínimas:

- ID crédito.
- Cuotas comprometidas.
- Fecha de vencimiento de cada cuota.
- Fecha real del pago.
- Monto real transferido.
- Historial de eventos de pago previos asociados al acuerdo.
- Saldo pendiente del acuerdo, si existe.

Salidas esperadas:

- Cuotas consideradas.
- Capital reliquidado.
- Interés reliquidado.
- Interés mora reliquidado.
- Gastos de cobranza reliquidados.
- Monto total valorizado.
- Diferencia contra monto recibido.
- Saldo pendiente.
- Saldo a favor, si aplica.

El ejecutivo no debe operar manualmente el simulador. La plataforma debe encapsularlo como servicio de negocio.

---

## 8.7. Etapa 7: Motor de cuadre e imputación

El motor debe intentar resolver el evento de pago mediante una secuencia de reglas ordenadas.

### Regla 1: Cuadre contra acuerdo completo

Si el monto recibido permite cubrir todas las cuotas comprometidas, considerando la reliquidación a la fecha real del pago, el acuerdo queda liquidado.

### Regla 2: Cuadre contra acuerdo completo con tolerancia

Si el monto recibido es menor que el monto reliquidado, pero la diferencia está dentro de la tolerancia definida, el pago se acepta y la diferencia queda registrada como ajuste autorizado por regla.

Tolerancia actual: hasta $10.000.

### Regla 3: Pago superior al monto reliquidado

Si el monto recibido excede el monto reliquidado, el excedente se registra como SAF, Saldo a Favor.

### Regla 4: Pago parcial acumulable

Si el monto recibido no cubre el acuerdo completo, el sistema debe registrar el pago como parcial y mantener el acuerdo abierto, siempre que el caso sea consistente con pagos futuros.

### Regla 5: Múltiples eventos de pago

Si existen pagos parciales en distintas fechas, cada evento debe ser reliquidado según su fecha real. Luego el motor debe consolidar el resultado acumulado.

### Regla 6: Imputación por subconjunto de cuotas

Si el cliente comprometió varias cuotas, pero el monto recibido no permite cuadrar el acuerdo completo, el sistema no debe forzar una distribución proporcional sobre todas las cuotas.

El motor debe buscar el mayor subconjunto válido de cuotas completas que pueda ser pagado con el monto recibido.

Ejemplo:

- Acuerdo original: 4 cuotas.
- Monto comprometido: $400.000.
- Pago real recibido: $250.000.

Si no existe forma de cuadrar las 4 cuotas, el motor debe evaluar:

- 1 cuota.
- 2 cuotas.
- 3 cuotas.
- 4 cuotas.

Si 2 cuotas reliquidadas equivalen a $230.000, entonces se aplican 2 cuotas y los $20.000 restantes quedan como SAF.

Resultado:

- 2 cuotas pagadas.
- 2 cuotas pendientes.
- SAF de $20.000.

### Regla 7: Pago de una sola cuota dentro de acuerdo multicuota

Si el cliente comprometió 2 o más cuotas, pero el monto transferido permite pagar sólo una cuota completa, el motor debe aplicar esa cuota, dejar las restantes pendientes y registrar el estado correspondiente.

### Regla 8: No cuadrable

Si el sistema no puede encontrar un acuerdo completo, parcial, subconjunto válido, tolerancia o SAF razonable, el caso se deriva a revisión manual.

---

## 9. Casos de negocio cubiertos

### 9.1. Caso general: pago exacto en fecha comprometida

El cliente compromete pagar $100.000 el día 1 y transfiere $100.000 el día 1.

Resultado esperado:

- Pago validado.
- Liquidación generada.
- Acuerdo cerrado.
- Envío a Recaudaciones.

### 9.2. Pago fuera de fecha

El cliente compromete pagar $100.000 el día 1, pero paga el día 5.

Resultado esperado:

- El evento se liquida con fecha real día 5.
- El simulador recalcula capital, interés, interés mora y gastos.
- El motor compara monto recibido contra monto reliquidado.
- Si la diferencia está dentro de tolerancia, se acepta.
- Si no está dentro de tolerancia, se mantiene saldo pendiente o se deriva a revisión.

### 9.3. Pago en dos transferencias

El cliente compromete $100.000 el día 1. Paga $40.000 el día 5 y $60.000 el día 10.

Resultado esperado:

- Se crean dos eventos de pago.
- Cada evento se liquida según su fecha real.
- El motor consolida ambos eventos.
- El acuerdo se cierra sólo si el total acumulado permite cerrar la deuda, aplicar tolerancia o registrar SAF.

### 9.4. Pago menor dentro de tolerancia

Monto reliquidado: $107.000. Monto transferido: $100.000.

Diferencia: $7.000.

Resultado esperado:

- Se acepta por tolerancia.
- Se registra ajuste por regla.
- Se cierra el acuerdo.

### 9.5. Pago mayor

Monto reliquidado: $100.000. Monto transferido: $110.000.

Resultado esperado:

- Se liquida la deuda.
- Se registra SAF por $10.000.

### 9.6. Pago multicuota no cuadrable contra acuerdo completo

El cliente compromete pagar $400.000 por 4 cuotas, pero transfiere $250.000.

Resultado esperado:

- El motor intenta cuadrar contra las 4 cuotas.
- Si no se puede, evalúa subconjuntos.
- Aplica el mayor número de cuotas completas posible.
- Registra el remanente como SAF si corresponde.
- Deja las cuotas restantes como pendientes.

### 9.7. Pago de una cuota de dos comprometidas

El cliente compromete 2 cuotas, pero paga sólo el valor compatible con una cuota.

Resultado esperado:

- Se aplica una cuota.
- La otra queda pendiente.
- El acuerdo queda parcial o se genera un nuevo saldo pendiente.

---

## 10. Estados del acuerdo

El acuerdo debe manejar estados explícitos:

- Creado.
- Pendiente de pago.
- Vencido sin pago.
- Pago recibido.
- Comprobante observado.
- En reliquidación.
- Liquidado.
- Pago parcial.
- Pendiente de segundo pago.
- Cuotas parcialmente aplicadas.
- Aceptado por tolerancia.
- Con SAF.
- No cuadrable.
- En revisión manual.
- Aprobado por supervisor.
- Rechazado por supervisor.
- Enviado a Flokzu.
- Enviado a Recaudaciones.
- Aplicado.
- Cerrado.

---

## 11. Requerimientos funcionales detallados

### RF-001. Búsqueda de cliente y crédito

La plataforma debe permitir buscar clientes por RUT, nombre, ID crédito, operación, teléfono, correo, cartera, campaña o empresa.

### RF-002. Consulta de deuda Mónaco

La plataforma debe consultar y mostrar la deuda vigente desde Mónaco para el crédito seleccionado.

### RF-003. Selección de cuotas

La plataforma debe permitir seleccionar una o más cuotas para crear un acuerdo.

### RF-004. Creación de acuerdo comercial

La plataforma debe crear un acuerdo con ID único, cuotas comprometidas, monto comprometido, fecha compromiso y fotografía de la deuda Mónaco.

### RF-005. Inmutabilidad del acuerdo

El acuerdo debe conservar la información original de negociación aunque el cliente pague en otra fecha o monto.

### RF-006. Carga de comprobante

La plataforma debe permitir adjuntar imágenes o PDF de comprobantes de transferencia.

### RF-007. OCR de comprobante

La plataforma debe extraer monto, fecha, banco, número de operación y datos disponibles del pagador.

### RF-008. Validación de comprobante

La plataforma debe validar legibilidad, duplicidad, monto, fecha y asociación con acuerdo.

### RF-009. Creación de evento de pago

Cada transferencia debe crear un evento de pago independiente.

### RF-010. Reliquidación automática

Cada evento de pago debe invocar el simulador para calcular el detalle financiero según fecha real y monto real.

### RF-011. Consolidación de eventos

La plataforma debe consolidar múltiples eventos de pago asociados al mismo acuerdo.

### RF-012. Motor de cuadre

La plataforma debe comparar monto recibido, monto comprometido, monto reliquidado y tolerancia.

### RF-013. Tolerancia

La plataforma debe permitir parametrizar la tolerancia de diferencia aceptable. Valor inicial: $10.000.

### RF-014. SAF

La plataforma debe calcular y registrar saldo a favor cuando el monto pagado exceda la liquidación aplicable.

### RF-015. Pago parcial

La plataforma debe detectar pagos parciales y mantener el acuerdo abierto cuando corresponda.

### RF-016. Imputación por subconjunto de cuotas

Cuando el pago no cuadre contra el acuerdo completo, el motor debe buscar el mayor subconjunto de cuotas completas pagables con el monto recibido.

### RF-017. Derivación de excepciones

La plataforma debe derivar a revisión manual los casos no cuadrables o con validaciones fallidas.

### RF-018. Aprobación supervisora

El supervisor debe poder aprobar, rechazar o solicitar corrección de casos excepcionales.

### RF-019. Liquidación automática

La plataforma debe generar una liquidación estructurada que reemplace la planilla Excel.

### RF-020. Envío a Flokzu o Recaudaciones

La plataforma debe enviar la liquidación y respaldos al flujo definido por Tanner.

### RF-021. Auditoría

La plataforma debe registrar cada consulta, carga, cálculo, regla aplicada, aprobación, rechazo y modificación.

### RF-022. Reportería

La plataforma debe mostrar indicadores de acuerdos, pagos, excepciones, SAF, tolerancias aplicadas, pagos parciales, rechazos y tiempos de ciclo.

---

## 12. Pantallas requeridas para prototipo

### 12.1. Login / acceso

Pantalla simple de acceso al sistema con branding Tanner.

### 12.2. Dashboard operativo

Debe mostrar:

- Acuerdos pendientes.
- Pagos recibidos.
- Casos en reliquidación.
- Casos con SAF.
- Casos en revisión.
- Pagos enviados a Recaudaciones.
- Alertas de vencimiento.

### 12.3. Búsqueda de cliente

Debe permitir buscar por RUT, crédito, nombre o cartera. Debe mostrar tabla de créditos y estados.

### 12.4. Detalle de crédito desde Mónaco

Debe mostrar las cuotas en una tabla similar a Mónaco:

- Cuota.
- Fecha vencimiento.
- Capital.
- Interés.
- Interés mora.
- Gastos cobranza.
- Monto a pagar.
- Monto pagado.
- Saldo insoluto.
- Estado.

### 12.5. Crear acuerdo

Debe permitir seleccionar cuotas, mostrar total comprometido, fecha compromiso, canal y observación.

### 12.6. Detalle del acuerdo

Debe mostrar:

- Datos del acuerdo.
- Cuotas comprometidas.
- Estado.
- Timeline.
- Eventos de pago.
- Liquidaciones.
- Documentos.

### 12.7. Carga de comprobante

Debe permitir subir imagen o PDF, mostrar preview y resultado OCR.

### 12.8. Evento de pago

Debe mostrar los datos extraídos y permitir corrección controlada cuando el OCR no alcance confianza mínima.

### 12.9. Reliquidación

Debe mostrar el resultado del simulador:

- Fecha real pago.
- Cuotas consideradas.
- Capital.
- Interés.
- Interés mora.
- Gastos.
- Total valorizado.
- Monto recibido.
- Diferencia.

### 12.10. Motor de cuadre

Debe mostrar la decisión del motor:

- Cuadra acuerdo completo.
- Acepta por tolerancia.
- Genera SAF.
- Pago parcial.
- Imputa subconjunto de cuotas.
- Deriva a revisión.

### 12.11. Bandeja de excepciones

Debe permitir filtrar por:

- No cuadrable.
- OCR observado.
- Diferencia fuera de tolerancia.
- Pago duplicado.
- Pago parcial.
- SAF pendiente de revisión.

### 12.12. Vista supervisor

Debe permitir revisar antecedentes, regla aplicada, simulación, comprobante y aprobar o rechazar.

### 12.13. Liquidación final

Debe reemplazar Excel y mostrar una ficha imprimible/exportable con:

- Cliente.
- Crédito.
- Cuotas liquidadas.
- Eventos de pago.
- Desglose financiero.
- SAF.
- Diferencias.
- Reglas aplicadas.
- Estado final.

### 12.14. Administración de reglas

Debe permitir parametrizar:

- Tolerancia.
- Estados.
- Tipos de excepción.
- Empresas.
- Usuarios.
- Canales.
- Criterios de derivación.

---

## 13. Estructuras JSON sugeridas

### 13.1. acuerdo.json

```json
{
  "agreement_id": "AGR-2026-000123",
  "customer": {
    "rut": "15221775-7",
    "name": "PAMELA ALEJANDRA GONZALEZ ALVAREZ"
  },
  "credit_id": "3350049",
  "created_at": "2026-07-01T10:30:00-04:00",
  "commitment_date": "2026-07-05",
  "committed_amount": 400000,
  "currency": "CLP",
  "status": "PENDING_PAYMENT",
  "source": "MONACO",
  "selected_installments": [10, 11, 12, 13],
  "monaco_snapshot": {
    "valuation_date": "2026-07-01",
    "installments": [
      {
        "installment_number": 10,
        "due_date": "2026-01-20",
        "capital": 997423,
        "interest": 112668,
        "late_interest": 37286,
        "collection_expense": 0,
        "amount_due": 247377,
        "paid_amount": 0,
        "outstanding_balance": 5546296,
        "status": "JUDICIAL"
      }
    ]
  },
  "created_by": {
    "user_id": "USR-001",
    "name": "Ejecutivo Cobranza"
  }
}
```

### 13.2. evento_pago.json

```json
{
  "payment_event_id": "PAY-2026-000456",
  "agreement_id": "AGR-2026-000123",
  "credit_id": "3350049",
  "received_at": "2026-07-05T16:42:00-04:00",
  "payment_date": "2026-07-05",
  "amount": 250000,
  "currency": "CLP",
  "payment_method": "BANK_TRANSFER",
  "voucher": {
    "file_id": "FILE-001",
    "file_name": "comprobante_transferencia.jpg",
    "ocr_status": "PROCESSED",
    "ocr_confidence": 0.92,
    "extracted_fields": {
      "amount": 250000,
      "payment_date": "2026-07-05",
      "bank": "Banco origen",
      "transaction_id": "TX-998877"
    }
  },
  "status": "VALIDATED"
}
```

### 13.3. liquidacion.json

```json
{
  "liquidation_id": "LIQ-2026-000789",
  "agreement_id": "AGR-2026-000123",
  "payment_event_id": "PAY-2026-000456",
  "liquidation_date": "2026-07-05",
  "simulation_source": "TANNER_SIMULATOR",
  "considered_installments": [10, 11],
  "financial_breakdown": {
    "capital": 210000,
    "interest": 12000,
    "late_interest": 6000,
    "collection_expense": 2000,
    "total_valued": 230000
  },
  "payment_amount": 250000,
  "difference": 20000,
  "saf_amount": 20000,
  "pending_amount": 0,
  "decision": "SUBSET_INSTALLMENTS_WITH_SAF",
  "rules_applied": [
    "SUBSET_INSTALLMENT_MATCH",
    "SAF_GENERATED"
  ],
  "status": "LIQUIDATED"
}
```

### 13.4. regla_cuadre.json

```json
{
  "rule_id": "RULE-006",
  "name": "Imputación por subconjunto de cuotas",
  "priority": 60,
  "enabled": true,
  "conditions": {
    "agreement_has_multiple_installments": true,
    "payment_does_not_match_full_agreement": true
  },
  "action": {
    "evaluate_subsets": true,
    "maximize_full_installments_paid": true,
    "generate_saf_if_excess": true,
    "keep_remaining_installments_pending": true
  }
}
```

### 13.5. estado_acuerdo.json

```json
{
  "agreement_id": "AGR-2026-000123",
  "current_status": "PARTIALLY_APPLIED_WITH_SAF",
  "status_history": [
    {
      "status": "CREATED",
      "timestamp": "2026-07-01T10:30:00-04:00",
      "actor": "USR-001"
    },
    {
      "status": "PAYMENT_RECEIVED",
      "timestamp": "2026-07-05T16:42:00-04:00",
      "actor": "SYSTEM"
    },
    {
      "status": "PARTIALLY_APPLIED_WITH_SAF",
      "timestamp": "2026-07-05T16:43:00-04:00",
      "actor": "PAYMENT_ENGINE"
    }
  ]
}
```

---

## 14. Prompt para Figma Make

Usar el siguiente prompt en Figma Make. Debe adjuntarse este archivo Markdown como documento base y la carpeta `img.zip` como referencia visual de estilos, logos, colores y comprobantes.

```text
Create a high-fidelity interactive prototype for a Tanner Financial Services payment engine platform. Use the attached Markdown requirements document as the main functional specification and use the attached img.zip folder as visual reference for Tanner logos, colors, UI style, transfer receipts, and existing operational screens.

The goal is to design a business application that replaces the current manual Excel + Flokzu workflow with a structured payment engine based on agreements, payment events, reliquidation, reconciliation rules, SAF, tolerance, and exception handling.

Design the product in Spanish. Use a clean enterprise fintech style, close to Tanner branding: blue header, white background, structured tables, clear financial cards, strong status labels, and executive readability. Avoid overly playful visuals. The interface should feel like an internal banking/financial operations platform.

Build the following screens:

1. Login / access screen with Tanner branding.
2. Operational dashboard with KPIs: pending agreements, received payments, partial payments, cases with SAF, cases in exception review, sent to Recaudaciones, average cycle time.
3. Customer and credit search screen with filters by RUT, customer name, credit ID, operation, company, portfolio and status.
4. Credit detail screen using Monaco-style debt information. Show customer data, credit ID, valuation date and installment table with: installment number, due date, capital, interest, late interest, collection expense, amount due, paid amount, outstanding balance and status.
5. Create payment agreement screen. Allow selecting one or more installments, setting commitment date, committed amount, channel, observation and responsible executive.
6. Agreement detail screen. Show agreement summary, selected installments, Monaco snapshot, commitment date, payment status, timeline and related payment events.
7. Upload voucher screen. Include drag-and-drop area, document preview, OCR extracted fields and confidence score. Fields: amount, payment date, bank, transaction ID, payer data.
8. Payment event detail screen. Show the actual payment received, date, amount, voucher, validation status and link to agreement.
9. Reliquidation screen. Show how the simulator recalculates the installment or installments based on actual payment date and amount. Display capital, interest, late interest, collection expense, total valued, amount paid and difference.
10. Reconciliation engine screen. Present the decision tree of the motor: full agreement match, tolerance, SAF, partial payment, subset installment match, exception. Use visual rule cards and a result summary.
11. Edge case screen: customer committed 4 installments for $400,000 but paid $250,000. Show the engine attempting full match, failing, evaluating subsets, applying 2 installments and creating SAF for the remaining amount.
12. Multiple payment events screen: customer paid 40% on one date and 60% on another. Show two payment events, two reliquidations, consolidation and final decision.
13. Exception queue for supervisors. Include filters: no match, OCR observed, outside tolerance, duplicate voucher, partial payment, SAF review. Show list/table with priority and SLA.
14. Supervisor review screen. Show voucher, OCR, Monaco snapshot, simulator result, engine decision, applied rules and approve/reject/request correction actions.
15. Final liquidation screen. This replaces Excel. Show printable/exportable summary with customer, credit, installments paid, payment events, financial breakdown, SAF, tolerance adjustment, rules applied and final status.
16. Rule administration screen. Allow editing tolerance amount, rule priorities, exception types, users, companies, channels and state transitions.

Interaction requirements:

- Make the prototype clickable.
- From dashboard, allow navigation to search, agreement, exception queue and rule administration.
- In credit detail, allow selecting installments and moving to create agreement.
- In agreement detail, allow uploading voucher and creating a payment event.
- After upload, show OCR result and then reliquidation.
- After reliquidation, show reconciliation decision.
- Include both happy path and edge cases.
- Use realistic CLP currency formatting.
- Use clear status badges: Pendiente, Pago recibido, En reliquidación, Pago parcial, Con SAF, Aceptado por tolerancia, No cuadrable, En revisión, Enviado a Recaudaciones, Cerrado.

Create the following JSON file structures as part of the prototype documentation or developer handoff:

- agreement.json
- payment_event.json
- liquidation.json
- reconciliation_rule.json
- agreement_status_history.json
- ocr_result.json
- simulator_request.json
- simulator_response.json
- exception_case.json
- dashboard_metrics.json

For each JSON structure, include realistic sample data using Tanner-like fields: customer RUT, credit ID, installment numbers, due dates, capital, interest, late interest, collection expense, amount paid, SAF, tolerance, engine decision and status.

The design should make clear that Monaco is used to create the initial agreement snapshot, while the simulator is used later by the engine to reliquidate the installment according to actual payment date and amount. The user should not manually operate the simulator or Excel. The system must automatically generate the final liquidation.
```

---

## 15. Criterios de aceptación principales

1. El sistema permite crear acuerdos a partir de deuda consultada en Mónaco.
2. El acuerdo conserva la fotografía original de negociación.
3. Cada transferencia genera un evento de pago independiente.
4. El OCR extrae y valida datos del comprobante.
5. Cada evento se reliquida usando el simulador según fecha real y monto real.
6. El motor puede cerrar pagos exactos.
7. El motor puede aceptar diferencias dentro de tolerancia.
8. El motor puede registrar SAF.
9. El motor puede gestionar pagos parciales.
10. El motor puede gestionar múltiples pagos en fechas distintas.
11. El motor puede imputar subconjuntos de cuotas cuando el acuerdo completo no cuadra.
12. El motor deriva a revisión manual los casos no resolubles.
13. La liquidación final reemplaza la planilla Excel.
14. Todo el flujo queda auditado.
15. El prototipo refleja los casos generales y excepcionales.

---

## 16. Conclusión funcional

El diseño óptimo debe construir un motor centrado en eventos de pago. El acuerdo define lo comprometido, pero el evento de pago define lo ocurrido realmente. Cada evento gatilla una reliquidación y una decisión de cuadre. Los casos excepcionales no deben resolverse con criterio manual ni Excel, sino con reglas explícitas, trazables y parametrizables.

La regla clave para los casos borde es que, cuando el pago no permite cuadrar el acuerdo completo, el motor debe buscar el mayor subconjunto válido de cuotas completas, aplicar esas cuotas, generar SAF si existe excedente y dejar el saldo restante como pendiente o derivarlo según regla.

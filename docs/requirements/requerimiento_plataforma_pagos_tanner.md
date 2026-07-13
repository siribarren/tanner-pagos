# Requerimiento Completo – Nueva Plataforma de Pagos Tanner Servicios Financieros

## 1. Contexto general

Tanner Servicios Financieros (TSF o Tanner) es una organizacion financiera que otorga créditos automotrices a personas.

Tanner requiere una plataforma para gestionar, validar, cuadrar y aplicar pagos realizados por clientes en el contexto de procesos de recuperación, cobranza y regularización de cuotas.

Los pagos se refieren principalmente a pago de las cuotas pendientes de créditos automotrices (mayoritariamente)

El pago se realiza principalmente por clientes deudores finales y se realiza via 2 canales
- A través de pasarela de pagos (UPagos)
- A través de transferencias bancarias directas a alguna de las cuentas corrientes bancarias de Tanner Servicios Financieros.

El problema principal y el foco son la gestión de pagos via transferencia.

El flujo inicia cuando Tanner informa a las empresas de cobranza (son varias) un listado de personas deudoras, sus datos personales y de contato, el monto de la deuda, el plazo de su deuda,(dias) el monto de las cuotas, su fecha de vencimiento y las acciones.  Esta información llega en general via una planilla Excel.

Esa planilla es cargada en un CRM - Dialer y los ejecutivos comerciales de las empresas de cobranza contactan a las personas para buscar una "salida comercial".

Parte de las gestiones de "salida comercial" es negociar y buscar un compromiso de pago. 

Ese compromiso de pago puede corresponder a:
- Pago de una cuota
- Pago de mas de 1 cuota
- Pago de la deuda completa
- Pago de parte de una cuota primero y otra parte después

Además de la planilla cargada inicialmente mes a mes (llamada igualmente Tubo), los ejecutivos comerciales utilizan:
- Monaco: Es una plataforma web de Tanner donde se informan datos del credito como ID, monto, plazo, cuotas, datos del cliente, etc.
- Simulador: Es una plataforma web de Tanner donde se calcula el detalle del monto de una cuota pagada a cierto dia; se utiliza cuando el cliente paga en una fecha distinta a la comprometida; para luego hacer el "cuadre" del monto comprometido con el monto pagado.
- Flokzu: Es una plataforma de Tanner que se utiliza como BPM para gestionar la autorizacion de un pago realizado por un ejecutivo, y se incluye el Excel con el detalle de la cuota, datos del pago y el comprobante de pago.
- Excel: Es un Excel de Tanner donde se detalla el monto pagado y la o las cuotas, incluye monto capital, N° de cuota, interés, gastos de cobranza, etc.
- CRM: Es una plataforma interna que incorpora igualmente datos del cliente, de su credito, de contacto; incluye un dialer y una bitacora de acciones que es llenada a mano por el ejecutivo y a través de procesos batch es informada a TSF.

El compromiso de pago se realiza para un dia específico, considerando que el crédito tiene interés moratorio, gastos de cobranza que cambian dia a dia; si el pago se realiza en un dia que no está acordado, la composicion del monto transferido debiera cambiar.

Existe igualmente una tolerancia de $10.000 tanto como Saldo a Favor (SAF) como si el cliente pagara menos.

Además, existen las excepciones donde el cliente puede pagar menos del monto acordado, mas del monto acordado u otro monto no acordado.

Luego el cliente realiza la transferencia y la información del pago se consolida para Tanner mediante Excel y Flokzu, consultando datos de Mónaco y de un simulador.

El proceso actual presenta errores recurrentes en la carga de pagos, principalmente por dependencia de Excel, interpretación manual de reglas, diferencias entre Mónaco y simuladores, errores en la imputación de intereses moratorios, omisión de saldos a favor, problemas de fechas, mala clasificación de pagos y reprocesos por parte del área de Recaudaciones.

La plataforma objetivo debe reemplazar la lógica manual del flujo actual por un proceso controlado, trazable y asistido por reglas de negocio. No debe limitarse a digitalizar el formulario actual. Debe operar como un motor de cuadratura asistida, donde el ejecutivo registra la intención de pago y adjunta evidencia, pero el sistema valida, calcula, clasifica, propone la imputación y deriva excepciones cuando corresponda.

El contexto de este proyecto es mejorar, hacer mas eficiente, evitar errores el proceso de gestion de pagos via transferencia bancaria.

---

## 2. Problema operativo detectado

En la operación actual, los ejecutivos de las empresas de cobranza buscan compromisos de pagos con clientes, los clientes realizan transferencias y luego la información del pago se arma para Tanner en Excel y Flokzu. Ese armado consulta Mónaco y un simulador para validar montos, intereses y cuadraturas. El proceso depende de varias fuentes y herramientas:

- Mónaco.
- Simulador de cuotas.
- Excel de cálculo.
- Comprobante de transferencia.
- Formulario Flokzu.
- Validación posterior por Recaudaciones.

Los errores más frecuentes son:

- Pagos subidos erróneamente al formulario.
- Cuadratura incorrecta de intereses moratorios.
- Cuadratura incorrecta de gastos de cobranza.
- Uso de fórmulas o sumatorias en Excel en lugar de valores finales.
- Diferencias entre el monto transferido por el cliente y el monto informado por Mónaco.
- Dudas sobre si el excedente debe imputarse a interés de mora o a saldo a favor.
- Omisión del saldo a favor.
- Errores de fecha de pago o valorización.
- Pagos clasificados incorrectamente como masivos.
- Casos rechazados por Recaudaciones.
- Reprocesos manuales.
- Dependencia de usuarios expertos para corregir pagos.

El problema no es solamente de capacitación. Es un problema de diseño de proceso: la lógica de negocio está distribuida entre sistemas, planillas, formularios y criterio humano.

---

## 3. Objetivo de la nueva plataforma

Diseñar e implementar una plataforma que permita gestionar el ciclo completo de un pago, desde el compromisos con el cliente hasta su aplicación final, reduciendo errores operativos, eliminando dependencias manuales y asegurando trazabilidad completa.

La plataforma debe permitir:

- Crear compromisos de pago basados en información oficial de Mónaco.
- Consultar deuda, cuotas, capital, intereses moratorios y gastos de cobranza.
- Registrar y validar comprobantes de transferencia.
- Extraer datos desde comprobantes mediante OCR.
- Actualizar la deuda desde Mónaco al momento efectivo del pago.
- Calcular diferencias entre monto acordado, monto Mónaco y monto transferido.
- Aplicar reglas de tolerancia, mora actualizada y saldo a favor.
- Derivar excepciones a supervisión.
- Enviar pagos correctamente cuadrados a Recaudaciones o al sistema de aplicación.
- Auditar cada acción, cálculo, corrección y aprobación.

---

## 4. Principio rector del diseño

La regla principal del sistema debe ser:

> **Mónaco es la fuente oficial de verdad para la deuda, cuotas, capital, intereses moratorios, gastos de cobranza y monto esperado de pago.**

Si existe diferencia entre Mónaco, simuladores, planillas o cálculos manuales, la plataforma debe priorizar Mónaco.

El ejecutivo no debe calcular manualmente el interés moratorio ni modificar libremente montos críticos. La plataforma debe consultar, calcular, comparar y proponer la imputación correcta.

---

## 5. Alcance funcional general

La plataforma debe cubrir los siguientes módulos:

1. Módulo de búsqueda y selección de cliente.
2. Módulo de creación de compromisos de pago.
3. Integración o consulta con Mónaco.
4. Motor de cálculo de deuda y mora.
5. Motor de cuadratura y reglas Tanner.
6. Carga y lectura OCR de comprobantes.
7. Matching entre compromisos, comprobante y Mónaco.
8. Validación documental de comprobantes y datos de pago.
9. Bandeja de excepciones y aprobación supervisora.
10. Aplicación del pago o envío a Recaudaciones.
11. Auditoría y trazabilidad completa.
12. Reportería operativa y ejecutiva.

---

## 5.1. Usuarios clave del proceso

- Cliente: deudor que negocia y realiza el pago mediante transferencia.
- Ejecutivo comercial de cobranza: contacta al cliente, negocia el monto, gestiona el registro de la información para Tanner y arma el flujo en Excel y Flokzu consultando Mónaco y el simulador.
- Coordinador Tanner: recibe el pago en una etapa posterior y se encarga de conciliarlo y gestionarlo.

---

# 6. Flujo óptimo propuesto

## 6.1. Etapa 1: Búsqueda del cliente

### Actor principal

Ejecutivo comercial de cobranza.

### Descripción

El ejecutivo ingresa a la plataforma y se sincronizan los datos con las distintas fuentes:
- Monaco
- Tubo

El ejecutivo visualiza en su pantalla la información asignada que le corresponde gestionar.

El ejecutivo contacta al cliente, gestiona telefonicamente un compromiso de pago para un dia determinado, un numero de cuotas y un monto.
El ejecutivo informa en el CRM el compromiso.
Queda a la espera del comprobante de transferencia enviado por el cliente.


El ejecutivo tiene acceso a la siguiente información y sistemas:

# Rótulos de Campos – Comprobantes y Plataformas

## 1. Comprobante de Transferencia (Scotiabank)

Monto
Desde
Cuenta Corriente
Hacia
Asunto
Fecha
Hora
N Transaccion

## 2. Aviso de transferencia de fondos (BCI, correo)

Monto recibido
Banco de origen
Fecha de la transferencia
Mensaje
Numero de comprobante

## 3. Flokzu - Registrar asiento (encabezado)

Identifier
Tipo de solicitud
Fecha solicitud
Hora solicitud

## 4. Flokzu - Empresa y credito

Empresa
Empresa de cobranza
Correo de empresa de cobranza
Ingrese correos adicionales
ID del credito
Ingrese la forma de pago

## 5. Flokzu - Datos del pago

Rut de quien transfiere
Monto del pago
Cuenta
Ingrese la fecha del pago
Ingrese la cantidad de movimientos depositos

## 6. Flokzu - Tipo de pago y ajustes

Tipo de pago
Cuota inicial a aplicar
Cuota final a aplicar
Considera otros ID
Consolidado ids
Adjuntar cuadre varios id
Corresponde CECO
Ingrese monto CECO
VB CECO
Corresponde SAF
Ingrese monto SAF
VB SAF

## 7. Flokzu - Datos bancarios y asignacion

Banco
Tipo de cuenta
Numero de cuenta
Seleccione la cantidad de asignaciones
Asignacion 1
Asignacion 2
Asignacion 3
Asignacion 4
Asignacion 5
Asignacion 6
Asignacion 7
Asignacion 8
Asignacion 9
Asignacion 10
Campo Abierto Recuperos de Castigo

## 8. Excel de cuotas

ID_CREDITO
NUMERO CUOTA
VALOR CUOTA NOMINAL
INTERES DE MORA
GASTOS DE COBRANZA
CECO
SAF
COSTAS JUDICIALES
MONTO_TOTAL CUOTA A PAGAR

## 9. Monaco - Valorizacion futura

CREDITO
RUT
NOMBRE
Fecha de valorizacion futura
CUOTA
FECHA VENCIMIENTO
CAPITAL
INTERES
MONTO CUOTA
SEGURO
INTERES MORA
GASTOS COBRANZA
MONTO A PAGAR
MONTO PAGADO
SALDO INSOLUTO
ESTADO
Interes mora total
Interes mora rebajado
Gasto cobranza total
Gasto cobranza rebajado
Monto total a pagar

## 10. Monaco - Resumen del credito

ID Credito
RUT
Nombre
Tipo de Credito
Capital a Financiar
Valor del Vehiculo
Saldo Precio
Tasa
Plazo
Fecha Curse
Fecha Otorgamiento
Canal de Venta
Automotora
Sucursal
Ejecutivo Automotora
Monto Pagare
Fecha Pagare
Valor UF Dia Pagare
Desgravamen
Seguro de Hospitalizacion
Cesantia o Despido Involuntario
Multiasistencia
Asistencia Garantia Mecanica
Asistencia Danos Menores
Seguro Vehiculo
Valor Seguro Vehiculo
Cuota Seguro Vehiculo
Deducible
Plazo de seguro
Asistencia Vehiculo
Valor Asistencia Vehiculo
Cuota Asistencia Vehiculo
Metodo de Pago

## 11. Flokzu - Aplicacion de pagos (encabezado)

Tipo de solicitud
Fecha solicitud
Hora solicitud
Empresa
Empresa de cobranza
Correo de empresa de cobranza
Ingrese correos adicionales
Tipo de solicitud de pago

## 12. Flokzu - Datos de pago y adjuntos

Rut de quien transfiere
Monto del pago
Cuenta
Adjuntar comprobantes de pago
Corresponde CECO

## 13. Flokzu - Ajustes y detalle

Corresponde CECO
Corresponde SAF
Corresponde costas Judiciales
Fecha Abono
Monto Abono
Asignacion
Agregar Registro




### Información esperada

La plataforma debe mostrar:

- Nombre del cliente.
- RUT.
- Operaciones asociadas.
- Estado de deuda.
- Cuotas vencidas.
- Cuotas por vencer.
- Monto capital.
- Interés moratorio informado por Mónaco.
- Gasto de cobranza.
- Total exigible.
- Fecha de valorización.
- Campaña o cartera.
- Ejecutivo responsable.
- Historial de compromisos.
- Historial de pagos.
- Pagos pendientes de aplicación.
- Pagos rechazados u observados.

### Resultado

Cliente y operación seleccionados para generar un compromisos de pago.

---

## 6.2. Etapa 2: Creación del compromisos de pago

### Actor principal

Ejecutivo comercial de cobranza.

### Descripción

El ejecutivo selecciona una o más cuotas que el cliente pagará. La plataforma consulta Mónaco y genera el desglose oficial.

### Datos del compromisos

El compromisos debe contener:

- ID único de compromisos.
- Cliente.
- RUT.
- Operación.
- Cuotas incluidas.
- Fecha de compromisos.
- Fecha compromiso de pago.
- Monto capital.
- Interés moratorio Mónaco.
- Gasto de cobranza.
- Otros cargos, si aplican.
- Total a pagar.
- Ejecutivo responsable.
- Canal de contacto.
- Campaña / cartera.
- Estado inicial.

### Regla funcional

La plataforma debe informar claramente:

> **Monto calculado desde Mónaco. No usar simulador externo como monto final de cuadratura.**

Si se muestra un simulador, debe identificarse como referencial y no oficial.

### Resultado

Se crea un compromisos con estado:

> **compromisos creado / Pendiente de pago**

---

## 6.3. Etapa 3: Espera y seguimiento del pago

### Actor principal

Plataforma.

### Descripción

Una vez creado el compromisos, la plataforma espera la transferencia del cliente. Si el cliente paga en la fecha comprometida, se mantiene el monto original. Si paga después, el sistema debe actualizar el monto contra Mónaco antes de aplicar el pago.


### Estados
- Pago comprometido: El cliente aceptó pagar un monto y fecha determinado
- Compromiso pendiente: Se está a la espera que el cliente cumpla lo comprometido
- Compromiso por validar: El cliente pagó y se deben validar los antecedentes

Si el cliente paga:
- Si el compromiso se cumple totalmente: Pago enviado a autorizar
- Si el compromiso se cumple parcialmente: Pago enviado a autorizar (parcial)
- Si el compromiso se cumple en otras condiciones: Pago enviado a autorizar (excepción)
-- Paga un monto menos con una diferencia superior a $10.000
-- Paga mas del monto informado con cuotas determinadas
-- Paga mas del monto informado pero abonando otro monto (monto cuota + monto adicional cualquier monto)
-- Paga en una fecha demasiado distinta a la comprometid
### Reglas

- El compromisos no debe invalidarse automáticamente si el cliente paga fuera de la fecha comprometida.
- La plataforma debe recalcular o actualizar el interés moratorio contra Mónaco según la fecha efectiva del pago.
- La deuda aplicable al momento de cuadrar debe considerar la información vigente en Mónaco.

### Resultado

compromisos pendiente de comprobante o pendiente de validación.
pago enviado a autorizar

---

## 6.4. Etapa 4: Carga o recepción del comprobante

### Actor principal

Ejecutivo comercial de cobranza o plataforma.

### Descripción

El comprobante puede ser cargado manualmente por el ejecutivo o recibido mediante integración con canales como correo, WhatsApp o portal, si aplica.

### Funcionalidades requeridas

La plataforma debe permitir:

- Subir comprobante en imagen o PDF.
- Asociar comprobante a un compromisos existente.
- Crear un caso sin compromisos previo, si el pago llega sin antecedente.
- Ejecutar OCR sobre el comprobante.
- Extraer campos relevantes.
- Permitir revisión guiada de los campos extraídos.
- Guardar el comprobante original.
- Detectar comprobantes duplicados.

### Campos OCR esperados

- Banco origen.
- Banco destino.
- Cuenta destino.
- Fecha de transferencia.
- Hora de transferencia.
- Monto transferido.
- Nombre del pagador.
- RUT del pagador, si aparece.
- Número de operación bancaria.
- Número o folio de comprobante.
- Imagen o archivo original.

### Resultado

Estado del caso:

> **Comprobante recibido**

---

## 6.5. Etapa 5: Validación bancaria fuera de alcance temporal

### Actor principal

Plataforma / Recaudaciones.

### Descripción

La validación contra cartola bancaria no forma parte de esta versión del requerimiento. En esta etapa, la plataforma se concentra en el comprobante, la información de Mónaco y la cuadratura del pago. La conciliación bancaria podrá levantarse como fase posterior.

### Validaciones

- Monto del comprobante versus monto acordado.
- Fecha del comprobante versus fecha efectiva de pago, cuando aplique.
- Consistencia entre cliente, compromisos y transacción.
- Duplicidad de comprobantes.

### Estados posibles

- Comprobante validado.
- Comprobante no validado.
- Comprobante duplicado.
- Comprobante ambiguo.
- Pendiente de revisión.

### Resultado

Caso listo para actualización contra Mónaco.

---

## 6.6. Etapa 6: Actualización contra Mónaco

### Actor principal

Plataforma.

### Descripción

Antes de cuadrar y aplicar el pago, la plataforma debe consultar nuevamente Mónaco para obtener la deuda vigente al momento efectivo del pago.

### Valores que deben manejarse

La plataforma debe mantener separados tres valores:

1. **Monto Mónaco original:** monto consultado al momento de crear el compromisos.
2. **Monto Mónaco actualizado:** monto consultado al momento de validar el pago efectivo.
3. **Monto transferido:** monto real detectado en comprobante y/o cartola.

### Información Mónaco actualizada

- Capital.
- Interés moratorio vigente.
- Gasto de cobranza.
- Otros cargos.
- Total exigible.
- Fecha de valorización.
- Estado de la operación.

### Resultado

Estado:

> **Mónaco actualizado**

---

# 7. Motor de intereses moratorios

## 7.1. Objetivo

El motor de intereses moratorios debe permitir igualar, respetar y reconciliar los intereses entregados por Mónaco, evitando que los ejecutivos aumenten manualmente el interés de mora para forzar cuadraturas.

## 7.2. Principio funcional

El interés moratorio aplicable debe estar alineado con Mónaco. La plataforma puede calcular una estimación interna para control, pero no debe reemplazar el valor oficial de Mónaco sin regla autorizada.

## 7.3. Entradas del motor

- RUT cliente.
- Operación.
- Cuotas seleccionadas.
- Fecha de vencimiento.
- Fecha de compromisos.
- Fecha de pago indicada en comprobante.
- Fecha de abono en cartola.
- Fecha de valorización Mónaco.
- Monto transferido.
- Capital.
- Interés moratorio Mónaco original.
- Interés moratorio Mónaco actualizado.
- Gasto de cobranza.
- Monto total Mónaco original.
- Monto total Mónaco actualizado.
- Reglas de cartera/campaña.
- Tolerancia autorizada.

## 7.4. Cálculo interno estimado

Cuando Tanner provea la fórmula de cálculo, la plataforma podrá calcular una estimación paralela:

```text
Interés moratorio estimado = saldo vencido × tasa mora diaria × días de mora
```

Donde:

```text
Días de mora = fecha efectiva de pago - fecha de vencimiento
Tasa mora diaria = tasa moratoria parametrizada / base de días definida
Saldo vencido = base afecta a mora según política Tanner
```

Este cálculo no debe sustituir automáticamente a Mónaco. Debe usarse para:

- Control interno.
- Detección de diferencias.
- Auditoría.
- Alertas de divergencia.
- Análisis de consistencia.

## 7.5. Regla de reconciliación con Mónaco

La plataforma debe comparar:

```text
Interés moratorio Mónaco vs. Interés moratorio estimado por plataforma
```

Si la diferencia es cero o está dentro de una tolerancia técnica definida, se utiliza el valor de Mónaco.

Si existe diferencia relevante, se debe:

- Mantener Mónaco como fuente oficial.
- Registrar alerta de divergencia.
- Permitir revisión por usuario autorizado.
- No permitir edición libre por ejecutivo.

## 7.6. Regla de imputación de excedentes a mora

Si el cliente paga más que el compromisos original, la plataforma debe evaluar si el excedente puede imputarse a interés moratorio actualizado.

La regla debe ser:

> El excedente puede imputarse a interés moratorio solo si el monto transferido no supera el monto Mónaco actualizado y si el interés de mora actualizado permite absorber la diferencia.

Si el interés moratorio actualizado de Mónaco permite absorber el excedente, la plataforma lo imputa a mora.

Si no permite absorberlo, el excedente debe registrarse como SAF / saldo a favor.

## 7.7. Restricción crítica

El ejecutivo no debe poder aumentar manualmente el interés moratorio por sobre lo informado o permitido por Mónaco.

La plataforma debe permitir rebajas o ajustes solo cuando una regla de tolerancia lo permita y siempre dejando trazabilidad.

---

# 8. Motor de cuadratura y reglas Tanner

## 8.1. Objetivo

El motor de cuadratura debe determinar automáticamente si un pago:

- Cuadra exactamente.
- Cuadra con tolerancia.
- Cuadra con mora actualizada.
- Genera saldo a favor.
- Requiere autorización.
- Debe ser rechazado u observado.

## 8.2. Variables de entrada

- Monto transferido.
- Monto compromisos original.
- Monto Mónaco actualizado.
- Capital Mónaco.
- Interés mora Mónaco actualizado.
- Gasto cobranza Mónaco.
- Fecha de pago.
- Fecha cartola.
- Fecha Mónaco.
- Monto faltante.
- Monto excedente.
- Tolerancia hacia abajo.
- Reglas de campaña/cartera.

## 8.3. Regla 1: Mónaco manda

Si el simulador, Excel u otro cálculo difiere de Mónaco, la plataforma debe usar Mónaco como base de cuadratura.

Acciones:

- Mostrar diferencia.
- Bloquear edición manual del monto oficial.
- Permitir comentario estructurado.
- Permitir solicitud de revisión si corresponde.

## 8.4. Regla 2: No se permiten fórmulas ni sumatorias manuales

La plataforma debe eliminar el uso operativo de Excel como herramienta de cálculo.

Acciones:

- No permitir fórmulas en campos de monto.
- Guardar solo valores numéricos finales.
- Permitir exportar a Excel solo como reporte.
- Bloquear cálculos manuales en conceptos críticos.
- Registrar siempre el origen de cada monto.

## 8.5. Regla 3: Pago exacto

Condición:

```text
Monto transferido = Monto Mónaco actualizado
```

Acción:

- Estado: Cuadrado exacto.
- Aplicar desglose Mónaco.
- Enviar a aplicación / Recaudaciones.

## 8.6. Regla 4: Pago menor dentro de tolerancia

Condición:

```text
Monto transferido < Monto Mónaco actualizado
Diferencia <= $10.000
```

Acción:

- Estado: Cuadrado con tolerancia hacia abajo.
- Permitir imputación.
- Registrar ajuste.
- Aplicar regla de rebaja autorizada.

Orden recomendado de ajuste hacia abajo, sujeto a validación Tanner:

1. Rebajar gasto de cobranza, si la política lo permite.
2. Rebajar interés moratorio.
3. No rebajar capital sin autorización expresa.

## 8.7. Regla 5: Pago menor fuera de tolerancia

Condición:

```text
Monto transferido < Monto Mónaco actualizado
Diferencia > $10.000
```

Acción:

- Estado: Fuera de tolerancia.
- Bloquear aplicación automática.
- Derivar a supervisor.
- Permitir solicitar diferencia al cliente.
- Permitir autorización excepcional si Tanner lo define.

## 8.8. Regla 6: Pago mayor, absorbible por mora actualizada

Condición:

```text
Monto transferido > Monto compromisos original
Monto transferido <= Monto Mónaco actualizado
```

Acción:

- Estado: Cuadrado con mora actualizada.
- Imputar diferencia a interés moratorio actualizado.
- Registrar que el pago fue cuadrado contra Mónaco actualizado.

Ejemplo:

```text
compromisos original: $100.000
Mónaco actualizado: $101.000
Cliente transfiere: $101.000
Diferencia: $1.000
Imputación: interés moratorio actualizado
```

## 8.9. Regla 7: Pago mayor no absorbible por mora

Condición:

```text
Monto transferido > Monto Mónaco actualizado
```

Acción:

- Estado: Cuadrado con saldo a favor.
- Aplicar deuda hasta monto Mónaco actualizado.
- Registrar excedente como SAF.

Ejemplo:

```text
Mónaco actualizado: $100.000
Cliente transfiere: $100.002
Excedente: $2
SAF: $2
```

## 8.10. Regla 8: Error o inconsistencia de fecha

La plataforma debe manejar separadamente:

- Fecha de compromisos.
- Fecha compromiso.
- Fecha de vencimiento.
- Fecha de transferencia indicada en comprobante.
- Fecha de abono en cartola.
- Fecha de valorización Mónaco.
- Fecha de aplicación.

Regla recomendada:

> El interés moratorio se debe validar contra la fecha efectiva de pago, priorizando la fecha definida por Tanner como fecha oficial de aplicación.

Si Tanner define que la fecha oficial es la fecha de cartola, se debe usar esa fecha para la cuadratura. Si define que es la fecha del comprobante, se debe usar esa fecha, dejando igualmente trazada la fecha bancaria.

## 8.11. Regla 9: Pago masivo versus pago individual

La plataforma debe clasificar automáticamente el tipo de pago.

Criterios:

- Un comprobante asociado a un cliente y una operación: pago individual.
- Un pago asociado a varias operaciones del mismo cliente: pago multicuota.
- Un pago asociado a varios clientes u operaciones distintas: pago masivo.

Acción:

- La plataforma propone clasificación.
- El ejecutivo confirma.
- Si cambia la clasificación, debe justificar.

---

# 9. Matching automático

## 9.1. Objetivo

Relacionar correctamente compromisos, comprobante y Mónaco.

## 9.2. Criterios de matching

El motor debe considerar:

- RUT cliente.
- Nombre cliente.
- Monto transferido.
- Fecha de transferencia.
- Fecha de abono.
- Cuenta destino.
- Banco destino.
- Número de operación bancaria.
- compromisos vigente.
- Cuotas comprometidas.
- Ejecutivo responsable.
- Campaña / cartera.
- Monto Mónaco actualizado.

## 9.3. Resultados de matching

- Match exacto.
- Match probable.
- Match con diferencia menor.
- Match con excedente.
- Match ambiguo.
- Sin match.
- Posible duplicado.

## 9.4. Acciones según resultado

### Match exacto

Enviar a cuadratura automática.

### Match probable

Solicitar confirmación del ejecutivo o supervisor.

### Match ambiguo

Derivar a bandeja de revisión.

### Sin match

Crear caso pendiente de identificación.

### Posible duplicado

Bloquear aplicación hasta revisión.

---

# 10. Previsualización de imputación

Antes de aplicar o enviar a Recaudaciones, la plataforma debe mostrar una pantalla de preliquidación.

## 10.1. Información general

- Cliente.
- RUT.
- Operación.
- Cuotas pagadas.
- Ejecutivo.
- Campaña.
- Fecha compromisos.
- Fecha pago.
- Fecha cartola.
- Fecha Mónaco.

## 10.2. Tabla de imputación

| Concepto | Mónaco original | Mónaco actualizado | Transferencia | Aplicado |
|---|---:|---:|---:|---:|
| Capital | $0 | $0 | - | $0 |
| Interés moratorio | $0 | $0 | - | $0 |
| Gasto cobranza | $0 | $0 | - | $0 |
| SAF | - | - | $0 | $0 |
| Total | $0 | $0 | $0 | $0 |

## 10.3. Información de control

- Estado de cuadratura.
- Regla aplicada.
- Diferencia detectada.
- Tolerancia utilizada.
- Requiere autorización: sí/no.
- Comprobante validado: sí/no.
- Cartola validada: sí/no.
- OCR validado: sí/no.
- Mónaco actualizado: sí/no.

## 10.4. Acciones permitidas

El ejecutivo puede:

- Confirmar envío.
- Solicitar revisión.
- Agregar comentario estructurado.
- Adjuntar respaldo adicional.

El ejecutivo no puede:

- Modificar libremente capital.
- Aumentar interés moratorio sobre Mónaco.
- Alterar gasto de cobranza sin regla.
- Omitir SAF cuando exista excedente.
- Forzar cuadratura fuera de tolerancia.

---

# 11. Bandeja de excepciones

## 11.1. Objetivo

Gestionar casos que no pueden aplicarse automáticamente.

## 11.2. Casos que deben ir a excepción

- Faltante superior a $10.000.
- Excedente no imputable a mora.
- SAF no confirmado.
- Mónaco no disponible.
- Cartola no encontrada.
- Comprobante inconsistente.
- OCR con baja confianza.
- Fecha inconsistente.
- Pago masivo dudoso.
- Pago duplicado.
- Abono ya utilizado.
- Diferencia entre Mónaco y cálculo interno fuera de tolerancia técnica.

## 11.3. Acciones del supervisor

El supervisor puede:

- Aprobar excepción.
- Rechazar caso.
- Solicitar corrección al ejecutivo.
- Solicitar respaldo adicional.
- Pedir pago de diferencia al cliente.
- Autorizar aplicación parcial, si la política lo permite.
- Derivar a Recaudaciones.
- Cerrar caso como no aplicable.

## 11.4. Datos visibles para supervisor

- Cliente.
- Ejecutivo.
- Operación.
- Monto Mónaco.
- Monto transferido.
- Diferencia.
- Regla incumplida.
- Comprobante.
- Cartola.
- Historial de acciones.
- Comentarios.
- Recomendación automática del sistema.

---

# 12. Aplicación del pago

## 12.1. Objetivo

Enviar a Recaudaciones o al sistema correspondiente un pago correctamente cuadrado, validado y trazable.

## 12.2. Datos enviados

- ID de compromisos.
- ID de pago.
- Cliente.
- RUT.
- Operación.
- Cuotas aplicadas.
- Capital aplicado.
- Interés moratorio aplicado.
- Gasto de cobranza aplicado.
- SAF.
- Monto total transferido.
- Monto total aplicado.
- Fecha transferencia.
- Fecha cartola.
- Fecha Mónaco.
- Comprobante.
- ID cartola.
- Regla aplicada.
- Usuario responsable.
- Aprobaciones, si existen.

## 12.3. Estados de aplicación

- Enviado a aplicación.
- Aplicado.
- Observado.
- Rechazado.
- Reprocesado.
- Cerrado.

---

# 13. Estados generales del flujo

La plataforma debe manejar los siguientes estados:

1. compromisos creado.
2. Pendiente de pago.
3. Comprobante recibido.
4. OCR procesado.
5. Abono encontrado en cartola.
6. Abono no encontrado.
7. Mónaco actualizado.
8. Cuadrado exacto.
9. Cuadrado con tolerancia.
10. Cuadrado con mora actualizada.
11. Cuadrado con SAF.
12. Requiere autorización.
13. Observado.
14. Rechazado.
15. Enviado a aplicación.
16. Aplicado.
17. Reprocesado.
18. Cerrado.

---

# 14. Pantallas requeridas

## 14.1. Pantalla de búsqueda de cliente

Debe permitir buscar y seleccionar cliente, operación y cuotas.

Componentes:

- Buscador por RUT / nombre / operación.
- Filtros por cartera, campaña y empresa.
- Listado de operaciones.
- Estado de deuda.
- Historial de pagos.
- Historial de compromisos.

## 14.2. Pantalla de creación de compromisos

Debe permitir crear un compromisos basado en Mónaco.

Componentes:

- Cuotas seleccionables.
- Desglose Mónaco.
- Capital.
- Interés mora.
- Gasto cobranza.
- Total.
- Fecha compromiso.
- Canal.
- Botón crear compromisos.

## 14.3. Pantalla de carga de comprobante

Debe permitir cargar evidencia y extraer datos.

Componentes:

- Carga de archivo.
- Visor de comprobante.
- Resultado OCR.
- Campos extraídos.
- Nivel de confianza.
- Asociación a compromisos.
- Validación de duplicidad.

## 14.4. Pantalla de matching

Debe mostrar posibles coincidencias.

Componentes:

- compromisos sugerido.
- Cartola sugerida.
- Puntaje de match.
- Motivos de match.
- Alertas.
- Confirmación o derivación.

## 14.5. Pantalla de cuadratura

Debe explicar cómo se imputa el pago.

Componentes:

- Monto transferido.
- Mónaco original.
- Mónaco actualizado.
- Diferencia.
- Capital.
- Mora.
- Gasto cobranza.
- SAF.
- Regla aplicada.
- Estado de cuadratura.

## 14.6. Bandeja supervisora

Debe permitir revisar excepciones.

Componentes:

- Lista de casos observados.
- Filtros por motivo.
- Filtros por ejecutivo.
- Filtros por cartera.
- Filtros por fecha.
- Acciones de aprobación/rechazo.
- Historial del caso.

## 14.7. Pantalla de auditoría

Debe mostrar trazabilidad completa.

Componentes:

- Línea de tiempo del caso.
- Acciones por usuario.
- Consultas a Mónaco.
- Lecturas OCR.
- Validación cartola.
- Reglas aplicadas.
- Cambios de estado.
- Aprobaciones.
- Comentarios.

## 14.8. Dashboard operativo

Debe mostrar indicadores de gestión.

Indicadores sugeridos:

- Pagos creados.
- Pagos pendientes.
- Pagos aplicados.
- Pagos observados.
- Pagos rechazados.
- Casos con SAF.
- Casos con tolerancia.
- Casos con mora actualizada.
- Tiempo promedio de aplicación.
- Errores por ejecutivo.
- Errores por cartera.
- Motivos de rechazo.
- Monto total aplicado.
- Monto total en excepción.

---

# 15. Controles para evitar errores actuales

La plataforma debe bloquear o advertir en los siguientes escenarios:

- Monto Mónaco no consultado.
- Interés mora ingresado manualmente.
- Interés mora superior al permitido por Mónaco.
- Gasto cobranza alterado sin regla.
- Capital rebajado sin autorización.
- SAF omitido cuando existe excedente.
- Faltante superior a $10.000 sin autorización.
- Comprobante duplicado.
- Abono bancario ya utilizado.
- Pago clasificado erróneamente como masivo.
- Fecha de pago inconsistente.
- Cartola no encontrada.
- OCR con baja confianza sin revisión.
- Monto del comprobante distinto al monto de cartola.
- Pago sin compromisos asociado y sin revisión.
- Cuadratura forzada por comentario libre.

---

# 16. Explicaciones automáticas de cuadratura

La plataforma debe generar una explicación automática para cada caso. Esto reduce ambigüedad y facilita auditoría.

## 16.1. Caso con SAF

```text
El cliente transfirió $100.002. Mónaco actualizado informa deuda aplicable por $100.000. El excedente de $2 no puede imputarse a interés moratorio porque el interés máximo informado por Mónaco ya fue cubierto. Se registra $2 como SAF.
```

## 16.2. Caso con mora actualizada

```text
El cliente transfirió $101.000. El compromisos original era $100.000, pero Mónaco actualizado a la fecha efectiva de pago informa interés moratorio adicional por $1.000. Se imputa la diferencia a interés moratorio actualizado.
```

## 16.3. Caso con faltante dentro de margen

```text
El cliente transfirió $95.000. Mónaco actualizado informa $100.000. La diferencia de $5.000 está dentro del margen Tanner de $10.000 hacia abajo. Se permite cuadratura con tolerancia.
```

## 16.4. Caso con faltante fuera de margen

```text
El cliente transfirió $80.000. Mónaco actualizado informa $100.000. La diferencia de $20.000 excede el margen autorizado. Se deriva a supervisor.
```

---

# 17. Roles y permisos

## 17.1. Ejecutivo

Puede:

- Buscar clientes.
- Crear compromisos.
- Cargar comprobantes.
- Revisar OCR.
- Confirmar datos no críticos.
- Enviar casos cuadrados.
- Solicitar revisión.

No puede:

- Aumentar interés moratorio sobre Mónaco.
- Rebajar capital sin autorización.
- Omitir SAF.
- Forzar pagos fuera de tolerancia.
- Modificar reglas de negocio.

## 17.2. Supervisor

Puede:

- Revisar excepciones.
- Aprobar diferencias fuera de regla.
- Rechazar casos.
- Solicitar correcciones.
- Autorizar ajustes según política.
- Revisar indicadores por ejecutivo.

## 17.3. Recaudaciones

Puede:

- Revisar pagos enviados.
- Validar aplicación.
- Observar pagos.
- Rechazar pagos.
- Confirmar aplicación.
- Ver trazabilidad completa.

## 17.4. Administrador

Puede:

- Configurar reglas.
- Configurar tolerancias.
- Configurar campañas/carteras.
- Configurar usuarios y roles.
- Configurar integraciones.
- Ver auditoría completa.

---

# 18. Reglas parametrizables

La plataforma debe permitir configurar:

- Margen de tolerancia hacia abajo.
- Regla de imputación de faltantes.
- Regla de imputación de excedentes.
- Política de SAF.
- Orden de rebaja de conceptos.
- Fuente oficial de fecha de pago.
- Reglas por cartera.
- Reglas por empresa.
- Reglas por campaña.
- Umbral de confianza OCR.
- Umbral de matching automático.
- Tipos de pago.
- Reglas para pago masivo.
- Usuarios aprobadores.
- Límites de aprobación por monto.

---

# 19. Requerimientos no funcionales

## 19.1. Seguridad

- Control de acceso por roles.
- Registro de auditoría inmutable.
- Protección de datos personales.
- Cifrado en tránsito.
- Cifrado en reposo para documentos sensibles.
- Gestión de sesiones.
- Trazabilidad de descargas.

## 19.2. Trazabilidad

Cada caso debe guardar:

- Usuario creador.
- Fecha de creación.
- Consultas a Mónaco.
- Resultado OCR.
- Comprobante original.
- Cartola asociada.
- Reglas aplicadas.
- Cambios de estado.
- Aprobaciones.
- Rechazos.
- Comentarios.
- Resultado final.

## 19.3. Disponibilidad

La plataforma debe considerar contingencias cuando Mónaco, OCR o cartola no estén disponibles.

Estados de contingencia:

- Pendiente Mónaco.
- Pendiente cartola.
- Pendiente OCR.
- Pendiente revisión manual.

## 19.4. Usabilidad

La plataforma debe reducir carga cognitiva del ejecutivo.

Principios:

- Mostrar semáforos claros.
- Explicar diferencias.
- Evitar campos libres innecesarios.
- Usar validaciones en línea.
- No exigir cálculos manuales.
- Mostrar instrucciones contextuales.

## 19.5. Auditoría y cumplimiento

Debe existir trazabilidad suficiente para explicar:

- Por qué se aplicó un pago.
- Qué monto se imputó a capital.
- Qué monto se imputó a mora.
- Qué monto se imputó a gasto.
- Qué monto quedó como SAF.
- Qué regla permitió la cuadratura.
- Quién aprobó una excepción.

---

# 20. Integraciones requeridas

## 20.1. Integración con Mónaco

Objetivo:

- Consultar deuda oficial.
- Consultar cuotas.
- Consultar capital.
- Consultar interés moratorio.
- Consultar gasto cobranza.
- Consultar estado operación.
- Actualizar valores al momento de pago.

## 20.2. Integración OCR

Objetivo:

- Leer comprobantes.
- Extraer datos estructurados.
- Identificar monto, fecha, banco, cuenta y folio.
- Entregar nivel de confianza.

## 20.3. Integración bancaria / cartola

Objetivo:

- Esta integración queda fuera de alcance temporal.
- En una fase posterior se evaluará validar existencia del abono.
- En una fase posterior se evaluará evitar uso duplicado de transacciones con cartola.

## 20.4. Integración con sistema de aplicación / Recaudaciones

Objetivo:

- Enviar pagos cuadrados.
- Recibir estado de aplicación.
- Registrar observaciones o rechazos.
- En una etapa posterior, el Coordinador Tanner recibe el pago y gestiona su conciliación y seguimiento.

---

# 21. Criterios de aceptación funcionales

## 21.1. Creación de compromisos

- Dado un cliente existente, cuando el ejecutivo seleccione cuotas, entonces la plataforma debe consultar Mónaco y mostrar el desglose oficial.
- Dado un compromisos creado, cuando se guarde, entonces debe quedar asociado a un ID único y a la fecha compromiso de pago.

## 21.2. Carga de comprobante

- Dado un comprobante válido, cuando se cargue, entonces el OCR debe extraer monto, fecha y banco si están disponibles.
- Dado un comprobante duplicado, cuando se cargue nuevamente, entonces el sistema debe advertir duplicidad.

## 21.3. Validación Mónaco

- Dado un pago recibido, cuando se inicie la cuadratura, entonces la plataforma debe consultar Mónaco actualizado antes de aplicar.
- Dado que Mónaco no esté disponible, entonces el pago no debe aplicarse automáticamente.

## 21.4. Interés moratorio

- Dado un excedente pagado por el cliente, cuando Mónaco actualizado permita absorberlo en interés moratorio, entonces la plataforma debe imputarlo a mora.
- Dado un excedente pagado por el cliente, cuando Mónaco actualizado no permita absorberlo en mora, entonces la plataforma debe registrar el excedente como SAF.
- Dado un interés moratorio mayor al informado por Mónaco, cuando el ejecutivo intente aplicarlo, entonces la plataforma debe bloquear la operación.

## 21.5. Tolerancia

- Dado un faltante menor o igual a $10.000, cuando el pago se cuadre, entonces la plataforma debe permitir cuadratura con tolerancia.
- Dado un faltante superior a $10.000, cuando el pago se cuadre, entonces la plataforma debe derivar a supervisor.

## 21.6. SAF

- Dado un pago mayor al monto Mónaco actualizado, cuando se aplique la deuda, entonces el excedente debe quedar registrado como SAF.
- Dado un SAF generado, entonces debe aparecer en la previsualización de imputación y en la auditoría.

## 21.7. Auditoría

- Dado cualquier cambio de estado, cuando ocurra, entonces debe quedar registrado usuario, fecha, acción y detalle.
- Dado un pago aplicado, cuando se revise posteriormente, entonces debe ser posible reconstruir la regla aplicada y los montos imputados.

---

# 22. Criterios de éxito del proyecto

La plataforma será exitosa si permite:

- Reducir rechazos por pagos mal subidos.
- Eliminar el uso operativo de Excel para cuadratura.
- Reducir reprocesos de Recaudaciones.
- Disminuir consultas internas por reglas de mora y SAF.
- Aumentar la trazabilidad de cada pago.
- Acelerar la aplicación de pagos correctamente cuadrados.
- Estandarizar criterios entre ejecutivos, supervisores y Recaudaciones.
- Medir errores por causa, ejecutivo, campaña y cartera.

---

# 23. Conclusión

La nueva plataforma de pagos Tanner debe transformar un proceso manual, dependiente de planillas y criterio individual, en un flujo gobernado por reglas, validaciones automáticas y trazabilidad completa.

La clave del diseño es separar claramente:

- Monto acordado.
- Monto Mónaco original.
- Monto Mónaco actualizado.
- Monto efectivamente transferido.
- Monto aplicado.
- Monto imputado a mora.
- Monto imputado a gasto.
- Monto registrado como SAF.

El sistema debe resolver automáticamente los casos simples, explicar los casos con diferencias y derivar a supervisión los casos fuera de regla. De esta forma, la operación deja de depender de Excel y de interpretaciones manuales, reduciendo errores estructurales y entregando a Recaudaciones pagos ya validados, cuadrados y auditables.

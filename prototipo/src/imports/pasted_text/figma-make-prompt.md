Este sería el prompt que usaría para **Figma Make**. Está pensado para que Figma no sólo genere las pantallas, sino también la arquitectura del proyecto, componentes, flujos, estructuras JSON y el modelo del motor.

---

# Prompt para Figma Make

Actúa como un **Lead Product Designer, UX Architect, Solution Architect y Staff Full Stack Engineer** especializado en plataformas Fintech para cobranza bancaria.

Utiliza como documento principal el archivo **`requerimiento_motor_pagos_tanner_optimizado.md`** adjunto.

Utiliza además la carpeta **img.zip** como guía de identidad visual, colores, logos, iconografía, estilos, componentes, tipografías y branding. Mantén una apariencia corporativa moderna, limpia y consistente con el material entregado.

## Objetivo

Diseñar una plataforma completa para Tanner que automatice completamente el proceso de gestión de acuerdos de pago, recepción de pagos, reliquidación, conciliación y envío a Recaudaciones, eliminando completamente el uso de Excel y minimizando la intervención manual.

La solución debe estar orientada a construir un **Motor de Liquidación y Conciliación**.

No diseñar únicamente pantallas.

Diseñar el producto completo.

---

# Arquitectura funcional

La solución debe considerar los siguientes módulos:

* Dashboard
* Gestión de Clientes
* Consulta de Deuda (Monaco)
* Gestión de Acuerdos
* Recepción de Pagos
* OCR de comprobantes
* Motor de Reliquidación
* Motor de Conciliación
* Motor de Reglas
* Bandeja de Excepciones
* Workflow
* Recaudaciones
* Administración
* Auditoría
* Configuración

---

# Principios funcionales

Separar completamente los conceptos:

* Acuerdo Comercial
* Evento de Pago
* Liquidación
* Aplicación

Cada uno debe tener su propio ciclo de vida.

Nunca mezclar estos conceptos.

---

# Casos funcionales

Diseñar considerando todos los escenarios.

Caso normal

* Pago exacto
* Pago mismo día

Caso 2

Pago fuera de fecha

Caso 3

Dos pagos

40%

60%

Caso 4

Tres pagos

Caso 5

Pago superior

Generación automática de SAF

Caso 6

Pago menor dentro de tolerancia

±10.000

Caso 7

Pago menor fuera de tolerancia

Caso 8

Cliente paga solamente algunas cuotas del acuerdo

Ejemplo

Acuerdo

4 cuotas

400.000

Pago

250.000

El motor debe encontrar automáticamente el subconjunto de cuotas que mejor calce.

Aplicar esas cuotas.

Generar automáticamente SAF.

Dejar cuotas restantes pendientes.

Caso 9

No existe combinación posible.

Enviar a revisión manual.

---

# Motor de Conciliación

Diseñar visualmente cómo funciona.

Debe mostrar:

Acuerdo

↓

Eventos de pago

↓

Reliquidación

↓

Conciliación

↓

Resultado

---

# Estados

Diseñar estados visuales.

Por ejemplo

Creado

Negociado

Pendiente

Pago recibido

Pago parcial

Reliquidando

Conciliando

Aceptado

Aceptado por tolerancia

Saldo a Favor

Pendiente segundo pago

Excepción

Revisión Manual

Enviado a Recaudaciones

Aplicado

Finalizado

---

# Pantallas

Generar prototipos completos para:

Login

Dashboard Ejecutivo

Dashboard Supervisor

Dashboard Recaudaciones

Dashboard Operacional

Consulta Cliente

Detalle Crédito

Detalle Monaco

Creación de Acuerdo

Detalle Acuerdo

Recepción de Pago

Carga OCR

Validación OCR

Detalle Evento de Pago

Motor de Reliquidación

Motor de Conciliación

Resultado de Conciliación

Bandeja de Excepciones

Detalle de Excepción

Historial del Crédito

Timeline

Liquidación Final

Recaudaciones

Administración

Usuarios

Roles

Empresas

Configuraciones

Parámetros

Tolerancias

Reglas

Auditoría

Logs

---

# Componentes

Crear Design System reutilizable.

Buttons

Cards

Tables

Inputs

Badges

Status

Dialogs

Modals

Tabs

Timeline

Wizard

Stepper

Notifications

Toasts

Accordions

Search

DataGrid

Charts

---

# UX

Diseñar experiencia tipo:

Linear

Stripe

HubSpot

Notion

Atlassian

Material Design 3

Con navegación simple.

Muy poco texto.

Mucho énfasis en estados.

---

# Entregables adicionales

Generar también las siguientes estructuras JSON.

## Modelo de datos

acuerdo.json

eventoPago.json

liquidacion.json

credito.json

cliente.json

cuota.json

motorReglas.json

workflow.json

usuario.json

empresa.json

OCR.json

simulador.json

monaco.json

conciliacion.json

auditoria.json

recaudacion.json

configuracion.json

---

## Catálogos

estadosAcuerdo.json

estadosPago.json

estadosConciliacion.json

estadosWorkflow.json

tiposExcepcion.json

tiposPago.json

tiposDocumento.json

roles.json

permisos.json

---

## Configuración

reglasMotor.json

tolerancias.json

parametros.json

workflowEstados.json

colasTrabajo.json

---

## APIs

Generar contratos JSON para:

Consultar Monaco

Consultar Simulador

Registrar Acuerdo

Registrar Evento

Registrar OCR

Ejecutar Conciliación

Ejecutar Reliquidación

Enviar Recaudaciones

Consultar Historial

Consultar Auditoría

---

## Ejemplos

Generar ejemplos JSON completos para todos los casos de negocio:

* Pago normal
* Pago parcial
* Pago en dos transferencias
* Pago fuera de fecha
* Pago superior
* Pago inferior
* Pago con SAF
* Pago con tolerancia
* Pago de subconjunto de cuotas
* Caso sin conciliación automática
* Derivación a revisión manual

Todos los ejemplos deben ser coherentes entre sí y representar datos reales de una institución financiera.

---

# Resultado esperado

El resultado debe ser un proyecto de Figma completamente navegable que incluya:

* Arquitectura funcional.
* Mapa de navegación.
* Flujos de usuario.
* Wireframes.
* Interfaces de alta fidelidad.
* Sistema de diseño.
* Componentes reutilizables.
* Diagramas del motor de conciliación.
* Prototipo interactivo.
* Estructuras JSON.
* Modelo de datos.
* Contratos de APIs.
* Casos de uso y estados.

La solución debe ser suficientemente detallada para servir como base de trabajo para un equipo de UX, Frontend, Backend, Arquitectura y QA, permitiendo iniciar el desarrollo del Motor de Liquidación y Conciliación de Tanner sin necesidad de redefinir el diseño funcional.

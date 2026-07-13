# Tanner — Motor de Pagos

Prototipo de diseño para un motor de pagos de **Tanner**: gestión, reliquidación y cuadratura
de pagos para el proceso de cobranza y conciliación bancaria. No hay backend ni integración de
datos real — todo es un prototipo de UI *click-through*, del lado del cliente, con datos mock.

El alcance funcional está descrito en los documentos de requerimientos bajo `docs/requirements/`:

- `requerimiento_plataforma_pagos_tanner.md` — el más amplio y vigente: flujo completo, las 8
  pantallas requeridas (§14), roles y permisos, y el motor de reglas de cuadratura.
- `requerimiento_motor_pagos_tanner_optimizado.md` — más acotado, enfocado en el motor de
  reliquidación.

Léelos antes de proponer nuevas pantallas o flujos: definen el vocabulario de negocio que la UI
debe respetar (por ejemplo, **"compromiso de pago" (`CP-...`)**, no "acuerdo") y las reglas de
negocio (tolerancia de $10.000, imputación a mora vs. SAF, Mónaco como fuente de verdad,
excepciones) que la UI busca reflejar.

## Estructura del repositorio

- **`prototipo/`** — el prototipo activo. Vite + React 18 + TypeScript, exportado desde Figma
  Make. Es el que se debe trabajar salvo que se indique lo contrario.
- **`frontend/`** — un prototipo anterior en HTML/CSS/JS vanilla. El `index.html` de la raíz
  redirige aquí. Se mantiene como referencia.
- **`legacy/`** — un prototipo aún más antiguo en JS vanilla, reemplazado por los otros dos.
  Solo como referencia.
- **`docs/`** — documentos de requerimientos, minutas de reuniones (PDF) y assets de diseño
  (exports de Figma/Stitch).
- **`sample-data/`** — artefactos reales de ejemplo (comprobantes de transferencia, cartolas
  bancarias `.xlsx`, avisos `.eml`, capturas de pantalla) que el flujo de conciliación debe
  manejar.

## Requisitos

- Node.js (con npm) — necesario para `prototipo/`.
- No hay backend ni base de datos que instalar: todo corre en el navegador con datos mock.

## Instalación y ejecución

Desde la raíz del repositorio:

```bash
./start.sh
```

Esto instala las dependencias de `prototipo/` la primera vez y levanta el servidor de desarrollo
de Vite en `http://127.0.0.1:5173/`.

Equivalente manual, desde `prototipo/`:

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción -> prototipo/dist
```

No hay scripts de lint ni de test configurados en `prototipo/package.json`.

El lockfile válido es `package-lock.json` (npm), aunque también exista un `pnpm-workspace.yaml`
(remanente del export de Figma Make, fijado a linux glibc — no aplica para desarrollo local en
macOS). Usa npm.

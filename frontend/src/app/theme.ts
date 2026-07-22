export const clp = (n: number) =>
  "$" + new Intl.NumberFormat("es-CL").format(n);

export const FONT_UI = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
export const FONT_MONO = '"Courier Prime", ui-monospace, SFMono-Regular, monospace';

// ── Colors ─────────────────────────────────────────────────────────────────────
export const C = {
  navy:    "#001e3d",
  navy2:   "#002080",
  blue:    "#005cb9",
  blueSoft:"rgba(0,92,185,0.10)",
  green:   "#16a34a",
  greenSoft:"rgba(22,163,74,0.10)",
  amber:   "#d97706",
  amberSoft:"rgba(217,119,6,0.10)",
  red:     "#be123c",
  redSoft: "rgba(190,18,60,0.09)",
  cyan:    "#0891b2",
  cyanSoft:"rgba(8,145,178,0.10)",
  turquoise:"#4dd2ff",
  text:    "#0b203d",
  muted:   "#64748b",
  border:  "rgba(15,23,42,0.10)",
  bg:      "#edf3fb",
  white:   "#ffffff",
  mono:    FONT_MONO,
};

// ── Status badge ───────────────────────────────────────────────────────────────
// Estados del flujo (doc §13). Misma paleta de colores ya definida en C.
export const STATUS: Record<string, [string, string, string]> = {
  PENDIENTE:              [C.amber, C.amberSoft, "Pendiente"],
  COMPROMISO_CREADO:      [C.blue,  C.blueSoft,  "Compromiso creado"],
  // Estado del compromiso (¿existe un acuerdo vigente con el cliente o no?):
  // solo dos valores. Distinto del eje de Pago (cuánto de lo comprometido se
  // pagó), que también es binario: Total o Parcial.
  COMPROMETIDO:           [C.blue,  C.blueSoft,  "Comprometido"],
  SIN_COMPROMISO:         [C.muted, "rgba(100,116,139,0.10)", "Sin compromiso"],
  TOTAL:                  [C.green, C.greenSoft, "Total"],
  PARCIAL:                [C.amber, C.amberSoft, "Parcial"],
  // Situación: solo aplica a compromisos vigentes (estado Comprometido) que ya
  // tienen un pago para validar contra Mónaco.
  SITUACION_PENDIENTE:    [C.amber, C.amberSoft, "Pago pendiente de validar"],
  SITUACION_VALIDADO:     [C.green, C.greenSoft, "Pago validado"],
  SITUACION_OBSERVADO:    [C.cyan,  C.cyanSoft,  "Pago validado con observaciones"],
  SITUACION_RECHAZADO:    [C.red,   C.redSoft,   "Pago rechazado"],
  PAGO_RECIBIDO:          [C.blue,  C.blueSoft,  "Pago recibido"],
  CON_SAF:                [C.cyan,  C.cyanSoft,  "Con SAF"],
  EN_REVISION:            [C.red,   C.redSoft,   "En revisión"],
  RECAUDACIONES:          [C.green, C.greenSoft, "Recaudaciones"],
  CERRADO:                [C.green, C.greenSoft, "Cerrado"],
  JUDICIAL:               [C.red,   C.redSoft,   "Judicial"],
  VENCIDA:                [C.amber, C.amberSoft, "Vencida"],
  VIGENTE:                [C.green, C.greenSoft, "Vigente"],
  VALIDADO:               [C.green, C.greenSoft, "Validado"],
  APROBADO:               [C.green, C.greenSoft, "Aprobado"],
  RECHAZADO:               [C.red, C.redSoft, "Rechazado"],
  // Variantes en femenino, para estados de "solicitud de cobranza" (SOLCOB).
  APROBADA:                [C.green, C.greenSoft, "Aprobada"],
  RECHAZADA:               [C.red, C.redSoft, "Rechazada"],
  MATCH_EXACTO:            [C.green, C.greenSoft, "Match exacto"],
  MATCH_PROBABLE:          [C.amber, C.amberSoft, "Match probable"],
  CUADRADO_EXACTO:         [C.green, C.greenSoft, "Cuadrado exacto"],
  CUADRADO_TOLERANCIA:     [C.amber, C.amberSoft, "Cuadrado con tolerancia"],
  CUADRADO_MORA:           [C.cyan,  C.cyanSoft,  "Cuadrado con mora actualizada"],
  CUADRADO_SAF:            [C.cyan,  C.cyanSoft,  "Cuadrado con SAF"],
  REQUIERE_AUTORIZACION:   [C.red,   C.redSoft,   "Requiere autorización"],
  OBSERVADO:               [C.red,   C.redSoft,   "Observado"],
  ENVIADO_APLICACION:      [C.blue,  C.blueSoft,  "Enviado a aplicación"],
  APLICADO:                [C.green, C.greenSoft, "Aplicado"],
  // Historial de sincronizaciones contra Mónaco/Tubo/Flokzu.
  COMPLETADA:              [C.green, C.greenSoft, "Completada"],
  FALLIDA:                 [C.red,   C.redSoft,   "Fallida"],
};

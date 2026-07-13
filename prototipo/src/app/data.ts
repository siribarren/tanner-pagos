import { C, clp } from "./theme";

// Cuotas de ejemplo del crédito 3350049 (Pamela González Álvarez), fuente Mónaco.
// Compartido entre CompromisoNuevo (selección de cuotas) y CompromisoDetalle (seguimiento).
// Desglose según "Excel de cuotas" del documento de requerimientos: valor nominal +
// interés de mora + gastos de cobranza + CECO + SAF + costas judiciales = aPagar
// (MONTO_TOTAL CUOTA A PAGAR).
export const CUOTAS = [
  { num: 10, venc: "20/01/2026", valorNominal: 94000, mora: 3729, gastosCobranza: 9800, ceco: 1500, saf: 0, costasJudiciales: 1471, aPagar: 110500, estado: "JUDICIAL" },
  { num: 11, venc: "20/02/2026", valorNominal: 93000, mora: 2817, gastosCobranza: 9600, ceco: 1500, saf: 0, costasJudiciales: 1283, aPagar: 108200, estado: "JUDICIAL" },
  { num: 12, venc: "20/03/2026", valorNominal: 92000, mora: 1824, gastosCobranza: 9500, ceco: 1500, saf: 0, costasJudiciales:  976, aPagar: 105800, estado: "VENCIDA"  },
  { num: 13, venc: "20/04/2026", valorNominal: 90000, mora:  812, gastosCobranza: 9200, ceco: 1400, saf: 0, costasJudiciales: 1988, aPagar: 103400, estado: "VENCIDA"  },
  { num: 14, venc: "20/05/2026", valorNominal: 91000, mora:    0, gastosCobranza: 9000, ceco: 1200, saf: 0, costasJudiciales: 2254, aPagar: 103454, estado: "VIGENTE"  },
];

export const PERFIL_BASE = {
  nombre: "Carlos",
  apellido: "Morales",
};

// ════════════════════════════════════════════════════════════════════════════════
// INFO PARA "CREAR COMPROMISO" — por ID de crédito. Se usa cuando se hace clic en
// un cliente "Sin compromiso" o "Pendiente" de la cartera (CarteraTable), para que
// la pantalla de selección de cuotas muestre los datos del cliente correcto en
// vez de quedarse siempre con el ejemplo de Pamela.
// ════════════════════════════════════════════════════════════════════════════════
export type InfoCompromisoNuevo = {
  cliente: string;
  rut: string;
  cartera: string;
  cuotas: typeof CUOTAS;
  seleccionInicial: number[];
};

export const INFO_COMPROMISO_NUEVO: Record<string, InfoCompromisoNuevo> = {
  "3350049": { cliente: "Pamela González Álvarez", rut: "15.221.775-7", cartera: "Judicial", cuotas: CUOTAS, seleccionInicial: [10, 11, 12, 13] },
  "3102456": {
    cliente: "Jorge Espinoza Torres", rut: "17.654.321-K", cartera: "Judicial",
    seleccionInicial: [23],
    cuotas: [
      { num: 23, venc: "10/07/2026", valorNominal: 280000, mora: 18000, gastosCobranza: 20000, ceco: 4000, saf: 0, costasJudiciales: 5000, aPagar: 327000, estado: "JUDICIAL" },
    ],
  },
  "2876543": {
    cliente: "Ana Castillo Bravo", rut: "14.876.543-1", cartera: "Vigente",
    seleccionInicial: [3],
    cuotas: [
      { num: 3, venc: "20/07/2026", valorNominal: 140000, mora: 3000, gastosCobranza: 12000, ceco: 2200, saf: 0, costasJudiciales: 2000, aPagar: 159200, estado: "VENCIDA" },
    ],
  },
  "2198734": {
    cliente: "Patricio Vargas Leiva", rut: "20.123.456-7", cartera: "Vigente",
    seleccionInicial: [6, 7],
    cuotas: [
      { num: 6, venc: "22/06/2026", valorNominal: 92000, mora: 4200, gastosCobranza: 8000, ceco: 1500, saf: 0, costasJudiciales: 1300, aPagar: 107000, estado: "JUDICIAL" },
      { num: 7, venc: "22/07/2026", valorNominal: 93000, mora: 3800, gastosCobranza: 8000, ceco: 1500, saf: 0, costasJudiciales: 1700, aPagar: 108000, estado: "VENCIDA" },
    ],
  },
  "3876209": {
    cliente: "Francisca Ibáñez Rojas", rut: "16.987.654-3", cartera: "Castigada",
    seleccionInicial: [4, 5, 6],
    cuotas: [
      { num: 4, venc: "25/05/2026", valorNominal: 38000, mora: 1600, gastosCobranza: 3200, ceco: 500, saf: 0, costasJudiciales: 700,  aPagar: 44000, estado: "JUDICIAL" },
      { num: 5, venc: "25/06/2026", valorNominal: 37000, mora: 1200, gastosCobranza: 3200, ceco: 500, saf: 0, costasJudiciales: 1100, aPagar: 43000, estado: "JUDICIAL" },
      { num: 6, venc: "25/07/2026", valorNominal: 38500, mora:  700, gastosCobranza: 3300, ceco: 500, saf: 0, costasJudiciales: 2000, aPagar: 45000, estado: "VENCIDA"  },
    ],
  },
};

// ════════════════════════════════════════════════════════════════════════════════
// CARTERA DEL EJECUTIVO — solo dos categorías posibles:
//
//  - Sin compromiso: nunca se negoció con el cliente (o el compromiso anterior
//    quedó sin efecto, p. ej. por un pago rechazado). Solo tiene ID de crédito,
//    RUT y el monto de la deuda. Sin fecha, sin Pago, sin Situación.
//  - Comprometido: existe un acuerdo vigente, con fecha comprometida, Pago
//    (Total/Parcial) y Situación de validación poblados.
//
// COMPROMISOS_DETALLE guarda la ficha rica (Resumen IA, cuotas, historial) SOLO
// para los créditos con estado "Comprometido", que son los únicos con algo que
// mostrar en detalle. CARTERA_EJECUTIVO es la fuente única de verdad para "Mi
// cartera" en el Panel; los 3 primeros ítems se derivan de COMPROMISOS_DETALLE
// para que ambas pantallas nunca queden desincronizadas.
// ════════════════════════════════════════════════════════════════════════════════
export type CompromisoFicha = {
  id: string;
  rut: string;
  cliente: string;
  fechaCompromiso: string;        // formato "DD-Mes"
  montoComprometido: number;
  montoRecibido: number;
  // Pago (Total | Parcial) es el TIPO de pago comprometido (¿de una vez o en
  // partes?), independiente de si ya se recibió algo. Por eso un registro con
  // Situación "Pago pendiente de validar" puede perfectamente ser Pago "Total"
  // (comprometió pagar todo de una vez, simplemente aún no llega/valida).
  estadoPago: string;             // clave de STATUS para el chip "Pago" (TOTAL | PARCIAL)
  situacion: string;              // clave de STATUS para "Situación" (SITUACION_*)
  resumenIA: string;
  cuotas: Array<{ num: number; venc: string; valorNominal: number; mora: number; gastosCobranza: number; ceco: number; saf: number; costasJudiciales: number; aPagar: number; estado: string }>;
  historial: Array<{ fecha: string; hora: string; quien: string; desc: string; dot: string }>;
};

export const COMPROMISOS_DETALLE: Record<string, CompromisoFicha> = {
  "3350049": {
    id: "3350049", rut: "15.221.775-7", cliente: "Pamela González Álvarez",
    fechaCompromiso: "15-Julio",
    montoComprometido: 209200, montoRecibido: 0, estadoPago: "PARCIAL", situacion: "SITUACION_PENDIENTE",
    resumenIA: "Pago comprometido para el 15 de Julio por $209.200 correspondientes a 2 cuotas, cuota 12 del 20/03/2026 y cuota 13 del 20/04/2026. El crédito es por 24 cuotas, se generó el 02/01/2024 y se han pagado 20 cuotas. No se realizaron rebajas a interés u honorarios.",
    cuotas: CUOTAS.filter((c) => [12, 13].includes(c.num)),
    historial: [
      { fecha: "01/07/2026", hora: "10:30", quien: "Carlos Morales", desc: "Compromiso creado · cuotas 12 y 13 comprometidas para el 15 de julio", dot: C.muted },
      { fecha: "05/07/2026", hora: "09:15", quien: "Sistema",        desc: "Consulta a Mónaco · deuda vigente confirmada",                          dot: C.blue  },
    ],
  },
  "3287612": {
    id: "3287612", rut: "12.344.892-3", cliente: "Rodrigo Soto Fuentes",
    fechaCompromiso: "12-Julio",
    montoComprometido: 150000, montoRecibido: 150000, estadoPago: "PARCIAL", situacion: "SITUACION_OBSERVADO",
    resumenIA: "Pago comprometido para el 12 de Julio por $150.000 correspondiente a la cuota 8. Observación: el cliente pagó un monto en la fecha indicada y el saldo lo pagó presencial al día siguiente. El crédito es por 18 cuotas, se generó el 14/03/2024 y se han pagado 7 cuotas completas.",
    cuotas: [
      { num: 8, venc: "12/07/2026", valorNominal: 130000, mora: 5000, gastosCobranza: 10000, ceco: 2000, saf: 0, costasJudiciales: 3000, aPagar: 150000, estado: "VENCIDA" },
    ],
    historial: [
      { fecha: "28/06/2026", hora: "11:05", quien: "Daniela Poblete", desc: "Compromiso creado · cuota 8 comprometida para el 12 de julio", dot: C.muted },
      { fecha: "12/07/2026", hora: "16:45", quien: "OCR",             desc: "Comprobante cargado · $65.800 · transferencia en la fecha comprometida", dot: C.blue  },
      { fecha: "13/07/2026", hora: "10:10", quien: "Sucursal",        desc: "Pago presencial · $84.200 · saldo comprometido cubierto al día siguiente", dot: C.amber },
      { fecha: "13/07/2026", hora: "10:15", quien: "Motor",           desc: "Cuadratura · pago validado con observaciones, saldo pagado de forma presencial y diferida", dot: C.amber },
    ],
  },
  "2941087": {
    id: "2941087", rut: "9.876.543-2", cliente: "Claudia Reyes Mora",
    fechaCompromiso: "18-Julio",
    montoComprometido: 108500, montoRecibido: 0, estadoPago: "TOTAL", situacion: "SITUACION_PENDIENTE",
    resumenIA: "Pago comprometido para el 18 de Julio por $108.500 correspondiente a la cuota 5. El crédito es por 12 cuotas, se generó el 22/09/2025 y se han pagado 4 cuotas. No se realizaron rebajas a interés u honorarios.",
    cuotas: [
      { num: 5, venc: "18/07/2026", valorNominal: 95000, mora: 2500, gastosCobranza: 8500, ceco: 1500, saf: 0, costasJudiciales: 1000, aPagar: 108500, estado: "VENCIDA" },
    ],
    historial: [
      { fecha: "02/07/2026", hora: "16:40", quien: "Carlos Morales", desc: "Compromiso creado · cuota 5 comprometida para el 18 de julio", dot: C.muted },
    ],
  },
  // Jorge no tiene compromiso vigente (volvió a "Pendiente" en la cartera): esta
  // ficha corresponde al pago que sí envió para la cuota 23, pero fue rechazado
  // — por eso el compromiso quedó sin resolver y hay que volver a comprometerlo.
  "3102456": {
    id: "3102456", rut: "17.654.321-K", cliente: "Jorge Espinoza Torres",
    fechaCompromiso: "10-Julio",
    montoComprometido: 327000, montoRecibido: 0, estadoPago: "PARCIAL", situacion: "SITUACION_RECHAZADO",
    resumenIA: "El cliente comprometió el pago de la cuota 23 por $327.000 para el 10 de Julio y envió un comprobante bajo la solicitud SOLCOB-84216, pero fue rechazado: el monto transferido no coincide con el monto exigido por Mónaco. El compromiso quedó sin resolver y vuelve a estado Pendiente. El crédito es por 30 cuotas, se generó el 05/11/2023 y se han pagado 22 cuotas.",
    cuotas: [
      { num: 23, venc: "10/07/2026", valorNominal: 280000, mora: 18000, gastosCobranza: 20000, ceco: 4000, saf: 0, costasJudiciales: 5000, aPagar: 327000, estado: "JUDICIAL" },
    ],
    historial: [
      { fecha: "25/06/2026", hora: "09:50", quien: "Carlos Morales", desc: "Compromiso creado · cuota 23 comprometida para el 10 de julio", dot: C.muted },
      { fecha: "10/07/2026", hora: "17:30", quien: "OCR",             desc: "Comprobante cargado · solicitud SOLCOB-84216",                    dot: C.blue  },
      { fecha: "11/07/2026", hora: "08:00", quien: "Recaudaciones",   desc: "Pago rechazado · monto transferido no coincide con Mónaco",       dot: C.red   },
    ],
  },
};

export type CarteraItem = {
  id: string;
  rut: string;
  cliente: string;
  estado: "SIN_COMPROMISO" | "COMPROMETIDO";
  monto: number;
  fechaCompromiso?: string;
  pago?: string;       // clave de STATUS (TOTAL | PARCIAL)
  situacion?: string;  // clave de STATUS (SITUACION_*)
};

const activo = (id: string): CarteraItem => {
  const f = COMPROMISOS_DETALLE[id];
  return {
    id: f.id, rut: f.rut, cliente: f.cliente, estado: "COMPROMETIDO",
    // El monto de "Mi cartera" es siempre el monto comprometido (o de las
    // cuotas), nunca el saldo neto — un pago validado con observaciones que
    // cubrió el 100% del compromiso (p. ej. 3287612) igual debe mostrar su
    // monto comprometido, nunca $0.
    monto: f.montoComprometido,
    fechaCompromiso: f.fechaCompromiso, pago: f.estadoPago, situacion: f.situacion,
  };
};

export const CARTERA_EJECUTIVO: CarteraItem[] = [
  activo("3350049"),
  activo("3287612"),
  activo("2941087"),
  // El pago que Jorge envió fue rechazado: el compromiso quedó sin efecto, así
  // que vuelve a "Sin compromiso" (no existe una categoría "Pendiente").
  { id: "3102456", rut: "17.654.321-K", cliente: "Jorge Espinoza Torres",   estado: "SIN_COMPROMISO",  monto: 327000 },
  // Sin compromiso: nunca se negoció con el cliente.
  { id: "2876543", rut: "14.876.543-1", cliente: "Ana Castillo Bravo",      estado: "SIN_COMPROMISO",  monto: 159200 },
  { id: "2198734", rut: "20.123.456-7", cliente: "Patricio Vargas Leiva",   estado: "SIN_COMPROMISO",  monto: 215000 },
  { id: "3876209", rut: "16.987.654-3", cliente: "Francisca Ibáñez Rojas",  estado: "SIN_COMPROMISO",  monto: 132000 },
];

// ════════════════════════════════════════════════════════════════════════════════
// CUADRATURA — por ID de crédito. Cada "Compromiso N" del motor de cuadratura tiene
// un tono ("ok" | "observado") que define su color/ícono; cuando hay observaciones,
// tieneObservaciones habilita el aviso de confirmación en el envío a Tanner.
// ════════════════════════════════════════════════════════════════════════════════
export type CuadraturaCheck = {
  n: number;
  titulo: string;
  resultado: string;
  tono: "ok" | "observado";
  campos: Array<[string, string]>;
};

// Desglose de la imputación por cuota (N° Cuota | Monto Cuota | Capital |
// Interés Moratorio | Gasto Cobranza — este último agrupa gastos de cobranza +
// CECO + costas judiciales). montoCuota siempre es capital + interesMoratorio +
// gastoCobranza.
export type CuadraturaCuotaRow = {
  numCuota: number;
  montoCuota: number;
  capital: number;
  interesMoratorio: number;
  gastoCobranza: number;
};

export type CuadraturaFicha = {
  id: string;
  rut: string;
  resumenIA: string;
  observacionDestacada?: string;
  checks: CuadraturaCheck[];
  cuotas: CuadraturaCuotaRow[];
  montoPagado: number;   // total efectivamente pagado/transferido, para comparar contra la suma de cuotas
  control: Array<{ label: string; val: string }>;
  tieneObservaciones: boolean;
};

export const CUADRATURA_DETALLE: Record<string, CuadraturaFicha> = {
  "3350049": {
    id: "3350049", rut: "15.221.775-7",
    resumenIA: "El cliente transfirió $209.200, correspondiente a las cuotas 12 y 13. El monto coincide exactamente con lo comprometido para el 15 de julio, sin diferencias ni observaciones.",
    checks: [
      { n: 1, titulo: "Monto", resultado: "Cliente paga monto exacto.", tono: "ok", campos: [["Monto comprometido", clp(209200)], ["Monto transferido", clp(209200)]] },
      { n: 2, titulo: "Fecha", resultado: "Cliente paga en la fecha comprometida.", tono: "ok", campos: [["Fecha comprometida", "15 de Julio"], ["Fecha de pago", "15 de Julio"]] },
      { n: 3, titulo: "Pago", resultado: "Pago parcial cumplido.", tono: "ok", campos: [["Tipo de pago", "Parcial"], ["Pago realizado", "Parcial"]] },
      { n: 4, titulo: "Verificación", resultado: "Transferencia verificada.", tono: "ok", campos: [["Tipo de verificación", "Comprobante de transferencia validado"]] },
    ],
    cuotas: [
      { numCuota: 12, montoCuota: 105800, capital: 92000, interesMoratorio: 1824, gastoCobranza: 11976 },
      { numCuota: 13, montoCuota: 103400, capital: 90000, interesMoratorio: 812,  gastoCobranza: 12588 },
    ],
    montoPagado: 209200,
    control: [
      { label: "Estado de cuadratura",   val: "Cuadrado exacto" },
      { label: "Regla aplicada",         val: "Regla 1 · Pago exacto sin diferencias" },
      { label: "Diferencia detectada",   val: clp(0) },
      { label: "Tolerancia utilizada",   val: "No aplica" },
      { label: "Requiere autorización",  val: "No" },
      { label: "Comprobante validado",   val: "Sí" },
      { label: "Cartola validada",       val: "No aplica · fuera de alcance en esta versión" },
      { label: "OCR validado",           val: "Sí · confianza 95%" },
      { label: "Mónaco actualizado",     val: "Sí" },
    ],
    tieneObservaciones: false,
  },
  "3287612": {
    id: "3287612", rut: "12.344.892-3",
    resumenIA: "El cliente completó el monto comprometido de $150.000 para la cuota 8, pero en dos partes: $65.800 por transferencia en la fecha comprometida y el saldo de $84.200 pagado de forma presencial al día siguiente.",
    observacionDestacada: "El cliente pagó un monto en la fecha indicada y el saldo lo pagó presencial al día siguiente.",
    checks: [
      { n: 1, titulo: "Monto", resultado: "Cliente completa el monto comprometido.", tono: "ok", campos: [["Monto comprometido", clp(150000)], ["Monto total recibido", clp(150000)]] },
      { n: 2, titulo: "Fecha", resultado: "Paga diferido.", tono: "observado", campos: [["Fecha comprometida", "12 de Julio"], ["Fecha del saldo", "13 de Julio · presencial"]] },
      { n: 3, titulo: "Pago", resultado: "Pago dividido en dos partes.", tono: "observado", campos: [["Tipo de pago", "Parcial"], ["Pago realizado", "Total, en dos abonos (transferencia + presencial)"]] },
      { n: 4, titulo: "Verificación", resultado: "Ambos comprobantes verificados.", tono: "ok", campos: [["Tipo de verificación", "Comprobante de transferencia + comprobante presencial"]] },
    ],
    cuotas: [
      { numCuota: 8, montoCuota: 150000, capital: 130000, interesMoratorio: 5000, gastoCobranza: 15000 },
    ],
    montoPagado: 150000,
    control: [
      { label: "Estado de cuadratura",   val: "Cuadrado con observaciones" },
      { label: "Regla aplicada",         val: "Regla 4 · Pago dividido, saldo pagado fuera del canal declarado" },
      { label: "Diferencia detectada",   val: clp(0) },
      { label: "Tolerancia utilizada",   val: "No aplica · monto total cubierto" },
      { label: "Requiere autorización",  val: "No" },
      { label: "Comprobante validado",   val: "Sí, con observación" },
      { label: "Cartola validada",       val: "No aplica · fuera de alcance en esta versión" },
      { label: "OCR validado",           val: "Sí · confianza 88%" },
      { label: "Mónaco actualizado",     val: "Sí" },
    ],
    tieneObservaciones: true,
  },
  "2941087": {
    id: "2941087", rut: "9.876.543-2",
    resumenIA: "El cliente transfirió $95.000 el 18 de julio, dentro de la fecha comprometida. Observación: el monto no coincide con el compromiso de $108.500 — no cubre el interés de mora ni los gastos de cobranza asociados a la cuota 5. Requiere revisión antes de aplicar.",
    observacionDestacada: "El monto no coincide con el compromiso. Se debe revisar la cuadratura antes de continuar.",
    checks: [
      { n: 1, titulo: "Monto", resultado: "Monto no coincide con el compromiso.", tono: "observado", campos: [["Monto comprometido", clp(108500)], ["Monto transferido", clp(95000)]] },
      { n: 2, titulo: "Fecha", resultado: "Cliente paga en la fecha comprometida.", tono: "ok", campos: [["Fecha comprometida", "18 de Julio"], ["Fecha de pago", "18 de Julio"]] },
      { n: 3, titulo: "Pago", resultado: "Pago parcial · no cubre lo comprometido.", tono: "observado", campos: [["Tipo de pago", "Total"], ["Pago realizado", "Parcial"]] },
      { n: 4, titulo: "Verificación", resultado: "Transferencia verificada.", tono: "ok", campos: [["Tipo de verificación", "Comprobante de transferencia validado"]] },
    ],
    cuotas: [
      { numCuota: 5, montoCuota: 108500, capital: 95000, interesMoratorio: 2500, gastoCobranza: 11000 },
    ],
    montoPagado: 95000,
    control: [
      { label: "Estado de cuadratura",   val: "Observado · monto no coincide" },
      { label: "Regla aplicada",         val: "Regla 2 · Pago menor al comprometido, no cubre accesorios" },
      { label: "Diferencia detectada",   val: clp(13500) },
      { label: "Tolerancia utilizada",   val: "Excede tolerancia de $10.000" },
      { label: "Requiere autorización",  val: "Sí" },
      { label: "Comprobante validado",   val: "Sí, con observación" },
      { label: "Cartola validada",       val: "No aplica · fuera de alcance en esta versión" },
      { label: "OCR validado",           val: "Sí · confianza 90%" },
      { label: "Mónaco actualizado",     val: "Pendiente de revisión" },
    ],
    tieneObservaciones: true,
  },
};

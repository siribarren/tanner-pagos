import { C, clp } from "./theme";

// Cuotas de ejemplo del crédito 3350049 (Pamela González Álvarez), fuente Mónaco.
// Fallback por defecto de CompromisoNuevo cuando no hay match por idCredito.
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
// GENERADORES DE MONTOS Y CUOTAS DE EJEMPLO — todos los créditos de ejemplo (tanto
// "Comprometido" como "Sin compromiso") usan un monto total aleatorio superior a
// $2.000.000, con cifras no "cerradas" (p. ej. $3.234.123, tal como llegan los
// montos reales desde Mónaco: capital + mora + gastos, nunca un número redondo),
// repartido en un número aleatorio de cuotas impagas entre 3 y 6. Se calculan una
// sola vez al cargar el módulo y se reutilizan en todas las pantallas (Cartera,
// ficha de detalle, cuadratura, pagos enviados, comprobante) para que ningún
// número quede desincronizado entre sí.
// ════════════════════════════════════════════════════════════════════════════════
function montoAleatorio(): number {
  return 2_050_000 + Math.floor(Math.random() * 4_000_000) + Math.floor(Math.random() * 1000);
}

// Reparte un monto aproximado en un número aleatorio de cuotas impagas (entre 3
// y 6), todas del mismo monto exacto (tal como se pactan las cuotas de un
// crédito real) — nunca "9 iguales + 1 distinta" por redondeo. Para lograrlo,
// el monto por cuota se redondea primero y el total real queda definido como
// `montoPorCuota * count`, así que se devuelve también el total ya cuadrado
// para que quien llama lo use en vez del aproximado original.
function generarCuotasImpagas(totalAproximado: number, primerNum: number, mesInicioISO: string): { total: number; cuotas: typeof CUOTAS } {
  const count = 3 + Math.floor(Math.random() * 4); // 3..6
  const montoPorCuota = Math.round(totalAproximado / count);
  const total = montoPorCuota * count;

  const [y, m] = mesInicioISO.split("-").map(Number);

  const cuotas = Array.from({ length: count }, (_, i) => {
    const aPagar = montoPorCuota;
    const mesFecha = new Date(y, m - 1 - (count - 1 - i), 20);
    const venc = `${String(mesFecha.getDate()).padStart(2, "0")}/${String(mesFecha.getMonth() + 1).padStart(2, "0")}/${mesFecha.getFullYear()}`;
    const mora = Math.round(aPagar * 0.04 / 100) * 100;
    const gastosCobranza = Math.round(aPagar * 0.07 / 100) * 100;
    const ceco = Math.round(aPagar * 0.015 / 100) * 100;
    const costasJudiciales = Math.round(aPagar * 0.015 / 100) * 100;
    const valorNominal = aPagar - mora - gastosCobranza - ceco - costasJudiciales;
    return {
      num: primerNum + i,
      venc,
      valorNominal,
      mora,
      gastosCobranza,
      ceco,
      saf: 0,
      costasJudiciales,
      aPagar,
      estado: i < count - 2 ? "JUDICIAL" : "VENCIDA",
    };
  });

  return { total, cuotas };
}

// "cuota 12, 13 y 14" — para armar frases de resumen/historial sin repetir "cuota".
function numerosCuotas(cuotas: typeof CUOTAS): string {
  const nums = cuotas.map((c) => String(c.num));
  return nums.length === 1 ? nums[0] : `${nums.slice(0, -1).join(", ")} y ${nums[nums.length - 1]}`;
}

// ════════════════════════════════════════════════════════════════════════════════
// CRÉDITOS "SIN COMPROMISO" — monto y cuotas impagas generados al cargar el módulo.
// ════════════════════════════════════════════════════════════════════════════════
const { total: MONTO_3102456, cuotas: CUOTAS_3102456 } = generarCuotasImpagas(montoAleatorio(), 18, "2026-07");
const { total: MONTO_2876543, cuotas: CUOTAS_2876543 } = generarCuotasImpagas(montoAleatorio(), 1, "2026-07");
const { total: MONTO_2198734, cuotas: CUOTAS_2198734 } = generarCuotasImpagas(montoAleatorio(), 1, "2026-07");
const { total: MONTO_3876209, cuotas: CUOTAS_3876209 } = generarCuotasImpagas(montoAleatorio(), 1, "2026-05");

// ════════════════════════════════════════════════════════════════════════════════
// INFO PARA "CREAR COMPROMISO" — por ID de crédito. Se usa cuando se hace clic en
// un cliente "Sin compromiso" de la cartera (CarteraTable), para que la pantalla
// de selección de cuotas muestre los datos del cliente correcto en vez de
// quedarse siempre con el ejemplo de Pamela.
// ════════════════════════════════════════════════════════════════════════════════
export type InfoCompromisoNuevo = {
  cliente: string;
  rut: string;
  cartera: string;
  cuotas: typeof CUOTAS;
  seleccionInicial: number[];
  // Fecha en que el ejecutivo contactó al cliente, si ya hubo un contacto (p. ej.
  // llamada donde el cliente no dio fecha de compromiso o se negó a comprometerse).
  // Sin definir para clientes que aún no han sido contactados nunca.
  fechaContacto?: string;
  // Fecha en que Mónaco cargó esta deuda a la cartera del ejecutivo — informativo,
  // se muestra con menos peso visual que las 3 fechas relevantes del compromiso.
  fechaCargaCartera: string;
};

export const INFO_COMPROMISO_NUEVO: Record<string, InfoCompromisoNuevo> = {
  "3350049": { cliente: "Pamela González Álvarez", rut: "15.221.775-7", cartera: "Judicial", cuotas: CUOTAS, seleccionInicial: [10, 11, 12, 13], fechaCargaCartera: "08-Julio" },
  "3102456": { cliente: "Jorge Espinoza Torres", rut: "17.654.321-K", cartera: "Judicial", cuotas: CUOTAS_3102456, seleccionInicial: CUOTAS_3102456.map((c) => c.num), fechaCargaCartera: "08-Junio" },
  "2876543": { cliente: "Ana Castillo Bravo", rut: "14.876.543-1", cartera: "Vigente", cuotas: CUOTAS_2876543, seleccionInicial: CUOTAS_2876543.map((c) => c.num), fechaCargaCartera: "08-Julio" },
  // Patricio ya fue contactado (14 de julio) pero no dio fecha de compromiso —
  // caso de ejemplo de "Nuevo contacto programado" en Mis Compromisos.
  "2198734": { cliente: "Patricio Vargas Leiva", rut: "20.123.456-7", cartera: "Vigente", cuotas: CUOTAS_2198734, seleccionInicial: CUOTAS_2198734.map((c) => c.num), fechaContacto: "14-Julio", fechaCargaCartera: "08-Julio" },
  "3876209": { cliente: "Francisca Ibáñez Rojas", rut: "16.987.654-3", cartera: "Castigada", cuotas: CUOTAS_3876209, seleccionInicial: CUOTAS_3876209.map((c) => c.num), fechaCargaCartera: "08-Junio" },
};

// ════════════════════════════════════════════════════════════════════════════════
// CRÉDITOS "COMPROMETIDO" — monto y cuotas comprometidas generados al cargar el
// módulo. 3287612 se paga en dos partes (transferencia + presencial); 2941087
// se paga con un monto menor al comprometido (caso de ejemplo de observación en
// Cuadratura/Comprobante). Ambos derivados quedan exportados para que Panel,
// PagosEnviados y Comprobante los usen en vez de repetir números.
// ════════════════════════════════════════════════════════════════════════════════
const { total: MONTO_3350049, cuotas: CUOTAS_COMPROMETIDAS_3350049 } = generarCuotasImpagas(montoAleatorio(), 12, "2026-07");

const { total: MONTO_3287612, cuotas: CUOTAS_COMPROMETIDAS_3287612 } = generarCuotasImpagas(montoAleatorio(), 6, "2026-07");
export const ABONO_TRANSFERENCIA_3287612 = Math.round(MONTO_3287612 * 0.4387 / 1000) * 1000;
export const ABONO_PRESENCIAL_3287612 = MONTO_3287612 - ABONO_TRANSFERENCIA_3287612;

const { total: MONTO_2941087, cuotas: CUOTAS_COMPROMETIDAS_2941087 } = generarCuotasImpagas(montoAleatorio(), 3, "2026-07");
export const MONTO_TRANSFERIDO_2941087 = MONTO_2941087 - Math.round(MONTO_2941087 * 0.13 / 1000) * 1000;

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
  // Las 3 fechas relevantes de un compromiso — formato "DD-Mes":
  // contacto (cuándo se llamó/escribió al cliente), compromiso (fecha acordada
  // de pago) y pago (cuándo el cliente efectivamente pagó, si ya ocurrió).
  fechaContacto: string;
  fechaCompromiso: string;
  fechaPago?: string;
  // Fecha en que Mónaco cargó esta deuda a la cartera — informativo, menos peso
  // visual que las 3 fechas relevantes.
  fechaCargaCartera: string;
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
    fechaContacto: "01-Julio", fechaCompromiso: "15-Julio", fechaCargaCartera: "08-Julio",
    montoComprometido: MONTO_3350049, montoRecibido: 0, estadoPago: "PARCIAL", situacion: "SITUACION_PENDIENTE",
    resumenIA: `Pago comprometido para el 15 de Julio por ${clp(MONTO_3350049)} correspondientes a ${CUOTAS_COMPROMETIDAS_3350049.length} cuotas: ${numerosCuotas(CUOTAS_COMPROMETIDAS_3350049)}. El crédito es por 24 cuotas, se generó el 02/01/2024 y se han pagado 20 cuotas. No se realizaron rebajas a interés u honorarios.`,
    cuotas: CUOTAS_COMPROMETIDAS_3350049,
    historial: [
      { fecha: "01/07/2026", hora: "10:30", quien: "Carlos Morales", desc: `Compromiso creado · cuotas ${numerosCuotas(CUOTAS_COMPROMETIDAS_3350049)} comprometidas para el 15 de julio`, dot: C.muted },
      { fecha: "05/07/2026", hora: "09:15", quien: "Sistema",        desc: "Consulta a Mónaco · deuda vigente confirmada",                          dot: C.blue  },
    ],
  },
  "3287612": {
    id: "3287612", rut: "12.344.892-3", cliente: "Rodrigo Soto Fuentes",
    fechaContacto: "28-Junio", fechaCompromiso: "12-Julio", fechaPago: "13-Julio", fechaCargaCartera: "08-Julio",
    montoComprometido: MONTO_3287612, montoRecibido: MONTO_3287612, estadoPago: "PARCIAL", situacion: "SITUACION_OBSERVADO",
    resumenIA: `Pago comprometido para el 12 de Julio por ${clp(MONTO_3287612)} correspondiente a ${CUOTAS_COMPROMETIDAS_3287612.length} cuotas: ${numerosCuotas(CUOTAS_COMPROMETIDAS_3287612)}. Observación: el cliente pagó ${clp(ABONO_TRANSFERENCIA_3287612)} en la fecha indicada y el saldo de ${clp(ABONO_PRESENCIAL_3287612)} lo pagó presencial al día siguiente. El crédito es por 18 cuotas, se generó el 14/03/2024 y se han pagado 7 cuotas completas.`,
    cuotas: CUOTAS_COMPROMETIDAS_3287612,
    historial: [
      { fecha: "28/06/2026", hora: "11:05", quien: "Daniela Poblete", desc: `Compromiso creado · cuotas ${numerosCuotas(CUOTAS_COMPROMETIDAS_3287612)} comprometidas para el 12 de julio`, dot: C.muted },
      { fecha: "12/07/2026", hora: "16:45", quien: "OCR",             desc: `Comprobante cargado · ${clp(ABONO_TRANSFERENCIA_3287612)} · transferencia en la fecha comprometida`, dot: C.blue  },
      { fecha: "13/07/2026", hora: "10:10", quien: "Sucursal",        desc: `Pago presencial · ${clp(ABONO_PRESENCIAL_3287612)} · saldo comprometido cubierto al día siguiente`, dot: C.amber },
      { fecha: "13/07/2026", hora: "10:15", quien: "Motor",           desc: "Cuadratura · pago validado con observaciones, saldo pagado de forma presencial y diferida", dot: C.amber },
    ],
  },
  "2941087": {
    id: "2941087", rut: "9.876.543-2", cliente: "Claudia Reyes Mora",
    fechaContacto: "02-Julio", fechaCompromiso: "18-Julio", fechaCargaCartera: "08-Julio",
    montoComprometido: MONTO_2941087, montoRecibido: 0, estadoPago: "TOTAL", situacion: "SITUACION_PENDIENTE",
    resumenIA: `Pago comprometido para el 18 de Julio por ${clp(MONTO_2941087)} correspondiente a ${CUOTAS_COMPROMETIDAS_2941087.length} cuotas: ${numerosCuotas(CUOTAS_COMPROMETIDAS_2941087)}. El crédito es por 12 cuotas, se generó el 22/09/2025 y se han pagado 4 cuotas. No se realizaron rebajas a interés u honorarios.`,
    cuotas: CUOTAS_COMPROMETIDAS_2941087,
    historial: [
      { fecha: "02/07/2026", hora: "16:40", quien: "Carlos Morales", desc: `Compromiso creado · cuotas ${numerosCuotas(CUOTAS_COMPROMETIDAS_2941087)} comprometidas para el 18 de julio`, dot: C.muted },
    ],
  },
  // Jorge no tiene compromiso vigente (volvió a "Sin compromiso" en la cartera): esta
  // ficha corresponde al pago que sí envió, pero fue rechazado — por eso el
  // compromiso quedó sin resolver y hay que volver a comprometerlo. Usa el mismo
  // monto y desglose de cuotas que INFO_COMPROMISO_NUEVO["3102456"], porque es la
  // misma deuda pendiente.
  "3102456": {
    id: "3102456", rut: "17.654.321-K", cliente: "Jorge Espinoza Torres",
    fechaContacto: "25-Junio", fechaCompromiso: "10-Julio", fechaPago: "10-Julio", fechaCargaCartera: "08-Junio",
    montoComprometido: MONTO_3102456, montoRecibido: 0, estadoPago: "PARCIAL", situacion: "SITUACION_RECHAZADO",
    resumenIA: `El cliente comprometió el pago de ${CUOTAS_3102456.length} cuotas (${numerosCuotas(CUOTAS_3102456)}) por ${clp(MONTO_3102456)} para el 10 de Julio y envió un comprobante bajo la solicitud SOLCOB-84216, pero fue rechazado: el monto transferido no coincide con el monto exigido por Mónaco. El compromiso quedó sin resolver y vuelve a estado Sin compromiso. El crédito es por 30 cuotas, se generó el 05/11/2023 y se han pagado 22 cuotas.`,
    cuotas: CUOTAS_3102456,
    historial: [
      { fecha: "25/06/2026", hora: "09:50", quien: "Carlos Morales", desc: `Compromiso creado · cuotas ${numerosCuotas(CUOTAS_3102456)} comprometidas para el 10 de julio`, dot: C.muted },
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
  // N° de cuotas detrás de `monto`: mientras el crédito está "Sin compromiso"
  // son todas las cuotas impagas de la deuda (INFO_COMPROMISO_NUEVO); apenas se
  // comprometen algunas, pasa a ser solo el N° de cuotas efectivamente
  // comprometidas (COMPROMISOS_DETALLE) — igual que `monto` deja de ser la
  // deuda total y pasa a ser el monto comprometido.
  cuotas: number;
  fechaContacto?: string;
  fechaCompromiso?: string;
  fechaPago?: string;
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
    cuotas: f.cuotas.length,
    fechaContacto: f.fechaContacto, fechaCompromiso: f.fechaCompromiso, fechaPago: f.fechaPago, pago: f.estadoPago, situacion: f.situacion,
  };
};

export const CARTERA_EJECUTIVO: CarteraItem[] = [
  activo("3350049"),
  activo("3287612"),
  activo("2941087"),
  // El pago que Jorge envió fue rechazado: el compromiso quedó sin efecto, así
  // que vuelve a "Sin compromiso".
  { id: "3102456", rut: "17.654.321-K", cliente: "Jorge Espinoza Torres",   estado: "SIN_COMPROMISO",  monto: MONTO_3102456, cuotas: CUOTAS_3102456.length },
  // Sin compromiso: nunca se negoció con el cliente.
  { id: "2876543", rut: "14.876.543-1", cliente: "Ana Castillo Bravo",      estado: "SIN_COMPROMISO",  monto: MONTO_2876543, cuotas: CUOTAS_2876543.length },
  // Sin compromiso, pero ya contactado (14 de julio): el cliente no dio fecha
  // de compromiso ni se comprometió a pagar. Ejemplo de "Nuevo contacto programado".
  { id: "2198734", rut: "20.123.456-7", cliente: "Patricio Vargas Leiva",   estado: "SIN_COMPROMISO",  monto: MONTO_2198734, cuotas: CUOTAS_2198734.length, fechaContacto: "14-Julio" },
  { id: "3876209", rut: "16.987.654-3", cliente: "Francisca Ibáñez Rojas",  estado: "SIN_COMPROMISO",  monto: MONTO_3876209, cuotas: CUOTAS_3876209.length },
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

// Deriva el desglose de cuadratura directamente de las cuotas comprometidas de
// la ficha, para que ambas pantallas nunca puedan quedar con números distintos.
function cuadraturaCuotasDesde(cuotas: typeof CUOTAS): CuadraturaCuotaRow[] {
  return cuotas.map((c) => ({
    numCuota: c.num,
    montoCuota: c.aPagar,
    capital: c.valorNominal,
    interesMoratorio: c.mora,
    gastoCobranza: c.gastosCobranza + c.ceco + c.costasJudiciales,
  }));
}

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
    resumenIA: `El cliente transfirió ${clp(MONTO_3350049)}, correspondiente a las cuotas ${numerosCuotas(CUOTAS_COMPROMETIDAS_3350049)}. El monto coincide exactamente con lo comprometido para el 15 de julio, sin diferencias ni observaciones.`,
    checks: [
      { n: 1, titulo: "Monto", resultado: "Cliente paga monto exacto.", tono: "ok", campos: [["Monto comprometido", clp(MONTO_3350049)], ["Monto transferido", clp(MONTO_3350049)]] },
      { n: 2, titulo: "Fecha", resultado: "Cliente paga en la fecha comprometida.", tono: "ok", campos: [["Fecha comprometida", "15 de Julio"], ["Fecha de pago", "15 de Julio"]] },
      { n: 3, titulo: "Pago", resultado: "Pago parcial cumplido.", tono: "ok", campos: [["Tipo de pago", "Parcial"], ["Pago realizado", "Parcial"]] },
      { n: 4, titulo: "Verificación", resultado: "Transferencia verificada.", tono: "ok", campos: [["Tipo de verificación", "Comprobante de transferencia validado"]] },
    ],
    cuotas: cuadraturaCuotasDesde(CUOTAS_COMPROMETIDAS_3350049),
    montoPagado: MONTO_3350049,
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
    resumenIA: `El cliente completó el monto comprometido de ${clp(MONTO_3287612)} para las cuotas ${numerosCuotas(CUOTAS_COMPROMETIDAS_3287612)}, pero en dos partes: ${clp(ABONO_TRANSFERENCIA_3287612)} por transferencia en la fecha comprometida y el saldo de ${clp(ABONO_PRESENCIAL_3287612)} pagado de forma presencial al día siguiente.`,
    observacionDestacada: "El cliente pagó un monto en la fecha indicada y el saldo lo pagó presencial al día siguiente.",
    checks: [
      { n: 1, titulo: "Monto", resultado: "Cliente completa el monto comprometido.", tono: "ok", campos: [["Monto comprometido", clp(MONTO_3287612)], ["Monto total recibido", clp(MONTO_3287612)]] },
      { n: 2, titulo: "Fecha", resultado: "Paga diferido.", tono: "observado", campos: [["Fecha comprometida", "12 de Julio"], ["Fecha del saldo", "13 de Julio · presencial"]] },
      { n: 3, titulo: "Pago", resultado: "Pago dividido en dos partes.", tono: "observado", campos: [["Tipo de pago", "Parcial"], ["Pago realizado", "Total, en dos abonos (transferencia + presencial)"]] },
      { n: 4, titulo: "Verificación", resultado: "Ambos comprobantes verificados.", tono: "ok", campos: [["Tipo de verificación", "Comprobante de transferencia + comprobante presencial"]] },
    ],
    cuotas: cuadraturaCuotasDesde(CUOTAS_COMPROMETIDAS_3287612),
    montoPagado: MONTO_3287612,
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
    resumenIA: `El cliente transfirió ${clp(MONTO_TRANSFERIDO_2941087)} el 18 de julio, dentro de la fecha comprometida. Observación: el monto no coincide con el compromiso de ${clp(MONTO_2941087)} — no cubre el interés de mora ni los gastos de cobranza asociados a las cuotas ${numerosCuotas(CUOTAS_COMPROMETIDAS_2941087)}. Requiere revisión antes de aplicar.`,
    observacionDestacada: "El monto no coincide con el compromiso. Se debe revisar la cuadratura antes de continuar.",
    checks: [
      { n: 1, titulo: "Monto", resultado: "Monto no coincide con el compromiso.", tono: "observado", campos: [["Monto comprometido", clp(MONTO_2941087)], ["Monto transferido", clp(MONTO_TRANSFERIDO_2941087)]] },
      { n: 2, titulo: "Fecha", resultado: "Cliente paga en la fecha comprometida.", tono: "ok", campos: [["Fecha comprometida", "18 de Julio"], ["Fecha de pago", "18 de Julio"]] },
      { n: 3, titulo: "Pago", resultado: "Pago parcial · no cubre lo comprometido.", tono: "observado", campos: [["Tipo de pago", "Total"], ["Pago realizado", "Parcial"]] },
      { n: 4, titulo: "Verificación", resultado: "Transferencia verificada.", tono: "ok", campos: [["Tipo de verificación", "Comprobante de transferencia validado"]] },
    ],
    cuotas: cuadraturaCuotasDesde(CUOTAS_COMPROMETIDAS_2941087),
    montoPagado: MONTO_TRANSFERIDO_2941087,
    control: [
      { label: "Estado de cuadratura",   val: "Observado · monto no coincide" },
      { label: "Regla aplicada",         val: "Regla 2 · Pago menor al comprometido, no cubre accesorios" },
      { label: "Diferencia detectada",   val: clp(MONTO_2941087 - MONTO_TRANSFERIDO_2941087) },
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

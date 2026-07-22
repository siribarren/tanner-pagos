import { useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileText, Upload, X, Zap } from "lucide-react";
import { C, clp } from "../theme";
import { CARTERA_EJECUTIVO, MONTO_TRANSFERIDO_2941087 } from "../data";
import type { Screen } from "../types";
import { Btn, Card } from "../ui";
import { ProgressModal, type ProgressStep } from "../ProgressModal";
import { DatePicker } from "../DatePicker";

// El crédito 2941087 (Claudia Reyes Mora) es el caso de ejemplo donde el monto
// transferido no coincide con lo comprometido: el OCR extrae un monto distinto y
// se marca como observación a revisar en la Cuadratura, en vez del resultado
// "sin duplicados" que ven el resto de los créditos.
const OCR_MISMATCH: Record<string, { monto: string; observacion: string }> = {
  "2941087": {
    monto: clp(MONTO_TRANSFERIDO_2941087),
    observacion: "Observación: el monto transferido no coincide con el compromiso. Se debe revisar la cuadratura.",
  },
};

// PDF mínimo válido, codificado como data URI, para que los comprobantes
// simulados (subidos y el de pago presencial) sean realmente descargables en
// el prototipo sin depender de archivos binarios reales.
function fakePdfHref(titulo: string) {
  const contenido = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n% ${titulo}\ntrailer<</Size 4/Root 1 0 R>>\n%%EOF`;
  return `data:application/pdf;charset=utf-8,${encodeURIComponent(contenido)}`;
}

// ════════════════════════════════════════════════════════════════════════════════
// VALIDAR PAGO / CARGA DE COMPROBANTE (doc §14.3) — dos formas de acreditar el
// pago: subiendo uno o más comprobantes (lectura OCR + análisis IA + cuadratura)
// o registrando un pago presencial (sin OCR/IA, cuadratura directa). Al terminar,
// el ejecutivo revisa la cuadratura final en la pantalla "Cuadratura".
// ════════════════════════════════════════════════════════════════════════════════
const PASOS_EVALUAR_COMPLETO: ProgressStep[] = [
  {
    key: "leer",
    title: "Leyendo imagen",
    runningText: "Extrayendo el contenido de los archivos cargados.",
    successText: "Archivos leídos correctamente.",
    errorText: "Error al leer los archivos. Verifica que no estén dañados.",
  },
  {
    key: "analizar",
    title: "Analizando datos con IA",
    runningText: "Identificando monto, fecha, banco y folio de la transferencia.",
    successText: "Datos identificados con éxito.",
    errorText: "Error al analizar los datos con IA.",
  },
  {
    key: "obtener",
    title: "Datos obtenidos",
    runningText: "Confirmando los datos extraídos contra Mónaco.",
    successText: "Datos obtenidos y validados.",
    errorText: "Error al obtener los datos. No se pudo validar contra Mónaco.",
  },
  {
    key: "cuadrar",
    title: "Realizando cuadratura",
    runningText: "Calculando la imputación del pago.",
    successText: "Cuadratura realizada con éxito.",
    errorText: "Error al realizar la cuadratura.",
  },
];

const PASOS_EVALUAR_PRESENCIAL: ProgressStep[] = [
  {
    key: "registrar",
    title: "Registrando pago presencial",
    runningText: "Guardando monto, fecha y hora informados.",
    successText: "Pago presencial registrado con éxito.",
    errorText: "Error al registrar el pago presencial.",
  },
  {
    key: "cuadrar",
    title: "Realizando cuadratura",
    runningText: "Calculando la imputación del pago.",
    successText: "Cuadratura realizada con éxito.",
    errorText: "Error al realizar la cuadratura.",
  },
];

const RESUMEN_COMPLETO = {
  running: "Estamos leyendo los comprobantes, analizando los datos con IA y realizando la cuadratura. El proceso puede tardar unos segundos.",
  success: "El pago fue evaluado y cuadrado correctamente. Revisa el resultado antes de confirmar el envío.",
  error: "Se detectó un error al evaluar el pago. Puedes cerrar la ventana o reintentar el proceso completo.",
};

const RESUMEN_PRESENCIAL = {
  running: "Estamos registrando el pago presencial y realizando la cuadratura. El proceso puede tardar unos segundos.",
  success: "El pago presencial fue registrado y cuadrado correctamente. Revisa el resultado antes de confirmar el envío.",
  error: "Se detectó un error al registrar el pago presencial. Puedes cerrar la ventana o reintentar el proceso completo.",
};

const dateInputStyle: React.CSSProperties = {
  height: "40px", padding: "0 12px", borderRadius: "10px",
  border: `1px solid ${C.border}`, fontSize: "13px", color: C.text,
  fontFamily: C.mono, outline: "none", background: C.white,
  boxSizing: "border-box", colorScheme: "light",
};

type EvalEstado = "idle" | "progreso" | "listo";

export function Comprobante({ navigate, idCredito }: { navigate: (s: Screen) => void; idCredito: string }) {
  const mismatch = OCR_MISMATCH[idCredito];
  const rut = CARTERA_EJECUTIVO.find((c) => c.id === idCredito)?.rut ?? "—";

  const [archivos, setArchivos] = useState<string[]>([]);
  const [montoPresencial, setMontoPresencial] = useState<number>(0);
  const [fechaPresencial, setFechaPresencial] = useState("");
  const [horaPresencial, setHoraPresencial] = useState("");
  const [estado, setEstado] = useState<EvalEstado>("idle");
  const [runId, setRunId] = useState(0);

  const agregarArchivo = () => {
    setArchivos((prev) => [...prev, `comprobante_${prev.length + 1}.pdf`]);
  };
  const quitarArchivo = (nombre: string) => {
    setArchivos((prev) => prev.filter((a) => a !== nombre));
  };

  // Pago presencial sin ningún archivo cargado: habilita igual el botón, pero
  // sin OCR ni análisis IA, y con un tiempo de proceso menor.
  const soloPresencial = archivos.length === 0 && montoPresencial > 0 && fechaPresencial !== "";
  const habilitado = archivos.length > 0 || (montoPresencial > 0 && fechaPresencial !== "");

  const evaluar = () => {
    setEstado("progreso");
    setRunId((r) => r + 1);
  };
  const reintentar = () => setRunId((r) => r + 1);

  const botonPrincipalLabel = estado === "listo" ? "Revisar cuadratura" : "Validar pago";

  return (
    <>
      <div style={{ padding: "18px 24px 18px" }}>
        <button
          type="button"
          onClick={() => navigate("compromiso")}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            border: "none", background: "transparent", cursor: "pointer",
            color: C.blue, fontSize: "13px", fontWeight: 700, padding: 0, marginBottom: "10px",
          }}
        >
          <ArrowLeft size={15} /> Volver
        </button>
        <h1 style={{ margin: 0, fontSize: "31px", fontWeight: 800, letterSpacing: "-0.05em", color: C.navy, lineHeight: 1.08 }}>
          Carga Comprobante
        </h1>
        <div style={{ marginTop: "6px", fontSize: "13px", color: C.muted, fontFamily: C.mono }}>ID Crédito {idCredito}</div>
        <div style={{ marginTop: "2px", fontSize: "13px", color: C.muted, fontFamily: C.mono }}>RUT {rut}</div>
      </div>

      <div style={{ padding: "0 24px 24px" }}>
        {/* Sección: Carga de comprobante */}
        <h3 style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 700, color: C.navy }}>Carga de comprobante</h3>
        <Card style={{ padding: "36px 24px", textAlign: "center", border: `2px dashed ${C.border}`, marginBottom: "20px" }}>
          <Upload size={32} color={C.muted} style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: "16px", fontWeight: 700, color: C.navy, marginBottom: "6px" }}>Carga uno o más comprobantes de transferencia</div>
          <p style={{ margin: "0 0 18px", fontSize: "13px", color: C.muted }}>JPG, PNG o PDF · El sistema extrae monto, fecha, banco y folio automáticamente</p>
          <Btn label="Seleccionar archivo" icon={Upload} onClick={agregarArchivo} />
        </Card>

        {archivos.length > 0 && (
          <Card style={{ marginBottom: "20px", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontSize: "13px", fontWeight: 800, color: C.navy }}>
              Archivos cargados ({archivos.length})
            </div>
            {archivos.map((a, i) => (
              <div key={a} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
                padding: "12px 18px", borderBottom: i < archivos.length - 1 ? `1px solid ${C.border}` : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <FileText size={16} color={C.red} />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: C.navy }}>{a}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  {estado === "listo" && (
                    <a
                      href={fakePdfHref(a)}
                      download={a}
                      aria-label={`Descargar ${a}`}
                      style={{ display: "inline-flex", border: "none", background: "transparent", cursor: "pointer", color: C.blue, padding: "4px", textDecoration: "none" }}
                    >
                      <Download size={16} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => quitarArchivo(a)}
                    aria-label={`Eliminar ${a}`}
                    style={{ border: "none", background: "transparent", cursor: "pointer", color: C.muted, padding: "4px" }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </Card>
        )}

        {/* Sección: Pago Presencial */}
        <h3 style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 700, color: C.navy }}>Pago Presencial</h3>
        <Card style={{ padding: "18px 20px", marginBottom: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: "8px" }}>Monto pagado</div>
              <input
                type="text"
                inputMode="numeric"
                value={montoPresencial ? new Intl.NumberFormat("es-CL").format(montoPresencial) : ""}
                onChange={(e) => setMontoPresencial(Number(e.target.value.replace(/\D/g, "")) || 0)}
                placeholder="$0"
                style={{ ...dateInputStyle, width: "100%" }}
              />
            </div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: "8px" }}>Fecha</div>
              <DatePicker value={fechaPresencial} onChange={setFechaPresencial} />
            </div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: "8px" }}>Hora</div>
              <input type="time" value={horaPresencial} onChange={(e) => setHoraPresencial(e.target.value)} style={{ ...dateInputStyle, width: "100%" }} />
            </div>
          </div>

          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
            marginTop: "16px", padding: "12px 14px", borderRadius: "10px",
            background: C.bg, border: `1px solid ${C.border}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <FileText size={16} color={C.red} />
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: C.navy }}>comprobante_presencial.pdf</div>
                <div style={{ fontSize: "11px", color: C.muted }}>Comprobante de ejemplo que certifica el pago presencial del cliente</div>
              </div>
            </div>
            <a
              href={fakePdfHref("comprobante_presencial.pdf")}
              download="comprobante_presencial.pdf"
              aria-label="Descargar comprobante presencial"
              style={{ display: "inline-flex", border: "none", background: "transparent", cursor: "pointer", color: C.blue, padding: "4px", textDecoration: "none" }}
            >
              <Download size={16} />
            </a>
          </div>
        </Card>

        {estado === "listo" && (
          <Card style={{ padding: "18px 20px", marginBottom: "20px", borderLeft: `4px solid ${mismatch ? C.amber : C.green}` }}>
            {soloPresencial ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <CheckCircle2 size={20} color={C.green} />
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: C.navy }}>Pago presencial registrado · cuadratura realizada</div>
                    <div style={{ fontSize: "12px", color: C.muted }}>Sin extracción OCR ni análisis IA · registrado manualmente</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginTop: "14px" }}>
                  {[
                    { label: "Monto pagado", val: new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(montoPresencial) },
                    { label: "Fecha pago",   val: fechaPresencial || "—" },
                    { label: "Hora pago",    val: horaPresencial || "—" },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ padding: "10px 12px", borderRadius: "10px", background: C.bg, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted }}>{label}</div>
                      <div style={{ fontSize: "14px", fontWeight: 800, color: C.navy, fontFamily: C.mono, marginTop: "3px" }}>{val}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {mismatch ? <AlertTriangle size={20} color={C.amber} /> : <CheckCircle2 size={20} color={C.green} />}
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: C.navy }}>
                      {mismatch ? "Comprobante analizado · observación detectada" : "Comprobante analizado · cuadratura realizada"}
                    </div>
                    <div style={{ fontSize: "12px", color: C.muted }}>Confianza 92% · {archivos.length} archivo{archivos.length > 1 ? "s" : ""} procesado{archivos.length > 1 ? "s" : ""}</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginTop: "14px" }}>
                  {[
                    { label: "Monto OCR",       val: mismatch?.monto ?? "$250.000" },
                    { label: "Fecha pago",      val: "05/07/2026" },
                    { label: "Banco origen",    val: "Banco de Chile" },
                    { label: "N° operación",    val: "0098231457" },
                    { label: "N° comprobante",  val: "774102" },
                    { label: "Nombre pagador",  val: "Titular de la cuenta origen" },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ padding: "10px 12px", borderRadius: "10px", background: C.bg, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted }}>{label}</div>
                      <div style={{ fontSize: "14px", fontWeight: 800, color: C.navy, fontFamily: C.mono, marginTop: "3px" }}>{val}</div>
                    </div>
                  ))}
                </div>

                {mismatch ? (
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: "8px",
                    marginTop: "14px", padding: "10px 12px", borderRadius: "10px",
                    background: C.amberSoft, border: "1px solid rgba(217,119,6,0.25)",
                  }}>
                    <AlertTriangle size={14} color={C.amber} style={{ flexShrink: 0, marginTop: "1px" }} />
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#7a4a00", lineHeight: 1.45 }}>{mismatch.observacion}</span>
                  </div>
                ) : (
                  <div style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    marginTop: "14px", padding: "10px 12px", borderRadius: "10px",
                    background: C.greenSoft,
                  }}>
                    <CheckCircle2 size={14} color={C.green} />
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#0c5e2e" }}>Validación de duplicidad: sin duplicados detectados</span>
                  </div>
                )}
              </>
            )}
          </Card>
        )}

        <Btn
          label={botonPrincipalLabel}
          icon={estado === "listo" ? Zap : undefined}
          onClick={() => (estado === "listo" ? navigate("cuadratura") : evaluar())}
          disabled={!habilitado}
          full
        />
      </div>

      <ProgressModal
        open={estado === "progreso"}
        runId={runId}
        title={soloPresencial ? "Registrando pago presencial" : "Evaluando pago"}
        warningText={soloPresencial ? "no cierres esta ventana mientras se registra el pago." : "no cierres esta ventana mientras se evalúa el pago."}
        steps={soloPresencial ? PASOS_EVALUAR_PRESENCIAL : PASOS_EVALUAR_COMPLETO}
        totalSeconds={soloPresencial ? 6 : 15}
        resumen={soloPresencial ? RESUMEN_PRESENCIAL : RESUMEN_COMPLETO}
        onClose={() => setEstado("listo")}
        onRetry={reintentar}
      />
    </>
  );
}

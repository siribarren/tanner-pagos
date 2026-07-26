import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileText, Upload, X, Zap } from "lucide-react";
import { C, clp } from "../theme";
import { getCarteraDetalle } from "../../api/cartera";
import { cargarComprobantes, MAX_COMPROBANTES, TIPOS_COMPROBANTE, type Pago } from "../../api/pagos";
import type { Screen } from "../types";
import { Btn, Card } from "../ui";
import { ProgressModal, type ProgressStep } from "../ProgressModal";
import { DatePicker } from "../DatePicker";

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
    title: "Leyendo comprobantes",
    runningText: "Uniendo las imágenes en un PDF y extrayendo el texto con DocumentAI.",
    successText: "Comprobantes leídos correctamente.",
    errorText: "Error al leer los comprobantes. Verifica que las imágenes no estén dañadas.",
  },
  {
    key: "analizar",
    title: "Analizando datos con IA",
    runningText: "Identificando cuántas transferencias hay y el monto, fecha y cuenta destino de cada una.",
    successText: "Transferencias identificadas con éxito.",
    errorText: "Error al analizar los datos con IA.",
  },
  {
    key: "obtener",
    title: "Registrando el pago",
    runningText: "Guardando el pago y el detalle de cada transferencia.",
    successText: "Pago registrado con éxito.",
    errorText: "Error al registrar el pago.",
  },
  {
    key: "cuadrar",
    title: "Realizando cuadratura",
    runningText: "Imputando el pago a las cuotas comprometidas.",
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

function formatFecha(valor?: string | null) {
  if (!valor) return "—";
  const [year, month, day] = valor.split("-");
  return year && month && day ? `${day}/${month}/${year}` : valor;
}

// Tablita compacta para el detalle del pago (transferencias e imputación).
function Detalle({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: "16px" }}>
      <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: "8px" }}>{titulo}</div>
      <div style={{ border: `1px solid ${C.border}`, borderRadius: "10px", overflow: "hidden" }}>{children}</div>
    </div>
  );
}

function Fila({ columnas, ultima, children }: { columnas: string; ultima: boolean; children: React.ReactNode }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: columnas, gap: "10px", alignItems: "center",
      padding: "10px 12px", fontSize: "12px", color: C.navy, fontFamily: C.mono,
      borderBottom: ultima ? "none" : `1px solid ${C.border}`,
    }}>
      {children}
    </div>
  );
}

export function Comprobante({ navigate, idCredito }: { navigate: (s: Screen) => void; idCredito: string }) {
  const [rut, setRut] = useState("—");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [pago, setPago] = useState<Pago | null>(null);
  const [montoPresencial, setMontoPresencial] = useState<number>(0);
  const [fechaPresencial, setFechaPresencial] = useState("");
  const [horaPresencial, setHoraPresencial] = useState("");
  const [estado, setEstado] = useState<EvalEstado>("idle");
  const [runId, setRunId] = useState(0);
  const inputArchivos = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    getCarteraDetalle(idCredito)
      .then((detalle) => {
        if (mounted) setRut(detalle.credito.rut);
      })
      .catch((error) => console.error(error));
    return () => {
      mounted = false;
    };
  }, [idCredito]);

  // URLs locales para poder previsualizar/descargar los archivos que el ejecutivo cargó.
  const previews = useMemo(() => archivos.map((archivo) => URL.createObjectURL(archivo)), [archivos]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  const agregarArchivos = (seleccion: FileList | null) => {
    if (!seleccion) return;
    const validos = Array.from(seleccion).filter((archivo) => TIPOS_COMPROBANTE.includes(archivo.type));
    setArchivos((prev) => [...prev, ...validos].slice(0, MAX_COMPROBANTES));
  };
  const quitarArchivo = (indice: number) => {
    setArchivos((prev) => prev.filter((_, i) => i !== indice));
  };

  // Pago presencial sin ningún archivo cargado: habilita igual el botón, pero
  // sin OCR ni análisis IA, y con un tiempo de proceso menor.
  const soloPresencial = archivos.length === 0 && montoPresencial > 0 && fechaPresencial !== "";
  const habilitado = archivos.length > 0 || (montoPresencial > 0 && fechaPresencial !== "");
  const diferencia = pago ? pago.monto_total - pago.monto_comprometido : 0;
  const hayObservacion = pago !== null && (pago.cuentas_distintas || diferencia !== 0);
  const hayResultado = estado === "listo" && (soloPresencial || pago !== null);

  const evaluar = () => {
    setPago(null);
    setEstado("progreso");
    setRunId((r) => r + 1);
  };
  const reintentar = () => setRunId((r) => r + 1);

  const botonPrincipalLabel = hayResultado ? "Revisar cuadratura" : "Validar pago";

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
          <p style={{ margin: "0 0 18px", fontSize: "13px", color: C.muted }}>
            JPG, JPEG, PNG o PDF (máximo {MAX_COMPROBANTES}) · Se unen en un solo PDF, una página por imagen, y el sistema extrae monto, fecha y cuenta destino de cada transferencia
          </p>
          <input
            ref={inputArchivos}
            type="file"
            accept="image/png,image/jpeg,application/pdf"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              agregarArchivos(e.target.files);
              e.target.value = "";
            }}
          />
          <Btn label="Seleccionar archivo" icon={Upload} onClick={() => inputArchivos.current?.click()} />
        </Card>

        {archivos.length > 0 && (
          <Card style={{ marginBottom: "20px", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontSize: "13px", fontWeight: 800, color: C.navy }}>
              Archivos cargados ({archivos.length})
            </div>
            {archivos.map((archivo, i) => (
              <div key={`${archivo.name}-${i}`} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
                padding: "12px 18px", borderBottom: i < archivos.length - 1 ? `1px solid ${C.border}` : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <FileText size={16} color={C.red} />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: C.navy }}>{archivo.name}</span>
                  <span style={{ fontSize: "11px", color: C.muted, fontFamily: C.mono }}>página {i + 1}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <a
                    href={previews[i]}
                    download={archivo.name}
                    aria-label={`Descargar ${archivo.name}`}
                    style={{ display: "inline-flex", border: "none", background: "transparent", cursor: "pointer", color: C.blue, padding: "4px", textDecoration: "none" }}
                  >
                    <Download size={16} />
                  </a>
                  <button
                    type="button"
                    onClick={() => quitarArchivo(i)}
                    aria-label={`Eliminar ${archivo.name}`}
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

        {hayResultado && (
          <Card style={{ padding: "18px 20px", marginBottom: "20px", borderLeft: `4px solid ${hayObservacion ? C.amber : C.green}` }}>
            {!pago ? (
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
                  {hayObservacion ? <AlertTriangle size={20} color={C.amber} /> : <CheckCircle2 size={20} color={C.green} />}
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: C.navy }}>
                      {hayObservacion ? "Comprobantes analizados · observación detectada" : "Comprobantes analizados · cuadratura realizada"}
                    </div>
                    <div style={{ fontSize: "12px", color: C.muted }}>
                      {pago.transferencias.length} transferencia{pago.transferencias.length > 1 ? "s" : ""} en {archivos.length} imagen{archivos.length > 1 ? "es" : ""} · {pago.pdf_path}
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginTop: "14px" }}>
                  {[
                    { label: "Monto transferido", val: clp(pago.monto_total) },
                    { label: "Comprometido",      val: clp(pago.monto_comprometido) },
                    { label: "Diferencia",        val: clp(diferencia) },
                    { label: "Fecha pago",        val: formatFecha(pago.fecha_pago) },
                    { label: "Cuenta destino",    val: pago.cuenta_destino ?? "—" },
                    { label: "Transferencias",    val: String(pago.transferencias.length) },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ padding: "10px 12px", borderRadius: "10px", background: C.bg, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted }}>{label}</div>
                      <div style={{ fontSize: "14px", fontWeight: 800, color: C.navy, fontFamily: C.mono, marginTop: "3px" }}>{val}</div>
                    </div>
                  ))}
                </div>

                <Detalle titulo="Transferencias detectadas">
                  {pago.transferencias.map((transferencia, i) => (
                    <Fila key={transferencia.id} columnas="52px 1fr 1fr 1fr 1fr" ultima={i === pago.transferencias.length - 1}>
                      <span style={{ color: C.muted }}>#{transferencia.orden}</span>
                      <span style={{ fontWeight: 800 }}>{clp(transferencia.monto)}</span>
                      <span>{formatFecha(transferencia.fecha)}</span>
                      <span>{transferencia.banco ?? "—"}</span>
                      <span style={{ color: C.muted }}>{transferencia.cuenta_destino ?? "—"}</span>
                    </Fila>
                  ))}
                </Detalle>

                <Detalle titulo="Imputación a cuotas comprometidas">
                  {pago.imputaciones.map((imputacion, i) => (
                    <Fila key={imputacion.cuota_id} columnas="1fr 1fr 1fr" ultima={i === pago.imputaciones.length - 1}>
                      <span>Cuota {formatFecha(imputacion.cuota_fecha)}</span>
                      <span style={{ color: C.muted }}>{clp(imputacion.cuota_monto)}</span>
                      <span style={{ fontWeight: 800 }}>{clp(imputacion.monto_imputado)}</span>
                    </Fila>
                  ))}
                </Detalle>

                {hayObservacion ? (
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: "8px",
                    marginTop: "14px", padding: "10px 12px", borderRadius: "10px",
                    background: C.amberSoft, border: "1px solid rgba(217,119,6,0.25)",
                  }}>
                    <AlertTriangle size={14} color={C.amber} style={{ flexShrink: 0, marginTop: "1px" }} />
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#7a4a00", lineHeight: 1.45 }}>
                      {pago.cuentas_distintas
                        ? "Observación: los comprobantes apuntan a cuentas destino distintas entre sí. Se debe revisar la cuadratura."
                        : `Observación: el monto transferido no coincide con el compromiso (diferencia de ${clp(diferencia)}). Se debe revisar la cuadratura.`}
                    </span>
                  </div>
                ) : (
                  <div style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    marginTop: "14px", padding: "10px 12px", borderRadius: "10px",
                    background: C.greenSoft,
                  }}>
                    <CheckCircle2 size={14} color={C.green} />
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#0c5e2e" }}>El monto transferido coincide con el compromiso.</span>
                  </div>
                )}
              </>
            )}
          </Card>
        )}

        <Btn
          label={botonPrincipalLabel}
          icon={hayResultado ? Zap : undefined}
          onClick={() => (hayResultado ? navigate("cuadratura") : evaluar())}
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
        task={soloPresencial ? undefined : () => cargarComprobantes(idCredito, archivos).then(setPago)}
        onClose={() => setEstado("listo")}
        onRetry={reintentar}
      />
    </>
  );
}

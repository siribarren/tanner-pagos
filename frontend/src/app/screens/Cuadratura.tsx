import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, Check, CheckCircle2, FileText, Loader2, Sparkles } from "lucide-react";
import { C, clp } from "../theme";
import { confirmarPago, urlComprobante, TIPO_PAGO_FLOKZU, type PagoAnalisis, type SolicitudFlokzu } from "../../api/pagos";
import type { Screen } from "../types";
import { Btn, Card, Chip, Modal } from "../ui";
import { DatePicker } from "../DatePicker";

// ════════════════════════════════════════════════════════════════════════════════
// CUADRATURA (doc §14.5 / §10) — previsualización de imputación antes de aplicar.
// Trabaja sobre el análisis que dejó la pantalla de comprobantes: hasta que el
// ejecutivo confirma el envío no hay ninguna fila de pago en la base de datos.
// Al confirmar se muestra el formulario de Flokzu tal como quedará relleno, para
// que lo revise y lo corrija antes de tipearlo allá (todavía no hay integración).
// ════════════════════════════════════════════════════════════════════════════════
type EnvioModal = "cerrado" | "revisar" | "enviando" | "exito" | "error";

const HOY = new Date();

function formatFecha(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// Etiqueta + contenido, en la grilla de tres columnas que usa el formulario de Flokzu.
function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.06em", color: C.muted, marginBottom: "5px",
      }}>{label}</div>
      {children}
    </div>
  );
}

function ValorFijo({ children }: { children: ReactNode }) {
  return (
    <div style={{
      height: "38px", display: "flex", alignItems: "center", padding: "0 12px",
      borderRadius: "10px", background: C.bg, border: `1px solid ${C.border}`,
      fontSize: "13px", fontWeight: 700, color: C.muted, fontFamily: C.mono,
      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    }}>{children}</div>
  );
}

const ESTILO_INPUT = {
  height: "38px", width: "100%", padding: "0 12px", boxSizing: "border-box" as const,
  borderRadius: "10px", border: `1.5px solid ${C.border}`, background: C.white,
  fontSize: "13px", fontWeight: 700, color: C.navy, fontFamily: C.mono, outline: "none",
};

export function Cuadratura({ navigate, abrirDetalle, idCredito, analisis, onEnviado }: {
  navigate: (s: Screen) => void;
  abrirDetalle: (idCredito: string) => void;
  idCredito: string;
  analisis: PagoAnalisis | null;
  onEnviado: () => void;
}) {
  const [modal, setModal] = useState<EnvioModal>("cerrado");
  const [error, setError] = useState("");
  // Copia editable de la propuesta: lo que el ejecutivo confirme es lo que se guarda.
  const [form, setForm] = useState<SolicitudFlokzu | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // El PDF con los comprobantes se descarga con el JWT y se muestra como blob mientras el modal
  // esté abierto; al cerrarlo se libera para no dejar el archivo colgando en memoria.
  const pdfPath = analisis?.pdf_path;
  useEffect(() => {
    if (modal !== "revisar" || !pdfPath) return;
    let vigente = true;
    let creada = "";
    urlComprobante(idCredito, pdfPath)
      .then((url) => {
        creada = url;
        if (vigente) setPdfUrl(url);
        else URL.revokeObjectURL(url);
      })
      .catch(() => vigente && setPdfUrl(null));

    return () => {
      vigente = false;
      if (creada) URL.revokeObjectURL(creada);
      setPdfUrl(null);
    };
  }, [modal, idCredito, pdfPath]);

  // Sin análisis en memoria no hay nada que cuadrar: antes esta pantalla mostraba
  // los datos de otro cliente, que es peor que no mostrar nada. Se compara el crédito
  // porque a cuadratura también se llega desde la ficha y desde matching, donde el
  // análisis que quedó en memoria puede ser de otro deudor.
  if (!analisis || String(analisis.flokzu.id_credito) !== idCredito) {
    return (
      <div style={{ padding: "18px 24px 24px" }}>
        <h1 style={{ margin: "0 0 16px", fontSize: "31px", fontWeight: 800, letterSpacing: "-0.05em", color: C.navy }}>
          Cuadratura
        </h1>
        <Card style={{ padding: "28px 24px", textAlign: "center" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: C.navy, marginBottom: "6px" }}>
            No hay comprobantes analizados
          </div>
          <p style={{ margin: "0 0 18px", fontSize: "13px", color: C.muted, lineHeight: 1.5 }}>
            Para cuadrar un pago primero hay que cargar los comprobantes del crédito {idCredito}.
          </p>
          <Btn label="Cargar comprobante" onClick={() => navigate("comprobante")} />
        </Card>
      </div>
    );
  }

  const { cuadratura, flokzu, imputaciones } = analisis;
  const observados = cuadratura.checks.filter((check) => check.tono !== "ok");
  const sumaCuotas = imputaciones.reduce((total, i) => total + i.cuota_monto, 0);
  const sumaImputada = imputaciones.reduce((total, i) => total + i.monto_imputado, 0);
  const sumaSaldo = imputaciones.reduce((total, i) => total + i.saldo, 0);

  const abrirRevision = () => {
    setForm(flokzu);
    setError("");
    setModal("revisar");
  };

  const enviar = async () => {
    if (!form?.fecha_pago) return;
    setModal("enviando");
    try {
      await confirmarPago(idCredito, {
        pdf_path: analisis.pdf_path,
        fecha_pago: form.fecha_pago,
        cuenta_destino: form.cuenta,
        cuentas_distintas: analisis.cuentas_distintas,
        transferencias: analisis.transferencias,
        tipo_pago: form.tipo_pago,
        monto_ceco: form.monto_ceco,
        monto_saf: form.monto_saf,
      });
      onEnviado();
      setModal("exito");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No fue posible enviar el pago.");
      setModal("error");
    }
  };

  return (
    <>
      <div style={{ padding: "18px 24px 18px" }}>
        <h1 style={{ margin: 0, fontSize: "31px", fontWeight: 800, letterSpacing: "-0.05em", color: C.navy, lineHeight: 1.08 }}>
          Cuadratura {idCredito}
        </h1>
        <div style={{ marginTop: "6px", fontSize: "13px", color: C.muted, fontFamily: C.mono }}>RUT {flokzu.rut_transfiere}</div>
        <p style={{ margin: "6px 0 0", fontSize: "14px", color: C.muted, maxWidth: "760px", lineHeight: 1.45 }}>
          Previsualización de imputación antes de aplicar
        </p>
      </div>

      <div style={{ padding: "0 24px 24px" }}>
        {/* Resumen IA — arriba de la ficha */}
        <Card style={{ padding: "18px 20px", marginBottom: "20px", borderLeft: `5px solid ${observados.length ? C.amber : C.cyan}`, background: observados.length ? C.amberSoft : C.cyanSoft }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <Sparkles size={15} color={observados.length ? C.amber : C.cyan} />
            <span style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: observados.length ? C.amber : C.cyan }}>Resumen IA</span>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: C.navy, lineHeight: 1.55 }}>{cuadratura.resumen}</p>
          {observados.length > 0 && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "8px",
              marginTop: "12px", padding: "10px 12px", borderRadius: "10px",
              background: "#fff", border: `1px solid rgba(217,119,6,0.3)`,
            }}>
              <AlertTriangle size={15} color={C.amber} style={{ flexShrink: 0, marginTop: "1px" }} />
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#7a4a00", lineHeight: 1.45 }}>
                Observación: {observados.map((check) => check.resultado).join(" ")}
              </span>
            </div>
          )}
        </Card>

        {/* Resultado del motor de cuadratura */}
        <h3 style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 700, color: C.navy }}>Resultado del motor de cuadratura</h3>
        <Card style={{ marginBottom: "16px", overflow: "hidden" }}>
          {cuadratura.checks.map((c, i) => {
            const ok = c.tono === "ok";
            return (
              <div key={c.n} style={{
                display: "flex", gap: "14px",
                padding: "16px 20px",
                background: ok ? C.greenSoft : C.amberSoft,
                borderBottom: i < cuadratura.checks.length - 1 ? `1px solid ${C.border}` : "none",
              }}>
                <div style={{
                  width: "28px", height: "28px", borderRadius: "999px",
                  background: ok ? C.green : C.amber,
                  display: "grid", placeItems: "center", flexShrink: 0, marginTop: "2px",
                }}>
                  {ok ? <Check size={14} color="#fff" strokeWidth={3} /> : <AlertTriangle size={14} color="#fff" strokeWidth={2.5} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: C.navy }}>Compromiso {c.n}: {c.titulo}</div>
                  <div style={{ fontSize: "12px", color: ok ? "#0c5e2e" : "#7a4a00", fontWeight: 700, marginTop: "2px" }}>Resultado: {c.resultado}</div>
                  <div style={{ display: "flex", gap: "18px", marginTop: "8px", flexWrap: "wrap" }}>
                    {c.campos.map(([label, val]) => (
                      <span key={label} style={{ fontSize: "12px", color: C.muted }}>
                        <span style={{ fontWeight: 700, color: C.navy }}>{label}:</span> {val}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </Card>

        {/* Tabla de imputación (doc §10.2) — una fila por cuota comprometida */}
        <h3 style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 700, color: C.navy }}>Tabla de imputación</h3>
        <Card style={{ marginBottom: "16px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "560px" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}>
                  {["N° Cuota", "Vence", "Monto Cuota", "Imputado", "Saldo"].map((h, i) => (
                    <th key={h} style={{
                      textAlign: i === 0 ? "left" : "right",
                      padding: "10px 16px",
                      fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                      color: C.muted,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {imputaciones.map((row, i) => (
                  <tr key={row.cuota_id} style={{ borderBottom: i < imputaciones.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 700, color: C.navy }}>Cuota {row.cuota_id}</td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", fontFamily: C.mono, color: C.muted, textAlign: "right" }}>{formatFecha(row.cuota_fecha)}</td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", fontFamily: C.mono, color: C.navy, fontWeight: 800, textAlign: "right" }}>{clp(row.cuota_monto)}</td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", fontFamily: C.mono, color: C.blue, fontWeight: 800, textAlign: "right" }}>{clp(row.monto_imputado)}</td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", fontFamily: C.mono, color: row.saldo > 0 ? C.red : C.muted, textAlign: "right" }}>{clp(row.saldo)}</td>
                  </tr>
                ))}
                <tr style={{ background: C.bg }}>
                  <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 800, color: C.navy }}>Total</td>
                  <td />
                  <td style={{ padding: "12px 16px", fontSize: "14px", fontFamily: C.mono, color: C.navy, textAlign: "right", fontWeight: 800 }}>{clp(sumaCuotas)}</td>
                  <td style={{ padding: "12px 16px", fontSize: "14px", fontFamily: C.mono, color: C.blue, textAlign: "right", fontWeight: 800 }}>{clp(sumaImputada)}</td>
                  <td style={{ padding: "12px 16px", fontSize: "14px", fontFamily: C.mono, color: sumaSaldo > 0 ? C.red : C.muted, textAlign: "right", fontWeight: 800 }}>{clp(sumaSaldo)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px",
            padding: "14px 20px", borderTop: `1px solid ${C.border}`, background: C.bg,
          }}>
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", color: C.muted }}>
                <span style={{ fontWeight: 700, color: C.navy }}>Suma de cuotas:</span> {clp(sumaCuotas)}
              </span>
              <span style={{ fontSize: "12px", color: C.muted }}>
                <span style={{ fontWeight: 700, color: C.navy }}>Monto pagado:</span> {clp(analisis.monto_total)}
              </span>
            </div>
            <span style={{ fontSize: "13px", fontWeight: 800 }}>
              {cuadratura.saldo_a_favor === 0
                ? <span style={{ color: C.muted }}>Sin saldo a favor</span>
                : <span style={{ color: C.cyan }}>Se genera un saldo a favor de +{clp(cuadratura.saldo_a_favor)}</span>}
            </span>
          </div>
        </Card>

        {/* Información de control (doc §10.3) */}
        <h3 style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 700, color: C.navy }}>Información de control</h3>
        <Card style={{ marginBottom: "20px", overflow: "hidden" }}>
          {cuadratura.control.map(([label, val], i) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 20px", borderBottom: i < cuadratura.control.length - 1 ? `1px solid ${C.border}` : "none",
            }}>
              <span style={{ fontSize: "13px", color: C.muted, fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: "13px", color: C.navy, fontWeight: 700, textAlign: "right" }}>{val}</span>
            </div>
          ))}
        </Card>

        <div style={{ display: "flex", gap: "10px" }}>
          <Btn label="Solicitar revisión" variant="outline" onClick={() => navigate("excepciones")} />
          <Btn label="Confirmar envío" onClick={abrirRevision} full />
        </div>
      </div>

      {modal === "revisar" && form && (
        <Modal ancho={760}>
          <div style={{ fontSize: "18px", fontWeight: 800, color: C.navy, marginBottom: "4px" }}>Así se enviará a Flokzu</div>
          <p style={{ margin: "0 0 18px", fontSize: "13px", color: C.muted, lineHeight: 1.5 }}>
            Revisa cómo queda el formulario de <b>{form.tipo_solicitud}</b>. Los campos en gris los define la empresa
            o se calculan del comprobante; los editables son los que puedes corregir antes de enviar.
          </p>

          <SeccionFormulario titulo="Solicitud y empresa">
            <Campo label="Tipo de solicitud"><ValorFijo>{form.tipo_solicitud}</ValorFijo></Campo>
            <Campo label="Fecha solicitud"><ValorFijo>{HOY.toLocaleDateString("es-CL")}</ValorFijo></Campo>
            <Campo label="Hora solicitud"><ValorFijo>{HOY.toLocaleTimeString("es-CL", { hour12: false })}</ValorFijo></Campo>
            <Campo label="Empresa"><ValorFijo>{form.empresa}</ValorFijo></Campo>
            <Campo label="Empresa de cobranza"><ValorFijo>{form.empresa_cobranza}</ValorFijo></Campo>
            <Campo label="Correo empresa de cobranza"><ValorFijo>{form.correo_cobranza}</ValorFijo></Campo>
            <Campo label="Correos adicionales"><ValorFijo>{form.correos_adicionales}</ValorFijo></Campo>
            <Campo label="ID del crédito"><ValorFijo>{form.id_credito}</ValorFijo></Campo>
            <Campo label="Forma de pago"><ValorFijo>{form.forma_pago}</ValorFijo></Campo>
          </SeccionFormulario>

          <SeccionFormulario titulo="Datos del pago">
            <Campo label="Rut de quien transfiere"><ValorFijo>{form.rut_transfiere}</ValorFijo></Campo>
            <Campo label="Monto del pago"><ValorFijo>{clp(form.monto_pago)}</ValorFijo></Campo>
            <Campo label="Cantidad de movimientos"><ValorFijo>{form.cantidad_movimientos}</ValorFijo></Campo>
            <Campo label="Cuenta">
              <select
                value={form.cuenta ?? ""}
                onChange={(e) => setForm({ ...form, cuenta: e.target.value || null })}
                style={{ ...ESTILO_INPUT, borderColor: form.cuenta ? C.border : C.amber }}
              >
                <option value="">Selecciona una cuenta</option>
                {analisis.opciones_cuenta.map((cuenta) => (
                  <option key={cuenta} value={cuenta}>{cuenta}</option>
                ))}
              </select>
            </Campo>
            <Campo label="Fecha del pago">
              <DatePicker value={form.fecha_pago ?? ""} onChange={(iso) => setForm({ ...form, fecha_pago: iso })} />
            </Campo>
            <Campo label="Tipo de pago">
              <select
                value={form.tipo_pago}
                onChange={(e) => setForm({ ...form, tipo_pago: e.target.value as SolicitudFlokzu["tipo_pago"] })}
                style={ESTILO_INPUT}
              >
                {Object.entries(TIPO_PAGO_FLOKZU).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>{etiqueta}</option>
                ))}
              </select>
            </Campo>
            <Campo label="Considera otros ID"><ValorFijo>No</ValorFijo></Campo>
            <div style={{ gridColumn: "span 2" }}>
              <Campo label="Adjuntar comprobantes de pago">
                <ValorFijo>
                  <FileText size={13} style={{ marginRight: "6px", flexShrink: 0 }} />
                  {form.adjunto.split("/").pop()}
                </ValorFijo>
              </Campo>
            </div>
          </SeccionFormulario>

          <SeccionFormulario titulo="Ajustes">
            <AjusteMonto
              label="Corresponde CECO"
              detalle="El cliente pagó menos de lo comprometido."
              monto={form.monto_ceco}
              onChange={(monto) => setForm({ ...form, monto_ceco: monto })}
            />
            <AjusteMonto
              label="Corresponde SAF"
              detalle="El cliente pagó más de lo comprometido."
              monto={form.monto_saf}
              onChange={(monto) => setForm({ ...form, monto_saf: monto })}
            />
          </SeccionFormulario>

          <div style={{ marginBottom: "18px" }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
              fontSize: "12px", fontWeight: 800, color: C.navy, marginBottom: "10px",
              paddingBottom: "6px", borderBottom: `1px solid ${C.border}`,
            }}>
              <span>Comprobante que se adjunta</span>
              {pdfUrl && (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: "12px", fontWeight: 700, color: C.blue, textDecoration: "none" }}
                >
                  Abrir en otra pestaña
                </a>
              )}
            </div>
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                title="Comprobantes de pago"
                style={{ width: "100%", height: "420px", border: `1px solid ${C.border}`, borderRadius: "10px" }}
              />
            ) : (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                height: "80px", borderRadius: "10px", background: C.bg, border: `1px solid ${C.border}`,
                fontSize: "12px", fontWeight: 700, color: C.muted,
              }}>
                <Loader2 size={14} className="animate-spin" /> Cargando el comprobante...
              </div>
            )}
          </div>

          {!form.fecha_pago && (
            <div style={{ marginTop: "14px", fontSize: "12px", fontWeight: 700, color: C.red }}>
              Falta la fecha del pago: Flokzu no acepta la solicitud sin ella.
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "22px" }}>
            <Btn label="Cancelar" variant="outline" onClick={() => setModal("cerrado")} />
            <Btn label="Enviar" onClick={enviar} disabled={!form.fecha_pago} />
          </div>
        </Modal>
      )}

      {modal === "enviando" && (
        <Modal>
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <Loader2 size={36} color={C.blue} className="animate-spin" style={{ margin: "0 auto 16px" }} />
            <div style={{ fontSize: "15px", fontWeight: 800, color: C.navy, marginBottom: "6px" }}>Registrando el pago</div>
            <div style={{ fontSize: "13px", color: C.amber, fontWeight: 700 }}>No cierres esta ventana.</div>
          </div>
        </Modal>
      )}

      {modal === "exito" && (
        <Modal>
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <CheckCircle2 size={40} color={C.green} style={{ margin: "0 auto 16px" }} />
            <div style={{ fontSize: "16px", fontWeight: 800, color: C.navy, marginBottom: "6px" }}>Pago registrado</div>
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: C.muted, lineHeight: 1.5 }}>
              El pago quedó guardado como pendiente, a la espera de que Tanner lo apruebe en Flokzu.
            </p>
            <Btn label="Cerrar" onClick={() => { setModal("cerrado"); abrirDetalle(idCredito); }} full />
          </div>
        </Modal>
      )}

      {modal === "error" && (
        <Modal>
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <AlertTriangle size={40} color={C.red} style={{ margin: "0 auto 16px" }} />
            <div style={{ fontSize: "16px", fontWeight: 800, color: C.navy, marginBottom: "6px" }}>No se pudo registrar el pago</div>
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: C.muted, lineHeight: 1.5 }}>{error}</p>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
              <Btn label="Cerrar" variant="outline" onClick={() => setModal("cerrado")} />
              <Btn label="Reintentar" onClick={() => setModal("revisar")} />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function SeccionFormulario({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: "18px" }}>
      <div style={{
        fontSize: "12px", fontWeight: 800, color: C.navy, marginBottom: "10px",
        paddingBottom: "6px", borderBottom: `1px solid ${C.border}`,
      }}>{titulo}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px" }}>
        {children}
      </div>
    </div>
  );
}

// Los toggles CECO/SAF de Flokzu: el "Sí/No" no es un dato aparte, es si hay monto.
function AjusteMonto({ label, detalle, monto, onChange }: {
  label: string;
  detalle: string;
  monto: number;
  onChange: (monto: number) => void;
}) {
  const [ultimoMonto, setUltimoMonto] = useState(monto);
  const activo = monto > 0;

  return (
    <div style={{ gridColumn: "span 3", display: "grid", gridTemplateColumns: "1fr 140px 1fr", gap: "12px", alignItems: "end" }}>
      <Campo label={label}>
        <div style={{ display: "flex", gap: "8px" }}>
          <Chip label="Sí" active={activo} onClick={() => onChange(ultimoMonto || 1)} />
          <Chip label="No" active={!activo} onClick={() => { setUltimoMonto(monto); onChange(0); }} />
        </div>
      </Campo>
      <Campo label="Monto">
        <input
          type="text"
          inputMode="numeric"
          disabled={!activo}
          value={monto ? new Intl.NumberFormat("es-CL").format(monto) : ""}
          onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
          style={{ ...ESTILO_INPUT, background: activo ? C.white : C.bg }}
        />
      </Campo>
      <div style={{ fontSize: "11px", color: C.muted, paddingBottom: "10px" }}>{detalle}</div>
    </div>
  );
}

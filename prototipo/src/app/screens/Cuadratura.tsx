import { useState } from "react";
import { AlertTriangle, Check, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { C, clp } from "../theme";
import { CUADRATURA_DETALLE } from "../data";
import type { DetalleTipo, Screen } from "../types";
import { Btn, Card } from "../ui";

// ════════════════════════════════════════════════════════════════════════════════
// CUADRATURA (doc §14.5 / §10) — previsualización de imputación antes de aplicar.
// Datos por ID de crédito (CUADRATURA_DETALLE en data.ts): cada "Compromiso N" del
// motor tiene un tono ok/observado que define su color e ícono.
// ════════════════════════════════════════════════════════════════════════════════
type EnvioModal = "cerrado" | "confirmar" | "enviando" | "exito";

export function Cuadratura({ navigate, abrirDetalle, idCredito }: {
  navigate: (s: Screen) => void;
  abrirDetalle: (tipo: DetalleTipo, idCredito: string, solcob?: string | null) => void;
  idCredito: string;
}) {
  const [modal, setModal] = useState<EnvioModal>("cerrado");
  const q = CUADRATURA_DETALLE[idCredito] ?? CUADRATURA_DETALLE["3350049"];

  const sumaCuotas = q.cuotas.reduce((s, c) => s + c.montoCuota, 0);
  const sumaCapital = q.cuotas.reduce((s, c) => s + c.capital, 0);
  const sumaInteres = q.cuotas.reduce((s, c) => s + c.interesMoratorio, 0);
  const sumaGastoCobranza = q.cuotas.reduce((s, c) => s + c.gastoCobranza, 0);
  const saldoAFavor = q.montoPagado - sumaCuotas;

  const confirmar = () => {
    setModal("enviando");
    setTimeout(() => setModal("exito"), 1800);
  };

  return (
    <>
      {/* Header: título + ID / RUT / frase */}
      <div style={{ padding: "18px 24px 18px" }}>
        <h1 style={{ margin: 0, fontSize: "31px", fontWeight: 800, letterSpacing: "-0.05em", color: C.navy, lineHeight: 1.08 }}>
          Cuadratura {q.id}
        </h1>
        <div style={{ marginTop: "6px", fontSize: "13px", color: C.muted, fontFamily: C.mono }}>RUT {q.rut}</div>
        <p style={{ margin: "6px 0 0", fontSize: "14px", color: C.muted, maxWidth: "760px", lineHeight: 1.45 }}>
          Previsualización de imputación antes de aplicar
        </p>
      </div>

      <div style={{ padding: "0 24px 24px" }}>
        {/* Resumen IA — arriba de la ficha */}
        <Card style={{ padding: "18px 20px", marginBottom: "20px", borderLeft: `5px solid ${q.tieneObservaciones ? C.amber : C.cyan}`, background: q.tieneObservaciones ? C.amberSoft : C.cyanSoft }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <Sparkles size={15} color={q.tieneObservaciones ? C.amber : C.cyan} />
            <span style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: q.tieneObservaciones ? C.amber : C.cyan }}>Resumen IA</span>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: C.navy, lineHeight: 1.55 }}>{q.resumenIA}</p>
          {q.observacionDestacada && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "8px",
              marginTop: "12px", padding: "10px 12px", borderRadius: "10px",
              background: "#fff", border: `1px solid rgba(217,119,6,0.3)`,
            }}>
              <AlertTriangle size={15} color={C.amber} style={{ flexShrink: 0, marginTop: "1px" }} />
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#7a4a00", lineHeight: 1.45 }}>
                Observación: {q.observacionDestacada}
              </span>
            </div>
          )}
        </Card>

        {/* Resultado del motor de cuadratura */}
        <h3 style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 700, color: C.navy }}>Resultado del motor de cuadratura</h3>
        <Card style={{ marginBottom: "16px", overflow: "hidden" }}>
          {q.checks.map((c, i) => {
            const ok = c.tono === "ok";
            return (
              <div key={c.n} style={{
                display: "flex", gap: "14px",
                padding: "16px 20px",
                background: ok ? C.greenSoft : C.amberSoft,
                borderBottom: i < q.checks.length - 1 ? `1px solid ${C.border}` : "none",
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

        {/* Tabla de imputación (doc §10.2) — desglose por cuota */}
        <h3 style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 700, color: C.navy }}>Tabla de imputación</h3>
        <Card style={{ marginBottom: "16px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "560px" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}>
                  {["N° Cuota", "Monto Cuota", "Capital", "Interés Moratorio", "Gasto Cobranza"].map((h, i) => (
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
                {q.cuotas.map((row, i) => (
                  <tr key={row.numCuota} style={{ borderBottom: i < q.cuotas.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 700, color: C.navy }}>Cuota {row.numCuota}</td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", fontFamily: C.mono, color: C.navy, fontWeight: 800, textAlign: "right" }}>{clp(row.montoCuota)}</td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", fontFamily: C.mono, color: C.navy, textAlign: "right" }}>{clp(row.capital)}</td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", fontFamily: C.mono, color: row.interesMoratorio > 0 ? C.red : C.muted, textAlign: "right" }}>{clp(row.interesMoratorio)}</td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", fontFamily: C.mono, color: C.navy, textAlign: "right" }}>{clp(row.gastoCobranza)}</td>
                  </tr>
                ))}
                <tr style={{ background: C.bg }}>
                  <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 800, color: C.navy }}>Total</td>
                  <td style={{ padding: "12px 16px", fontSize: "14px", fontFamily: C.mono, color: C.blue, textAlign: "right", fontWeight: 800 }}>{clp(sumaCuotas)}</td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", fontFamily: C.mono, color: C.navy, textAlign: "right", fontWeight: 800 }}>{clp(sumaCapital)}</td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", fontFamily: C.mono, color: C.navy, textAlign: "right", fontWeight: 800 }}>{clp(sumaInteres)}</td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", fontFamily: C.mono, color: C.navy, textAlign: "right", fontWeight: 800 }}>{clp(sumaGastoCobranza)}</td>
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
                <span style={{ fontWeight: 700, color: C.navy }}>Monto pagado:</span> {clp(q.montoPagado)}
              </span>
            </div>
            <span style={{ fontSize: "13px", fontWeight: 800 }}>
              {saldoAFavor === 0
                ? <span style={{ color: C.muted }}>Sin saldo a favor</span>
                : saldoAFavor > 0
                  ? <span style={{ color: C.cyan }}>Se genera un saldo a favor de +{clp(saldoAFavor)}</span>
                  : <span style={{ color: C.red }}>Saldo a favor negativo de -{clp(Math.abs(saldoAFavor))}</span>}
            </span>
          </div>
        </Card>

        {/* Información de control */}
        <h3 style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 700, color: C.navy }}>Información de control</h3>
        <Card style={{ marginBottom: "20px", overflow: "hidden" }}>
          {q.control.map((c, i) => (
            <div key={c.label} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 20px", borderBottom: i < q.control.length - 1 ? `1px solid ${C.border}` : "none",
            }}>
              <span style={{ fontSize: "13px", color: C.muted, fontWeight: 600 }}>{c.label}</span>
              <span style={{ fontSize: "13px", color: C.navy, fontWeight: 700, textAlign: "right" }}>{c.val}</span>
            </div>
          ))}
        </Card>

        <div style={{ display: "flex", gap: "10px" }}>
          <Btn label="Solicitar revisión" variant="outline" onClick={() => navigate("excepciones")} />
          <Btn label="Confirmar envío" onClick={() => setModal("confirmar")} full />
        </div>
      </div>

      {modal !== "cerrado" && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 80,
          background: "rgba(8, 15, 31, 0.48)", backdropFilter: "blur(10px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
        }}>
          <div style={{
            width: "100%", maxWidth: "440px", borderRadius: "20px", background: "#fff",
            border: `1px solid ${C.border}`, boxShadow: "0 28px 72px rgba(0,30,61,0.25)",
            padding: "28px 26px",
          }}>
            {modal === "confirmar" && (
              <>
                <div style={{ fontSize: "18px", fontWeight: 800, color: C.navy, marginBottom: "10px" }}>Confirmar envío</div>
                <p style={{ margin: "0 0 16px", fontSize: "13px", color: C.muted, lineHeight: 1.5 }}>
                  Vas a enviar este pago cuadrado a Tanner para su aplicación. Esta acción no se puede deshacer.
                </p>
                {q.tieneObservaciones && (
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: "8px",
                    marginBottom: "22px", padding: "12px 14px", borderRadius: "10px",
                    background: C.amberSoft, border: "1px solid rgba(217,119,6,0.25)",
                  }}>
                    <AlertTriangle size={16} color={C.amber} style={{ flexShrink: 0, marginTop: "1px" }} />
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#7a4a00", lineHeight: 1.45 }}>
                      Estás enviando un pago con observaciones. ¿Estás seguro?
                    </span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: q.tieneObservaciones ? 0 : "22px" }}>
                  <Btn label="Cancelar" variant="outline" onClick={() => setModal("cerrado")} />
                  <Btn label="Confirmar" onClick={confirmar} />
                </div>
              </>
            )}

            {modal === "enviando" && (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <Loader2 size={36} color={C.blue} className="animate-spin" style={{ margin: "0 auto 16px" }} />
                <div style={{ fontSize: "15px", fontWeight: 800, color: C.navy, marginBottom: "6px" }}>Enviando información a Tanner</div>
                <div style={{ fontSize: "13px", color: C.amber, fontWeight: 700 }}>No cierres esta ventana.</div>
              </div>
            )}

            {modal === "exito" && (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <CheckCircle2 size={40} color={C.green} style={{ margin: "0 auto 16px" }} />
                <div style={{ fontSize: "16px", fontWeight: 800, color: C.navy, marginBottom: "6px" }}>Envío exitoso</div>
                <p style={{ margin: "0 0 20px", fontSize: "13px", color: C.muted, lineHeight: 1.5 }}>
                  El pago fue enviado correctamente a Tanner para su aplicación.
                </p>
                <Btn label="Cerrar" onClick={() => { setModal("cerrado"); abrirDetalle("compromiso", q.id); }} full />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

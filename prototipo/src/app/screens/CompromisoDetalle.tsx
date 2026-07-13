import { Sparkles, Upload, Zap } from "lucide-react";
import { C, clp, STATUS } from "../theme";
import { COMPROMISOS_DETALLE } from "../data";
import type { DetalleTipo, Screen } from "../types";
import { Badge, Btn, Card } from "../ui";

// Fondo/borde de cada card derivados del mismo color que ya usa su Badge (STATUS),
// para que nunca puedan quedar desincronizados entre el chip y la tarjeta.
function tintFor(statusKey: string) {
  const [color, bg] = STATUS[statusKey] ?? [C.muted, "rgba(107,114,128,0.1)"];
  return { background: bg, border: `1px solid ${color}30` };
}

// ════════════════════════════════════════════════════════════════════════════════
// DETALLE — ficha compartida por Compromisos y Pagos (ambos se identifican por el
// ID del crédito; un Pago además muestra el código de solicitud SOLCOB). Los datos
// salen de COMPROMISOS_DETALLE (data.ts), la misma fuente que usa Panel, así que
// nunca se desincroniza con lo que se ve en "Mis compromisos activos".
// ════════════════════════════════════════════════════════════════════════════════
export function CompromisoDetalle({ navigate, tipo = "compromiso", idCredito, solcob }: {
  navigate: (s: Screen) => void; tipo?: DetalleTipo; idCredito: string; solcob?: string | null;
}) {
  const f = COMPROMISOS_DETALLE[idCredito];

  if (!f) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center", fontSize: "13px", color: C.muted }}>
        No hay ficha detallada disponible para el crédito {idCredito}.
      </div>
    );
  }

  return (
    <>
      {/* Header: ID del crédito / RUT / (SOLCOB si es un Pago) */}
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        gap: "16px", padding: "18px 24px 18px",
      }}>
        <div>
          <div style={{ fontSize: "31px", fontWeight: 800, letterSpacing: "-0.05em", color: C.navy, lineHeight: 1.08 }}>
            ID {f.id}
          </div>
          <div style={{ marginTop: "6px", fontSize: "13px", color: C.muted, fontFamily: C.mono }}>RUT {f.rut}</div>
          {tipo === "pago" && solcob && (
            <div style={{ marginTop: "2px", fontSize: "13px", color: C.muted, fontFamily: C.mono }}>{solcob}</div>
          )}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Btn
            label={f.situacion === "SITUACION_PENDIENTE" ? "Validar pago" : "Cargar comprobante"}
            icon={Upload}
            onClick={() => navigate("comprobante")}
            disabled={f.situacion === "SITUACION_VALIDADO" || f.situacion === "SITUACION_OBSERVADO"}
          />
          <Btn
            label={f.situacion === "SITUACION_PENDIENTE" ? "Cuadratura pendiente" : "Ver cuadratura"}
            icon={Zap}
            onClick={() => navigate("cuadratura")}
            variant="ghost"
            disabled={f.situacion === "SITUACION_PENDIENTE"}
          />
        </div>
      </div>

      <div style={{ padding: "0 24px 24px" }}>
        {/* Resumen IA */}
        <Card style={{ padding: "18px 20px", marginBottom: "20px", borderLeft: `5px solid ${C.cyan}`, background: C.cyanSoft }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <Sparkles size={15} color={C.cyan} />
            <span style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: C.cyan }}>Resumen IA</span>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: C.navy, lineHeight: 1.55 }}>{f.resumenIA}</p>
        </Card>

        {/* Fecha, Estado, Pago, Situación y Monto — mismas columnas que "Mi cartera" en el Panel */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "12px", marginBottom: "20px" }}>
          <Card style={{ padding: "18px 18px", minHeight: "92px", background: C.blueSoft, border: "1px solid rgba(0,92,185,0.18)" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted }}>Fecha del compromiso</div>
            <div style={{ marginTop: "5px", fontSize: "18px", fontWeight: 800, fontFamily: C.mono, color: C.blue, letterSpacing: "-0.03em" }}>{f.fechaCompromiso}</div>
          </Card>
          <Card style={{ padding: "18px 18px", minHeight: "92px", ...tintFor("COMPROMETIDO") }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: "8px" }}>Estado</div>
            <Badge s="COMPROMETIDO" />
          </Card>
          <Card style={{ padding: "18px 18px", minHeight: "92px", ...tintFor(f.estadoPago) }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: "8px" }}>Pago</div>
            <Badge s={f.estadoPago} />
          </Card>
          <Card style={{ padding: "18px 18px", minHeight: "92px", ...tintFor(f.situacion) }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: "8px" }}>Situación</div>
            <Badge s={f.situacion} />
          </Card>
          <Card style={{ padding: "18px 18px", minHeight: "92px", background: C.blueSoft, border: "1px solid rgba(0,92,185,0.18)" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted }}>Monto</div>
            <div style={{ marginTop: "5px", fontSize: "18px", fontWeight: 800, fontFamily: C.mono, color: C.blue, letterSpacing: "-0.03em" }}>{clp(f.montoComprometido - f.montoRecibido)}</div>
          </Card>
        </div>

        {/* Cuotas pendientes — desglose tipo "Excel de cuotas" (doc §6.1) */}
        <h3 style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 700, color: C.navy }}>Cuotas pendientes</h3>
        <Card style={{ marginBottom: "20px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "920px" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}>
                  {["N° cuota", "Vencimiento", "Valor cuota nominal", "Interés de mora", "Gastos de cobranza", "CECO", "SAF", "Costas judiciales", "Monto total", "Estado"].map((h, i) => (
                    <th key={h} style={{
                      textAlign: i === 0 ? "left" : "right",
                      padding: "10px 16px",
                      fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                      color: C.muted, whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {f.cuotas.map((c, i) => (
                  <tr key={c.num} style={{ borderBottom: i < f.cuotas.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <td style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 800, color: C.navy }}>Cuota {c.num}</td>
                    <td style={{ padding: "14px 16px", fontSize: "13px", fontFamily: C.mono, color: C.navy, textAlign: "right" }}>{c.venc}</td>
                    <td style={{ padding: "14px 16px", fontSize: "13px", fontFamily: C.mono, color: C.navy, textAlign: "right" }}>{clp(c.valorNominal)}</td>
                    <td style={{ padding: "14px 16px", fontSize: "13px", fontFamily: C.mono, color: c.mora > 0 ? C.red : C.muted, textAlign: "right" }}>{clp(c.mora)}</td>
                    <td style={{ padding: "14px 16px", fontSize: "13px", fontFamily: C.mono, color: C.navy, textAlign: "right" }}>{clp(c.gastosCobranza)}</td>
                    <td style={{ padding: "14px 16px", fontSize: "13px", fontFamily: C.mono, color: C.navy, textAlign: "right" }}>{clp(c.ceco)}</td>
                    <td style={{ padding: "14px 16px", fontSize: "13px", fontFamily: C.mono, color: c.saf > 0 ? C.cyan : C.muted, textAlign: "right" }}>{clp(c.saf)}</td>
                    <td style={{ padding: "14px 16px", fontSize: "13px", fontFamily: C.mono, color: C.navy, textAlign: "right" }}>{clp(c.costasJudiciales)}</td>
                    <td style={{ padding: "14px 16px", fontSize: "14px", fontWeight: 800, fontFamily: C.mono, color: C.navy, textAlign: "right" }}>{clp(c.aPagar)}</td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}><Badge s={c.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Timeline */}
        <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: C.navy }}>Historial</h3>
        <Card style={{ padding: "8px 0" }}>
          {f.historial.map((e, i) => (
            <div key={i} style={{ display: "flex", gap: "14px", padding: "12px 20px" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, paddingTop: "4px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "999px", background: e.dot }} />
                {i < f.historial.length - 1 && <div style={{ width: "2px", flex: 1, background: C.border, marginTop: "4px" }} />}
              </div>
              <div style={{ paddingBottom: "8px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: C.navy }}>{e.desc}</div>
                <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginTop: "4px" }}>
                  <span style={{ fontSize: "11px", color: C.muted }}>
                    <span style={{ fontWeight: 700, color: C.navy }}>Fecha:</span> <span style={{ fontFamily: C.mono }}>{e.fecha}</span>
                  </span>
                  <span style={{ fontSize: "11px", color: C.muted }}>
                    <span style={{ fontWeight: 700, color: C.navy }}>Hora:</span> <span style={{ fontFamily: C.mono }}>{e.hora}</span>
                  </span>
                  <span style={{ fontSize: "11px", color: C.muted }}>
                    <span style={{ fontWeight: 700, color: C.navy }}>Usuario:</span> {e.quien}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}

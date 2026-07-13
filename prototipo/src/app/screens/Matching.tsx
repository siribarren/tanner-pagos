import { Check, FileWarning } from "lucide-react";
import { C, clp } from "../theme";
import type { Screen } from "../types";
import { Badge, Btn, Card, TopBar } from "../ui";

// ════════════════════════════════════════════════════════════════════════════════
// MATCHING (doc §14.4 / §9) — coincidencia entre compromiso, comprobante y Mónaco
// ════════════════════════════════════════════════════════════════════════════════
const MOTIVOS = [
  { label: "RUT del pagador coincide con el cliente del compromiso", ok: true },
  { label: "Monto transferido coincide dentro de la tolerancia definida", ok: true },
  { label: "Fecha de transferencia es consistente con la fecha comprometida", ok: true },
  { label: "Cuenta destino corresponde a una cuenta oficial Tanner", ok: true },
];

export function Matching({ navigate }: { navigate: (s: Screen) => void }) {
  const puntaje = 96;

  return (
    <>
      <TopBar
        title="Matching"
        sub="3350049 · Pamela González Álvarez · Coincidencia entre compromiso, comprobante y Mónaco"
        right={<Badge s="MATCH_EXACTO" />}
      />

      <div style={{ padding: "0 24px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          {/* Compromiso sugerido */}
          <Card style={{ padding: "18px 20px", borderLeft: `4px solid ${C.blue}` }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.blue, marginBottom: "8px" }}>Compromiso sugerido</div>
            <div style={{ fontSize: "15px", fontWeight: 800, color: C.navy }}>3350049</div>
            <div style={{ fontSize: "13px", color: C.navy, marginTop: "2px" }}>Pamela González Álvarez · RUT 15.221.775-7</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "14px" }}>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: C.muted }}>Monto comprometido</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: C.navy, fontFamily: C.mono }}>{clp(250000)}</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: C.muted }}>Fecha comprometida</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: C.navy, fontFamily: C.mono }}>05/07/2026</div>
              </div>
            </div>
          </Card>

          {/* Cartola sugerida — fuera de alcance temporal (doc §6.5 / §20.3) */}
          <Card style={{ padding: "18px 20px", opacity: 0.6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <FileWarning size={16} color={C.muted} />
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted }}>Cartola sugerida</div>
            </div>
            <div style={{ fontSize: "13px", color: C.muted, lineHeight: 1.5 }}>
              La validación contra cartola bancaria queda fuera de alcance en esta versión de la plataforma. El matching se resuelve con el comprobante y la información de Mónaco.
            </div>
          </Card>
        </div>

        {/* Puntaje de match */}
        <Card style={{ padding: "20px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontSize: "13px", fontWeight: 800, color: C.navy }}>Puntaje de match</span>
            <span style={{ fontSize: "20px", fontWeight: 800, color: C.green, fontFamily: C.mono }}>{puntaje}%</span>
          </div>
          <div style={{ height: "10px", borderRadius: "999px", background: "#e9eef6", overflow: "hidden" }}>
            <div style={{ width: `${puntaje}%`, height: "100%", background: "linear-gradient(90deg,#0b7c5a,#16a34a)", borderRadius: "999px" }} />
          </div>
        </Card>

        {/* Motivos de match */}
        <h3 style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 700, color: C.navy }}>Motivos de match</h3>
        <Card style={{ marginBottom: "20px", overflow: "hidden" }}>
          {MOTIVOS.map((m, i) => (
            <div key={m.label} style={{
              display: "flex", alignItems: "center", gap: "12px", padding: "14px 20px",
              borderBottom: i < MOTIVOS.length - 1 ? `1px solid ${C.border}` : "none",
            }}>
              <div style={{
                width: "24px", height: "24px", borderRadius: "999px",
                background: C.green, display: "grid", placeItems: "center", flexShrink: 0,
              }}>
                <Check size={13} color="#fff" strokeWidth={3} />
              </div>
              <span style={{ fontSize: "13px", color: C.navy, fontWeight: 500 }}>{m.label}</span>
            </div>
          ))}
        </Card>

        <div style={{ display: "flex", gap: "10px" }}>
          <Btn label="Derivar a revisión" variant="outline" onClick={() => navigate("excepciones")} />
          <Btn label="Confirmar match" onClick={() => navigate("cuadratura")} full />
        </div>
      </div>
    </>
  );
}

import { useState } from "react";
import { C, clp } from "../theme";
import { Badge, Btn, Card, Chip, ReceiptThumb, TopBar } from "../ui";
import tx1Url from "../../assets/reference/tx1.jpeg";

// ════════════════════════════════════════════════════════════════════════════════
// BANDEJA DE EXCEPCIONES (doc §14.6 / §11) — solo rol Supervisor
// ════════════════════════════════════════════════════════════════════════════════
type Caso = {
  id: string;
  cliente: string;
  ejecutivo: string;
  cartera: string;
  motivo: string;
  montoMonaco: number;
  montoTransferido: number;
  diferencia: number;
  reglaIncumplida: string;
  estado: string;
  recomendacion: string;
};

// El ID es el ID del crédito: numérico, 7 dígitos, clave única en toda la plataforma.
const CASOS_INICIALES: Caso[] = [
  { id: "3287612", cliente: "Rodrigo Soto Fuentes",     ejecutivo: "Daniela Poblete", cartera: "Vigente",   motivo: "Faltante superior a $10.000", montoMonaco: 215000, montoTransferido: 130800, diferencia: 84200, reglaIncumplida: "Regla 5 · Pago menor fuera de tolerancia",     estado: "REQUIERE_AUTORIZACION", recomendacion: "Derivar a supervisor: la diferencia excede el margen de $10.000." },
  { id: "3419820", cliente: "Manuel Torres Díaz",       ejecutivo: "Felipe Aránguiz", cartera: "Judicial",  motivo: "SAF no confirmado",           montoMonaco: 340000, montoTransferido: 345500, diferencia: 5500,  reglaIncumplida: "Regla 7 · Excedente no imputable a mora",       estado: "OBSERVADO",             recomendacion: "Confirmar SAF de $5.500 antes de aplicar." },
  { id: "2765431", cliente: "Beatriz Núñez Silva",      ejecutivo: "Ignacia Rojas",   cartera: "Castigada", motivo: "OCR con baja confianza",      montoMonaco: 98000,  montoTransferido: 98000,  diferencia: 0,     reglaIncumplida: "Confianza OCR 61% (bajo el umbral definido)",   estado: "OBSERVADO",             recomendacion: "Revisar comprobante manualmente antes de aplicar." },
  { id: "3198765", cliente: "Sergio Palma Vidal",       ejecutivo: "Carlos Morales",  cartera: "Vigente",   motivo: "Fecha inconsistente",         montoMonaco: 176500, montoTransferido: 176500, diferencia: 0,     reglaIncumplida: "Fecha del comprobante distinta a la fecha oficial", estado: "OBSERVADO",         recomendacion: "Confirmar con el ejecutivo la fecha oficial de aplicación." },
  { id: "2734510", cliente: "Marcela Uribe Contreras",  ejecutivo: "Daniela Poblete", cartera: "Judicial",  motivo: "Pago duplicado",              montoMonaco: 152300, montoTransferido: 152300, diferencia: 0,     reglaIncumplida: "Comprobante ya utilizado en el crédito 2734498",    estado: "REQUIERE_AUTORIZACION", recomendacion: "Bloquear aplicación hasta confirmar duplicidad." },
];

const MOTIVOS = ["Todos", ...Array.from(new Set(CASOS_INICIALES.map((c) => c.motivo)))];

export function Excepciones() {
  const [casos, setCasos] = useState(CASOS_INICIALES);
  const [motivo, setMotivo] = useState("Todos");
  const [selectedId, setSelectedId] = useState<string | null>(CASOS_INICIALES[0].id);
  const [comentario, setComentario] = useState("");

  const filtrados = casos.filter((c) => motivo === "Todos" || c.motivo === motivo);
  const seleccionado = casos.find((c) => c.id === selectedId) ?? null;

  const resolver = (id: string, nuevoEstado: string) => {
    setCasos((prev) => prev.map((c) => (c.id === id ? { ...c, estado: nuevoEstado } : c)));
    setComentario("");
  };

  return (
    <>
      <TopBar
        title="Bandeja de excepciones"
        sub="Casos que no pueden aplicarse automáticamente y requieren revisión de un supervisor"
      />

      <div style={{ padding: "0 24px 24px" }}>
        {/* Filtro por motivo */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
          {MOTIVOS.map((m) => (
            <Chip key={m} label={m} tone="blue" active={motivo === m} onClick={() => setMotivo(m)} />
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "16px", alignItems: "start" }}>
          {/* Lista de casos */}
          <Card style={{ overflow: "hidden" }}>
            {filtrados.map((c, i) => (
              <button
                key={c.id}
                onClick={() => { setSelectedId(c.id); setComentario(""); }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr auto auto",
                  alignItems: "center", gap: "14px",
                  width: "100%", padding: "16px 18px",
                  background: c.id === selectedId ? "rgba(0,92,185,0.05)" : "transparent",
                  border: "none",
                  borderBottom: i < filtrados.length - 1 ? `1px solid ${C.border}` : "none",
                  boxShadow: c.id === selectedId ? `inset 4px 0 0 ${C.blue}` : "none",
                  cursor: "pointer", textAlign: "left",
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: C.navy, fontFamily: C.mono }}>{c.id}</div>
                  <div style={{ fontSize: "13px", color: C.navy, marginTop: "2px" }}>{c.cliente}</div>
                  <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>{c.motivo} · {c.ejecutivo}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: C.navy, fontFamily: C.mono }}>{clp(c.diferencia)}</div>
                  <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>diferencia</div>
                </div>
                <Badge s={c.estado} />
              </button>
            ))}
            {filtrados.length === 0 && (
              <div style={{ padding: "28px", textAlign: "center", fontSize: "13px", color: C.muted }}>Sin casos para este filtro.</div>
            )}
          </Card>

          {/* Detalle del caso (doc §11.4) */}
          {seleccionado ? (
            <Card style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "14px" }}>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: C.navy }}>{seleccionado.cliente}</div>
                  <div style={{ fontSize: "12px", color: C.muted, marginTop: "2px", fontFamily: C.mono }}>{seleccionado.id} · Ejecutivo: {seleccionado.ejecutivo}</div>
                </div>
                <Badge s={seleccionado.estado} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                <div style={{ padding: "10px 12px", borderRadius: "10px", background: C.bg, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: C.muted }}>Monto Mónaco</div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: C.navy, fontFamily: C.mono, marginTop: "3px" }}>{clp(seleccionado.montoMonaco)}</div>
                </div>
                <div style={{ padding: "10px 12px", borderRadius: "10px", background: C.bg, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: C.muted }}>Monto transferido</div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: C.navy, fontFamily: C.mono, marginTop: "3px" }}>{clp(seleccionado.montoTransferido)}</div>
                </div>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: C.muted, marginBottom: "4px" }}>Regla incumplida</div>
                <div style={{ fontSize: "13px", color: C.navy, fontWeight: 600 }}>{seleccionado.reglaIncumplida}</div>
              </div>

              <div style={{
                padding: "12px 14px", borderRadius: "10px", background: C.cyanSoft,
                marginBottom: "14px",
              }}>
                <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: C.cyan, marginBottom: "4px" }}>Recomendación automática</div>
                <div style={{ fontSize: "12px", color: C.navy, lineHeight: 1.5 }}>{seleccionado.recomendacion}</div>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <ReceiptThumb src={tx1Url} label="Comprobante asociado" caption="Adjuntado por el ejecutivo" />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: C.muted, marginBottom: "6px" }}>Comentario</label>
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Agregar un comentario estructurado para trazabilidad..."
                  rows={2}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: "10px",
                    border: `1px solid ${C.border}`, fontSize: "13px", color: C.text,
                    fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <Btn label="Aprobar" onClick={() => resolver(seleccionado.id, "APROBADO")} />
                <Btn label="Rechazar" variant="outline" onClick={() => resolver(seleccionado.id, "RECHAZADO")} />
                <Btn label="Solicitar corrección" variant="ghost" onClick={() => resolver(seleccionado.id, "EN_REVISION")} />
                <Btn label="Derivar a Recaudaciones" variant="ghost" onClick={() => resolver(seleccionado.id, "RECAUDACIONES")} />
              </div>
            </Card>
          ) : (
            <Card style={{ padding: "28px", textAlign: "center", fontSize: "13px", color: C.muted }}>
              Selecciona un caso para ver el detalle.
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

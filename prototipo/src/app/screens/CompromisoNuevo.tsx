import { useEffect, useState } from "react";
import { Check, Plus, Sparkles } from "lucide-react";
import { C, clp } from "../theme";
import { INFO_COMPROMISO_NUEVO } from "../data";
import type { Screen } from "../types";
import { Badge, Btn, Card, Chip } from "../ui";
import { ProgressModal, type ProgressStep } from "../ProgressModal";
import { DatePicker } from "../DatePicker";

// ════════════════════════════════════════════════════════════════════════════════
// CREACIÓN DE COMPROMISO (doc §14.2) — desglose oficial desde Mónaco
// ════════════════════════════════════════════════════════════════════════════════
const CANALES = ["Teléfono", "WhatsApp", "Presencial"];

const hoyISO = () => new Date().toISOString().slice(0, 10);

function formatoFechaLarga(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${parseInt(d, 10)} de ${meses[parseInt(m, 10) - 1]} de ${y}`;
}

type ModalPaso = "cerrado" | "confirmar" | "progreso";

const PASOS_GENERAR_COMPROMISO: ProgressStep[] = [
  {
    key: "generar",
    title: "Generando el compromiso",
    runningText: "Registrando fecha, monto y canal de contacto en la plataforma.",
    successText: "Compromiso generado con éxito y registrado en la plataforma.",
    errorText: "Error al generar el compromiso. No se pudo registrar en la plataforma.",
  },
  {
    key: "enviar",
    title: "Enviando compromiso al cliente por WhatsApp / mail",
    runningText: "Notificando al cliente por el canal seleccionado.",
    successText: "Compromiso enviado con éxito al cliente.",
    errorText: "Error al enviar el compromiso al cliente. Intenta nuevamente.",
  },
];

const PROGRESO_RESUMEN = {
  running: "Estamos generando el compromiso y notificando al cliente. El proceso puede tardar unos segundos.",
  success: "El compromiso quedó generado y fue enviado correctamente al cliente.",
  error: "Se detectó un error al generar el compromiso. Puedes cerrar la ventana o reintentar el proceso completo.",
};

export function CompromisoNuevo({ idCredito, navigate }: { idCredito: string; navigate: (s: Screen) => void }) {
  const info = INFO_COMPROMISO_NUEVO[idCredito] ?? INFO_COMPROMISO_NUEVO["3350049"];
  const [sel, setSel] = useState<number[]>(info.seleccionInicial);
  const [canal, setCanal] = useState("Teléfono");
  const [fecha, setFecha] = useState(hoyISO());
  const [montoManual, setMontoManual] = useState<number>(0);
  const [modal, setModal] = useState<ModalPaso>("cerrado");
  const [progresoRunId, setProgresoRunId] = useState(0);
  const [montoFocused, setMontoFocused] = useState(false);
  const [creado, setCreado] = useState(false);

  const toggle = (n: number) => setSel(p => p.includes(n) ? p.filter(x => x !== n) : [...p, n]);
  const totalCuotas = info.cuotas.filter(c => sel.includes(c.num)).reduce((s, c) => s + c.aPagar, 0);

  // El monto manual sigue al total de cuotas seleccionadas por defecto; el
  // ejecutivo puede sobrescribirlo si el cliente comprometió un monto distinto.
  useEffect(() => setMontoManual(totalCuotas), [totalCuotas]);

  const saf = montoManual - totalCuotas;
  const deudaTotal = info.cuotas.reduce((s, c) => s + c.aPagar, 0);

  const generar = () => {
    setCreado(false);
    setModal("progreso");
    setProgresoRunId((current) => current + 1);
  };
  const reintentarGenerar = () => setProgresoRunId((current) => current + 1);

  const botonLabel = sel.length
    ? `Crear compromiso por ${clp(montoManual)}`
    : "Selecciona al menos una cuota";

  return (
    <>
      {/* Header: ID del crédito / RUT — mismo formato que la ficha de detalle */}
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        gap: "16px", padding: "18px 24px 18px",
      }}>
        <div>
          <div style={{ fontSize: "31px", fontWeight: 800, letterSpacing: "-0.05em", color: C.navy, lineHeight: 1.08 }}>
            ID {idCredito}
          </div>
          <div style={{ marginTop: "6px", fontSize: "13px", color: C.muted, fontFamily: C.mono }}>RUT {info.rut}</div>
        </div>
        <Btn
          label={botonLabel}
          icon={Plus}
          onClick={() => sel.length && setModal("confirmar")}
          variant={sel.length ? "primary" : "ghost"}
        />
      </div>

      <div style={{ padding: "0 24px 24px" }}>
        {/* Resumen IA */}
        <Card style={{ padding: "18px 20px", marginBottom: "20px", borderLeft: `5px solid ${C.cyan}`, background: C.cyanSoft }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <Sparkles size={15} color={C.cyan} />
            <span style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: C.cyan }}>Resumen IA</span>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: C.navy, lineHeight: 1.55 }}>
            El cliente mantiene {info.cuotas.length} cuota{info.cuotas.length > 1 ? "s" : ""} vencida{info.cuotas.length > 1 ? "s" : ""} por un total de {clp(deudaTotal)}. Aún no existe un compromiso de pago formalizado; defina fecha, monto y canal de contacto para generarlo.
          </p>
        </Card>

        {/* Fecha / Estado / Pago / Situación / Monto */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "12px", marginBottom: "12px" }}>
          <Card style={{ padding: "16px 16px", minHeight: "92px", background: C.blueSoft, border: "1px solid rgba(0,92,185,0.18)" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: "8px" }}>Fecha del compromiso</div>
            <DatePicker value={fecha} onChange={setFecha} min={hoyISO()} />
          </Card>
          <Card style={{ padding: "16px 16px", minHeight: "92px", background: "#f1f5f9", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: "8px" }}>Estado</div>
            <Badge s={creado ? "PENDIENTE" : "SIN_COMPROMISO"} />
          </Card>
          <Card style={{ padding: "16px 16px", minHeight: "92px", background: "#f1f5f9", border: `1px solid ${C.border}`, opacity: creado ? 1 : 0.75 }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: "8px" }}>Pago</div>
            {creado ? <Badge s="TOTAL" /> : <div style={{ fontSize: "12px", color: C.muted, fontWeight: 700 }}>Se define al guardar</div>}
          </Card>
          <Card style={{ padding: "16px 16px", minHeight: "92px", background: "#f1f5f9", border: `1px solid ${C.border}`, opacity: creado ? 1 : 0.75 }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: "8px" }}>Situación</div>
            {creado ? <Badge s="SITUACION_PENDIENTE" /> : <div style={{ fontSize: "12px", color: C.muted, fontWeight: 700 }}>Se define al guardar</div>}
          </Card>
          <Card style={{ padding: "16px 16px", minHeight: "92px", background: C.blueSoft, border: "1px solid rgba(0,92,185,0.18)" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted }}>Monto según cuotas</div>
            <div style={{ marginTop: "5px", fontSize: "16px", fontWeight: 800, fontFamily: C.mono, color: C.blue, letterSpacing: "-0.03em" }}>{clp(totalCuotas)}</div>
          </Card>
        </div>

        {/* Monto manual y Saldo a favor */}
        <Card style={{ padding: "18px 20px", marginBottom: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: "8px" }}>Monto que el cliente se compromete a pagar</div>
              <div style={{ position: "relative", width: "220px" }}>
                <span style={{
                  position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
                  fontSize: "15px", fontWeight: 800, color: C.blue, pointerEvents: "none",
                }}>$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={montoManual ? new Intl.NumberFormat("es-CL").format(montoManual) : ""}
                  onChange={(e) => setMontoManual(Number(e.target.value.replace(/\D/g, "")) || 0)}
                  onFocus={() => setMontoFocused(true)}
                  onBlur={() => setMontoFocused(false)}
                  style={{
                    height: "44px", width: "100%", padding: "0 14px 0 30px",
                    borderRadius: "12px", border: `1.5px solid ${montoFocused ? C.blue : C.border}`,
                    fontSize: "16px", fontWeight: 800, color: C.navy,
                    fontFamily: C.mono, outline: "none", boxSizing: "border-box",
                    background: C.white,
                    boxShadow: montoFocused ? "0 0 0 3px rgba(0,92,185,0.12)" : "0 1px 2px rgba(0,30,61,0.04)",
                    transition: "box-shadow 0.15s, border-color 0.15s",
                  }}
                />
              </div>
              <div style={{ fontSize: "11px", color: C.muted, marginTop: "6px", lineHeight: 1.4 }}>
                Por defecto es el monto según las cuotas seleccionadas. Edítalo si el cliente comprometió un monto distinto.
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: "8px" }}>Saldo a favor</div>
              <div style={{ fontSize: "22px", fontWeight: 800, fontFamily: C.mono, letterSpacing: "-0.03em", color: saf < 0 ? C.red : saf > 0 ? C.cyan : C.muted }}>
                {saf === 0 ? clp(0) : `${saf > 0 ? "+" : "-"}${clp(Math.abs(saf))}`}
              </div>
            </div>
          </div>
        </Card>

        {/* Cuotas pendientes vencidas */}
        <h3 style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 700, color: C.navy }}>Cuotas pendientes vencidas</h3>
        <Card style={{ marginBottom: "16px", overflow: "hidden" }}>
          {info.cuotas.map((c, i) => {
            const active = sel.includes(c.num);
            return (
              <button key={c.num} onClick={() => toggle(c.num)} style={{
                display: "grid",
                gridTemplateColumns: "32px 88px 1fr auto auto",
                alignItems: "center", gap: "14px",
                width: "100%", padding: "16px 20px",
                background: active ? "rgba(0,92,185,0.04)" : "transparent",
                border: "none",
                borderBottom: i < info.cuotas.length - 1 ? `1px solid ${C.border}` : "none",
                boxShadow: active ? "inset 4px 0 0 " + C.blue : "none",
                cursor: "pointer", textAlign: "left",
              }}>
                {/* Checkbox */}
                <div style={{
                  width: "20px", height: "20px", borderRadius: "6px",
                  border: `2px solid ${active ? C.blue : C.border}`,
                  background: active ? C.blue : "transparent",
                  display: "grid", placeItems: "center", flexShrink: 0,
                }}>
                  {active && <Check size={12} color="#fff" strokeWidth={3} />}
                </div>

                {/* Cuota num */}
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: C.navy }}>Cuota {c.num}</div>
                  <div style={{ fontSize: "11px", color: C.muted, fontFamily: C.mono }}>{c.venc}</div>
                </div>

                {/* Mora warning */}
                <div>
                  {c.mora > 0 && (
                    <span style={{ fontSize: "12px", color: C.red, fontWeight: 600 }}>+{clp(c.mora)} mora</span>
                  )}
                </div>

                {/* Amount */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: C.navy, fontFamily: C.mono, letterSpacing: "-0.03em" }}>{clp(c.aPagar)}</div>
                </div>

                {/* Status */}
                <Badge s={c.estado} />
              </button>
            );
          })}
        </Card>

        {/* Historial */}
        <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: C.navy }}>Historial</h3>
        <Card style={{ padding: "8px 0", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "14px", padding: "12px 20px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, paddingTop: "4px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "999px", background: C.blue }} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: C.navy }}>Consulta a Mónaco · deuda vigente obtenida</div>
              <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px", fontFamily: C.mono }}>{formatoFechaLarga(hoyISO())} · Carlos Morales</div>
            </div>
          </div>
        </Card>

        {/* Canal de contacto */}
        <Card style={{ padding: "18px 20px", marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: "8px" }}>Canal de contacto</div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {CANALES.map((c) => (
              <Chip key={c} label={c} active={canal === c} onClick={() => setCanal(c)} />
            ))}
          </div>
        </Card>

        {/* Selection total */}
        {sel.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px", borderRadius: "14px",
            background: "linear-gradient(135deg,#eaf2fb,#d8ecf8)",
            border: `1px solid rgba(0,92,185,0.18)`,
            borderLeft: `5px solid ${C.blue}`,
            marginBottom: "16px",
          }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#0b2e61" }}>
              {sel.length} cuota{sel.length > 1 ? "s" : ""} · Monto comprometido ({formatoFechaLarga(fecha)})
            </span>
            <span style={{ fontSize: "24px", fontWeight: 800, color: C.blue, fontFamily: C.mono, letterSpacing: "-0.04em" }}>
              {clp(montoManual)}
            </span>
          </div>
        )}

        <Btn label={botonLabel} icon={Plus} onClick={() => sel.length && setModal("confirmar")} full />
      </div>

      {modal === "confirmar" && (
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
            <div style={{ fontSize: "18px", fontWeight: 800, color: C.navy, marginBottom: "10px" }}>Confirmar compromiso</div>
            <p style={{ margin: "0 0 22px", fontSize: "13px", color: C.muted, lineHeight: 1.5 }}>
              Vas a crear un compromiso de pago por {clp(montoManual)} para el {formatoFechaLarga(fecha)}, vía {canal.toLowerCase()}.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <Btn label="Cancelar" variant="outline" onClick={() => setModal("cerrado")} />
              <Btn label="Confirmar" onClick={generar} />
            </div>
          </div>
        </div>
      )}

      <ProgressModal
        open={modal === "progreso"}
        runId={progresoRunId}
        title="Generando compromiso"
        warningText="no cierres esta ventana mientras se genera el compromiso."
        steps={PASOS_GENERAR_COMPROMISO}
        resumen={PROGRESO_RESUMEN}
        totalSeconds={5}
        onClose={() => { setModal("cerrado"); navigate("buscar"); }}
        onRetry={reintentarGenerar}
        onSuccess={() => setCreado(true)}
      />
    </>
  );
}

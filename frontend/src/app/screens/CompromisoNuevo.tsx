import { useEffect, useState } from "react";
import { Calendar, Check, Plus, Sparkles } from "lucide-react";
import { C, clp } from "../theme";
import { getCarteraDetalle, type CarteraDetalle } from "../../api/cartera";
import type { Screen } from "../types";
import { Badge, Btn, Card, Chip } from "../ui";
import { ProgressModal, type ProgressStep } from "../ProgressModal";
import { DatePicker } from "../DatePicker";

// ════════════════════════════════════════════════════════════════════════════════
// CREACIÓN DE COMPROMISO (doc §14.2) — desglose oficial desde Mónaco
// ════════════════════════════════════════════════════════════════════════════════
const CANALES = ["Teléfono", "WhatsApp", "Presencial"];

const hoyISO = () => new Date().toISOString().slice(0, 10);

type EstadoCuota = "VENCIDA" | "VIGENTE";

type CuotaSeleccionable = {
  num: number;
  venc: string;
  aPagar: number;
  estado: EstadoCuota;
};

type InfoCompromisoNuevo = {
  rut: string;
  fechaContacto?: string;
  estado?: string;
  pago?: string;
  situacion?: string;
  cuotas: CuotaSeleccionable[];
};

function formatoFechaLarga(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${parseInt(d, 10)} de ${meses[parseInt(m, 10) - 1]} de ${y}`;
}

function formatoFechaCorta(iso: string) {
  const [, m, d] = iso.split("-");
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return `${parseInt(d, 10)}-${meses[parseInt(m, 10) - 1]}`;
}

function formatoFechaCuota(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function mapearCuota(cuota: CarteraDetalle["cuotas"][number]): CuotaSeleccionable {
  return {
    num: cuota.id,
    venc: formatoFechaCuota(cuota.fecha),
    aPagar: cuota.monto,
    estado: cuota.estado === "vencida" ? "VENCIDA" : "VIGENTE",
  };
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

export function CompromisoNuevo({ idCredito, navigate }: {
  idCredito: string;
  navigate: (s: Screen) => void;
}) {
  const [info, setInfo] = useState<InfoCompromisoNuevo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<number[]>([]);
  const [canal, setCanal] = useState("Teléfono");
  const [fecha, setFecha] = useState(hoyISO());
  const [montoManual, setMontoManual] = useState<number>(0);
  const [modal, setModal] = useState<ModalPaso>("cerrado");
  const [progresoRunId, setProgresoRunId] = useState(0);
  const [montoFocused, setMontoFocused] = useState(false);

  // Reprogramar contacto: la única pantalla donde se puede cambiar esta fecha
  // (en "Mi cartera" la fecha de contacto es solo lectura). Override en memoria,
  // se pierde al recargar, igual que el resto de los datos de ejemplo.
  const [reprogramando, setReprogramando] = useState(false);
  const [nuevoContactoISO, setNuevoContactoISO] = useState("");
  const [contactoOverride, setContactoOverride] = useState<string | null>(null);
  const fechaContactoActual = contactoOverride ?? info?.fechaContacto;

  useEffect(() => {
    let activo = true;
    setLoading(true);
    setError(null);
    setInfo(null);
    setSel([]);
    setContactoOverride(null);

    getCarteraDetalle(idCredito)
      .then((detalle) => {
        if (!activo) return;
        const cuotas = detalle.cuotas.map(mapearCuota);
        setInfo({
          rut: detalle.credito.rut,
          fechaContacto: detalle.crm?.fecha_contacto
            ? formatoFechaCorta(detalle.crm.fecha_contacto)
            : undefined,
          estado: detalle.crm?.estado?.toUpperCase(),
          pago: detalle.crm?.pago?.toUpperCase(),
          situacion: detalle.crm?.situacion?.toUpperCase(),
          cuotas,
        });
        setSel(cuotas.filter((cuota) => cuota.estado === "VENCIDA").map((cuota) => cuota.num));
      })
      .catch(() => {
        if (activo) setError("No fue posible cargar las cuotas del crédito.");
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => {
      activo = false;
    };
  }, [idCredito]);

  const confirmarReprogramarContacto = () => {
    if (nuevoContactoISO) setContactoOverride(formatoFechaCorta(nuevoContactoISO));
    setReprogramando(false);
    setNuevoContactoISO("");
  };

  const toggle = (n: number) => setSel(p => p.includes(n) ? p.filter(x => x !== n) : [...p, n]);
  const cuotas = info?.cuotas ?? [];
  const totalCuotas = cuotas.filter(c => sel.includes(c.num)).reduce((s, c) => s + c.aPagar, 0);

  // El monto manual sigue al total de cuotas seleccionadas por defecto; el
  // ejecutivo puede sobrescribirlo si el cliente comprometió un monto distinto.
  useEffect(() => setMontoManual(totalCuotas), [totalCuotas]);

  const saf = montoManual - totalCuotas;
  const deudaTotal = cuotas.reduce((s, c) => s + c.aPagar, 0);

  const generar = () => {
    setModal("progreso");
    setProgresoRunId((current) => current + 1);
  };
  const reintentarGenerar = () => setProgresoRunId((current) => current + 1);

  const botonLabel = sel.length
    ? `Crear compromiso por ${clp(montoManual)}`
    : "Selecciona al menos una cuota";

  if (loading) {
    return <div style={{ padding: "32px 24px", color: C.muted }}>Cargando cuotas del crédito...</div>;
  }

  if (error || !info) {
    return <div style={{ padding: "32px 24px", color: C.red }}>{error ?? "No fue posible cargar el crédito."}</div>;
  }

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
          <div style={{ marginTop: "4px", fontSize: "11px", color: C.muted }}>Datos cargados desde la base de datos</div>
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
            El crédito mantiene {cuotas.length} cuota{cuotas.length > 1 ? "s" : ""} por un total de {clp(deudaTotal)}. Aún no existe un compromiso de pago formalizado; defina fecha, monto y canal de contacto para generarlo.
          </p>
        </Card>

        {/* Las 3 fechas relevantes del compromiso — mismo tamaño y familia
            tipográfica en las 3 cards para que se lean como un solo bloque. */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px", marginBottom: "12px" }}>
          <Card style={{ padding: "16px 16px", minHeight: "84px", background: C.blueSoft, border: "1px solid rgba(0,92,185,0.18)" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: "8px" }}>Fecha de contacto</div>
            {reprogramando ? (
              <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
                <div style={{ flex: "1 1 160px", minWidth: 0 }}><DatePicker value={nuevoContactoISO} onChange={setNuevoContactoISO} min={hoyISO()} /></div>
                <Btn label="Guardar" onClick={confirmarReprogramarContacto} disabled={!nuevoContactoISO} />
              </div>
            ) : (
              <>
                <div style={{ fontSize: "18px", fontWeight: 800, fontFamily: C.mono, color: fechaContactoActual ? C.blue : C.muted, letterSpacing: "-0.03em" }}>{fechaContactoActual || "No definido"}</div>
                <button
                  type="button"
                  onClick={() => { setReprogramando(true); setNuevoContactoISO(""); }}
                  style={{
                    marginTop: "8px", display: "inline-flex", alignItems: "center", gap: "6px",
                    background: "transparent", border: "none", padding: 0,
                    color: C.blue, fontSize: "12px", fontWeight: 700, cursor: "pointer",
                  }}
                >
                  <Calendar size={13} />
                  {fechaContactoActual ? "Reprogramar contacto" : "Programar contacto"}
                </button>
              </>
            )}
          </Card>
          <Card style={{ padding: "16px 16px", minHeight: "84px", background: C.blueSoft, border: "1px solid rgba(0,92,185,0.18)" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: "8px" }}>Fecha de compromiso</div>
            <DatePicker value={fecha} onChange={setFecha} min={hoyISO()} />
          </Card>
          <Card style={{ padding: "16px 16px", minHeight: "84px", background: "#f1f5f9", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: "8px" }}>Fecha de pago</div>
            <div style={{ fontSize: "18px", fontWeight: 800, fontFamily: C.mono, color: C.muted, letterSpacing: "-0.03em" }}>No definido</div>
          </Card>
        </div>

        {/* Estado / Pago / Situación / Monto */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "12px", marginBottom: "12px" }}>
          <Card style={{ padding: "16px 16px", minHeight: "92px", background: "#f1f5f9", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: "8px" }}>Estado</div>
            {info.estado ? <Badge s={info.estado} /> : <div style={{ fontSize: "12px", color: C.muted, fontWeight: 700 }}>No definido</div>}
          </Card>
          <Card style={{ padding: "16px 16px", minHeight: "92px", background: "#f1f5f9", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: "8px" }}>Pago</div>
            {info.pago ? <Badge s={info.pago} /> : <div style={{ fontSize: "12px", color: C.muted, fontWeight: 700 }}>No definido</div>}
          </Card>
          <Card style={{ padding: "16px 16px", minHeight: "92px", background: "#f1f5f9", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: "8px" }}>Situación</div>
            {info.situacion ? <Badge s={`SITUACION_${info.situacion}`} /> : <div style={{ fontSize: "12px", color: C.muted, fontWeight: 700 }}>No definido</div>}
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

        {/* Cuotas pendientes desde la base de datos */}
        <h3 style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 700, color: C.navy }}>Cuotas pendientes</h3>
        <Card style={{ marginBottom: "16px", overflow: "hidden" }}>
          {cuotas.length === 0 ? (
            <div style={{ padding: "20px", color: C.muted, fontSize: "13px" }}>Este crédito no tiene cuotas registradas.</div>
          ) : cuotas.map((c, i) => {
            const active = sel.includes(c.num);
            return (
              <button key={c.num} onClick={() => toggle(c.num)} style={{
                display: "grid",
                gridTemplateColumns: "32px 1fr auto auto",
                alignItems: "center", gap: "14px",
                width: "100%", padding: "16px 20px",
                background: active ? "rgba(0,92,185,0.04)" : "transparent",
                border: "none",
                borderBottom: i < cuotas.length - 1 ? `1px solid ${C.border}` : "none",
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
        onSuccess={() => undefined}
      />
    </>
  );
}

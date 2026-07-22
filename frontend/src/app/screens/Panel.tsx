import { useState } from "react";
import { C, FONT_UI, clp } from "../theme";
import { ABONO_TRANSFERENCIA_3287612, COMPROMISOS_DETALLE } from "../data";
import type { CarteraItem } from "../api/cartera";
import { CarteraTable } from "../CarteraTable";
import type { DetalleTipo, Rol, Screen } from "../types";
import { Badge, Card, GhostBtn, HeroHeader, SolidBtn, updatedAtLabel } from "../ui";

// ════════════════════════════════════════════════════════════════════════════════
// PANEL — contenido según rol: "mi día" (Ejecutivo) o Dashboard operativo (Supervisor)
// ════════════════════════════════════════════════════════════════════════════════
export function Panel({ rol, cartera, navigate, onSync, abrirDetalle, abrirCompromiso, irACompromisos, irAPagos }: {
  rol: Rol; cartera: CarteraItem[]; navigate: (s: Screen) => void; onSync: () => void;
  abrirDetalle: (tipo: DetalleTipo, idCredito: string, solcob?: string | null) => void;
  abrirCompromiso: (item: CarteraItem) => void;
  irACompromisos: (situacion: string) => void;
  irAPagos: (estado: string) => void;
}) {
  return rol === "supervisor"
    ? <DashboardOperativo navigate={navigate} onSync={onSync} />
    : <MiDia cartera={cartera} navigate={navigate} onSync={onSync} abrirDetalle={abrirDetalle} abrirCompromiso={abrirCompromiso} irACompromisos={irACompromisos} irAPagos={irAPagos} />;
}

// ── Vista Ejecutivo: "Mi día" ────────────────────────────────────────────────────
function MiDia({ cartera, navigate, onSync, abrirDetalle, abrirCompromiso, irACompromisos, irAPagos }: {
  cartera: CarteraItem[]; navigate: (s: Screen) => void; onSync: () => void;
  abrirDetalle: (tipo: DetalleTipo, idCredito: string, solcob?: string | null) => void;
  abrirCompromiso: (item: CarteraItem) => void;
  irACompromisos: (situacion: string) => void;
  irAPagos: (estado: string) => void;
}) {
  // Arriba: estado de los compromisos vigentes con el cliente. Abajo: estado de
  // los pagos ya enviados a autorización (Flokzu) para esos compromisos. Cada
  // card lleva a su listado ya filtrado: las de arriba apuntan a Compromisos
  // filtrado por Situación, las de abajo a Pagos filtrado por Estado.
  // Mismos colores que usa el Badge para estos estados (STATUS en theme.ts):
  // Comprometido = azul, Pago pendiente de validar = naranjo.
  const tareasArriba = [
    { label: "Pagos comprometidos",           val: 7,  color: C.blue,  bg: C.blueSoft,  urgente: false, onClick: () => irACompromisos("SITUACION_PENDIENTE"), hero: true },
    { label: "Pagos pendientes de validar",   val: 3,  color: C.amber, bg: C.amberSoft, urgente: false, onClick: () => irACompromisos("SITUACION_PENDIENTE") },
  ];
  const tareasAbajo = [
    { label: "Pagos enviados rechazados",     val: 2,  color: C.red,   bg: C.redSoft,   urgente: true,  onClick: () => irAPagos("RECHAZADA") },
    { label: "Pagos enviados pendientes",     val: 2,  color: C.amber, bg: C.amberSoft, urgente: false, onClick: () => irAPagos("PENDIENTE") },
    { label: "Pagos enviados aprobados",      val: 5,  color: C.green, bg: C.greenSoft, urgente: false, onClick: () => irAPagos("APROBADA") },
  ];

  // Una vez el pago se envía a autorización a Tanner (Flokzu), se le asigna un
  // código de solicitud de cobranza fijo: alfanumérico "SOLCOB-" + 5 dígitos.
  // El ID del crédito y el RUT identifican al cliente, igual que en "Mi cartera".
  // Los montos y estados coinciden 1:1 con la ficha de cada crédito (COMPROMISOS_DETALLE):
  // Pamela y Claudia no han pagado nada aún (Pendiente); Rodrigo envió su abono
  // parcial real de $65.800 (Aprobada, con observaciones); Jorge envió $327.000
  // pero fue Rechazada, por eso su compromiso volvió a "Pendiente" en la cartera.
  const [hoveredTarea, setHoveredTarea] = useState<string | null>(null);

  const pagosEnviados = [
    { id: "SOLCOB-84213", idCredito: "3350049", rut: "15.221.775-7", monto: COMPROMISOS_DETALLE["3350049"].montoComprometido, fecha: "09-Julio", status: "PENDIENTE" },
    { id: "SOLCOB-84214", idCredito: "3287612", rut: "12.344.892-3", monto: ABONO_TRANSFERENCIA_3287612,                      fecha: "09-Julio", status: "APROBADA" },
    { id: "SOLCOB-84215", idCredito: "2941087", rut: "9.876.543-2",  monto: COMPROMISOS_DETALLE["2941087"].montoComprometido, fecha: "08-Julio", status: "PENDIENTE" },
    { id: "SOLCOB-84216", idCredito: "3102456", rut: "17.654.321-K", monto: COMPROMISOS_DETALLE["3102456"].montoComprometido, fecha: "08-Julio", status: "RECHAZADA" },
  ];

  return (
    <div style={{ padding: "0 24px" }}>
      <HeroHeader
        title="Mi Escritorio"
        sub={updatedAtLabel()}
        actions={<>
          <GhostBtn label="Sincronizar" onClick={onSync} />
        </>}
      />

      {/* KPI rows: arriba (compromisos) 2 cards, abajo (pagos enviados) 3 cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "12px", marginBottom: "12px" }}>
        {tareasArriba.map(t => (
          <TareaCard key={t.label} t={t} hovered={hoveredTarea === t.label} onHover={setHoveredTarea} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "12px", marginBottom: "26px" }}>
        {tareasAbajo.map(t => (
          <TareaCard key={t.label} t={t} hovered={hoveredTarea === t.label} onHover={setHoveredTarea} />
        ))}
      </div>

      {/* Cartera list */}
      <div style={{ marginBottom: "10px" }}>
        <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: C.navy, letterSpacing: "-0.02em" }}>Mi cartera</h2>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <CarteraTable items={cartera} onRowClick={abrirCompromiso} />
      </div>

      {/* Sent payments list */}
      <div style={{ marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: C.navy, letterSpacing: "-0.02em" }}>Mis pagos enviados</h2>
        <span style={{ fontSize: "12px", color: C.muted }}>Últimos envíos realizados</span>
      </div>

      <Card style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "620px" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}>
                {["Fecha pago", "ID del crédito", "Estado", "Monto"].map((h, i) => (
                  <th key={h} style={{
                    textAlign: i === 0 ? "left" : "right",
                    padding: "10px 20px",
                    fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                    color: C.muted,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagosEnviados.map((p, i) => (
                <tr
                  key={p.id}
                  onClick={() => abrirDetalle("pago", p.idCredito, p.id)}
                  style={{
                    background: p.status === "RECHAZADA" ? "rgba(190,18,60,0.025)" : "transparent",
                    borderBottom: i < pagosEnviados.length - 1 ? `1px solid ${C.border}` : "none",
                    cursor: "pointer",
                  }}
                >
                  <td style={{ padding: "16px 20px", fontSize: "14px", fontWeight: 700, color: C.navy, fontFamily: C.mono }}>{p.fecha}</td>
                  <td style={{ padding: "16px 20px", textAlign: "right" }}>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: C.navy, fontFamily: FONT_UI, letterSpacing: "-0.02em" }}>{p.idCredito}</div>
                    <div style={{ fontSize: "12px", color: C.muted, marginTop: "3px", fontFamily: C.mono }}>{p.id}</div>
                    <div style={{ fontSize: "12px", color: C.muted, marginTop: "1px", fontFamily: C.mono }}>{p.rut}</div>
                  </td>
                  <td style={{ padding: "16px 20px", textAlign: "right" }}>
                    <Badge s={p.status} width={120} />
                  </td>
                  <td style={{ padding: "16px 20px", textAlign: "right", fontSize: "15px", fontWeight: 800, color: C.navy, fontFamily: FONT_UI, letterSpacing: "-0.03em" }}>{clp(p.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

type Tarea = { label: string; val: number; color: string; bg: string; urgente: boolean; onClick: () => void; hero?: boolean };

// Card "hero" — mismo tratamiento que la card "Monto conciliado" del proyecto
// tanner-ocr: fondo degradé navy → azul con texto blanco, en vez del fondo
// blanco + número de color que usan el resto de las cards de esta fila.
function TareaCard({ t, hovered, onHover }: { t: Tarea; hovered: boolean; onHover: (label: string | null) => void }) {
  return (
    <div
      onClick={t.onClick}
      onMouseEnter={() => onHover(t.label)}
      onMouseLeave={() => onHover(null)}
      role="button"
      tabIndex={0}
      style={{ cursor: "pointer" }}
    >
      <Card style={{
        padding: "20px 20px 18px",
        minHeight: "132px",
        ...(t.hero
          ? {
              background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`,
              border: `1px solid ${C.navy}`,
              boxShadow: hovered ? "0 16px 32px rgba(0,30,61,0.28)" : "0 10px 24px rgba(0,30,61,0.18)",
              transform: hovered ? "translateY(-3px)" : "none",
              transition: "transform 160ms ease, box-shadow 160ms ease",
            }
          : {
              borderColor: hovered ? t.color : C.border,
              boxShadow: hovered ? "0 16px 32px rgba(0,30,61,0.12)" : "0 10px 24px rgba(0,30,61,0.05)",
              transform: hovered ? "translateY(-3px)" : "none",
              transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
            }),
      }}>
        <div style={{ fontSize: "34px", fontWeight: 800, color: t.hero ? "#fff" : t.color, fontFamily: FONT_UI, letterSpacing: "-0.05em" }}>{t.val}</div>
        <div style={{ marginTop: "10px", fontSize: "14px", fontWeight: 600, color: t.hero ? "rgba(255,255,255,0.75)" : C.muted, lineHeight: 1.35 }}>{t.label}</div>
        {t.urgente && (
          <div style={{ marginTop: "10px", fontSize: "12px", fontWeight: 700, color: C.red }}>⚠ Requieren atención</div>
        )}
      </Card>
    </div>
  );
}

// ── Vista Supervisor: Dashboard operativo (doc §14.8) ────────────────────────────
function DashboardOperativo({ navigate, onSync }: { navigate: (s: Screen) => void; onSync: () => void }) {
  const indicadores = [
    { label: "Pagos creados",    val: 42, color: C.navy  },
    { label: "Pagos pendientes", val: 11, color: C.amber },
    { label: "Pagos aplicados",  val: 24, color: C.green },
    { label: "Pagos observados", val: 5,  color: C.red   },
    { label: "Pagos rechazados", val: 2,  color: C.red   },
    { label: "Casos con SAF",              val: 6, color: C.cyan  },
    { label: "Casos con tolerancia",       val: 9, color: C.amber },
    { label: "Casos con mora actualizada", val: 4, color: C.cyan  },
  ];

  const motivosRechazo = [
    { motivo: "Faltante superior a $10.000",        val: 3 },
    { motivo: "Comprobante duplicado",               val: 2 },
    { motivo: "OCR con baja confianza",               val: 2 },
    { motivo: "Fecha de pago inconsistente",          val: 1 },
  ];

  const erroresPorEjecutivo = [
    { ejecutivo: "Carlos Morales",  val: 3 },
    { ejecutivo: "Daniela Poblete", val: 2 },
    { ejecutivo: "Felipe Aránguiz", val: 2 },
    { ejecutivo: "Ignacia Rojas",   val: 1 },
  ];

  return (
    <div style={{ padding: "0 24px" }}>
      <HeroHeader
        title="Dashboard operativo"
        sub={updatedAtLabel()}
        actions={<>
          <GhostBtn label="Sincronizar" onClick={onSync} />
          <SolidBtn label="Ver bandeja de excepciones" onClick={() => navigate("excepciones")} />
        </>}
      />

      {/* Indicator tiles (doc §14.8) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "12px", marginBottom: "16px" }}>
        {indicadores.map(t => (
          <Card key={t.label} style={{ padding: "18px 18px 16px", minHeight: "108px" }}>
            <div style={{ fontSize: "27px", fontWeight: 800, color: t.color, fontFamily: FONT_UI, letterSpacing: "-0.05em" }}>{t.val}</div>
            <div style={{ marginTop: "10px", fontSize: "12px", fontWeight: 600, color: C.muted, lineHeight: 1.35 }}>{t.label}</div>
          </Card>
        ))}
      </div>

      {/* Big stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "12px", marginBottom: "26px" }}>
        <Card style={{ padding: "18px 18px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted }}>Monto total aplicado</div>
          <div style={{ marginTop: "6px", fontSize: "22px", fontWeight: 800, fontFamily: C.mono, color: C.green, letterSpacing: "-0.03em" }}>{clp(18420500)}</div>
        </Card>
        <Card style={{ padding: "18px 18px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted }}>Monto total en excepción</div>
          <div style={{ marginTop: "6px", fontSize: "22px", fontWeight: 800, fontFamily: C.mono, color: C.red, letterSpacing: "-0.03em" }}>{clp(1284300)}</div>
        </Card>
        <Card style={{ padding: "18px 18px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted }}>Tiempo promedio de aplicación</div>
          <div style={{ marginTop: "6px", fontSize: "22px", fontWeight: 800, fontFamily: C.mono, color: C.navy, letterSpacing: "-0.03em" }}>6h 40m</div>
        </Card>
      </div>

      {/* Breakdown lists */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "16px" }}>
        <div>
          <h2 style={{ margin: "0 0 10px", fontSize: "16px", fontWeight: 800, color: C.navy, letterSpacing: "-0.02em" }}>Motivos de rechazo</h2>
          <Card>
            {motivosRechazo.map((m, i) => (
              <div key={m.motivo} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: i < motivosRechazo.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <span style={{ fontSize: "13px", color: C.navy, fontWeight: 500 }}>{m.motivo}</span>
                <span style={{ fontSize: "14px", fontWeight: 800, color: C.red, fontFamily: C.mono }}>{m.val}</span>
              </div>
            ))}
          </Card>
        </div>
        <div>
          <h2 style={{ margin: "0 0 10px", fontSize: "16px", fontWeight: 800, color: C.navy, letterSpacing: "-0.02em" }}>Errores por ejecutivo</h2>
          <Card>
            {erroresPorEjecutivo.map((e, i) => (
              <div key={e.ejecutivo} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: i < erroresPorEjecutivo.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <span style={{ fontSize: "13px", color: C.navy, fontWeight: 500 }}>{e.ejecutivo}</span>
                <span style={{ fontSize: "14px", fontWeight: 800, color: C.amber, fontFamily: C.mono }}>{e.val}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Search } from "lucide-react";
import { C, FONT_UI, clp } from "../theme";
import { formatDate } from "../../api/cartera";
import type { PagoEnviado } from "../../api/pagos";
import type { EstadoCargaPagos, Screen } from "../types";
import { Badge, Btn, Card, Chip, GhostBtn, HeroHeader, SolidBtn, updatedAtLabel } from "../ui";
import { DatePicker } from "../DatePicker";

// ════════════════════════════════════════════════════════════════════════════════
// PAGOS — listado completo de pagos enviados a autorización a Tanner (Flokzu)
// ════════════════════════════════════════════════════════════════════════════════
type RangoKey = "todos" | "hoy" | "semana" | "mes" | "trimestre" | "personalizado";
const PERIODOS: Array<{ key: RangoKey; label: string }> = [
  { key: "todos",     label: "Todos" },
  { key: "hoy",        label: "Hoy" },
  { key: "semana",     label: "Esta semana" },
  { key: "mes",        label: "Este mes" },
  { key: "trimestre",  label: "Trimestre" },
];

// Filtro por Estado: permite llegar aquí ya filtrado desde las cards de "Mi
// Escritorio" (p. ej. "Pagos rechazados" / "Pagos aprobados").
export type EstadoFiltro = "todos" | "PENDIENTE" | "APROBADO" | "RECHAZADO";
const ESTADOS: Array<{ key: EstadoFiltro; label: string }> = [
  { key: "todos",      label: "Todos" },
  { key: "PENDIENTE",  label: "Pendiente" },
  { key: "APROBADO",   label: "Aprobado" },
  { key: "RECHAZADO",  label: "Rechazado" },
];

function inicioDelDia(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function rangoParaPeriodo(periodo: RangoKey, desde: string, hasta: string): { from: Date | null; to: Date | null } {
  const hoy = inicioDelDia(new Date());
  switch (periodo) {
    case "hoy":
      return { from: hoy, to: hoy };
    case "semana": {
      const dia = hoy.getDay();
      const diffLunes = dia === 0 ? 6 : dia - 1;
      const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - diffLunes);
      const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
      return { from: lunes, to: domingo };
    }
    case "mes":
      return { from: new Date(hoy.getFullYear(), hoy.getMonth(), 1), to: new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0) };
    case "trimestre": {
      const inicioTrimestre = Math.floor(hoy.getMonth() / 3) * 3;
      return { from: new Date(hoy.getFullYear(), inicioTrimestre, 1), to: new Date(hoy.getFullYear(), inicioTrimestre + 3, 0) };
    }
    case "personalizado":
      return {
        from: desde ? new Date(`${desde}T00:00:00`) : null,
        to: hasta ? new Date(`${hasta}T23:59:59`) : null,
      };
    case "todos":
    default:
      return { from: null, to: null };
  }
}

export function PagosEnviados({ pagos, estadoCargaPagos, onRetryPagos, navigate, onSync, abrirDetalle, filtroEstadoInicial = "todos" }: {
  pagos: PagoEnviado[];
  estadoCargaPagos: EstadoCargaPagos; onRetryPagos: () => void;
  navigate: (s: Screen) => void; onSync: () => void; abrirDetalle: (idCredito: string) => void;
  filtroEstadoInicial?: EstadoFiltro;
}) {
  const [q, setQ] = useState("");
  const [periodo, setPeriodo] = useState<RangoKey>("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [estado, setEstado] = useState<EstadoFiltro>(filtroEstadoInicial);

  const { from, to } = rangoParaPeriodo(periodo, desde, hasta);

  const filtered = pagos.filter((p) => {
    const matchesQuery = !q || String(p.credito_id).includes(q) || p.rut.includes(q) || p.cliente.toLowerCase().includes(q.toLowerCase());
    const matchesEstado = estado === "todos" || (p.estado ?? "").toUpperCase() === estado;
    // Un pago sin fecha identificada en el comprobante no puede filtrarse por periodo.
    const fecha = p.fecha_pago ? new Date(`${p.fecha_pago}T00:00:00`) : null;
    const matchesDesde = !from || (fecha !== null && fecha >= from);
    const matchesHasta = !to || (fecha !== null && fecha <= to);
    return matchesQuery && matchesEstado && matchesDesde && matchesHasta;
  });

  return (
    <div style={{ padding: "0 24px" }}>
      <HeroHeader
        title="Mis Pagos"
        sub={updatedAtLabel()}
        actions={<>
          <GhostBtn label="Sincronizar" onClick={onSync} />
        </>}
      />

      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        minHeight: "52px", padding: "0 16px",
        borderRadius: "12px", background: C.white,
        border: `1px solid ${C.border}`,
        boxShadow: "0 8px 22px rgba(0,30,61,0.06)",
        marginBottom: "16px",
      }}>
        <Search size={16} color={C.blue} style={{ flexShrink: 0 }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por ID de crédito, RUT o cliente..."
          autoFocus
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "15px", color: C.text, fontFamily: FONT_UI, fontWeight: 500 }}
        />
      </div>

      {/* Filtro por estado y periodo */}
      <div style={{ display: "grid", gap: "10px", marginBottom: "18px" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, width: "110px", flexShrink: 0, whiteSpace: "nowrap" }}>Estado</span>
          {ESTADOS.map((e) => (
            <Chip key={e.key} label={e.label} tone="blue" active={estado === e.key} onClick={() => setEstado(e.key)} />
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, width: "110px", flexShrink: 0, whiteSpace: "nowrap" }}>Periodo</span>
          {PERIODOS.map((p) => (
            <Chip key={p.key} label={p.label} tone="blue" active={periodo === p.key} onClick={() => setPeriodo(p.key)} />
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, width: "110px", flexShrink: 0, whiteSpace: "nowrap" }}>Personalizado</span>
          <div style={{ width: "180px" }}><DatePicker value={desde} onChange={setDesde} /></div>
          <span style={{ fontSize: "13px", color: C.muted }}>hasta</span>
          <div style={{ width: "180px" }}><DatePicker value={hasta} onChange={setHasta} /></div>
          <Btn
            label="Consultar"
            variant="outline"
            onClick={() => (desde || hasta) && setPeriodo("personalizado")}
          />
        </div>
      </div>

      <Card style={{ overflow: "hidden" }}>
        <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: C.navy }}>Pagos enviados</h2>
            {estadoCargaPagos === "listo" && (
              <span style={{ fontSize: "12px", color: C.muted }}>{filtered.length} resultado{filtered.length === 1 ? "" : "s"}</span>
            )}
          </div>
        </div>

        {estadoCargaPagos === "cargando" && pagos.length === 0 ? (
          <div style={{ padding: "28px", textAlign: "center", fontSize: "13px", color: C.muted }}>
            Cargando pagos enviados...
          </div>
        ) : estadoCargaPagos === "error" ? (
          <div style={{ padding: "28px", display: "grid", justifyItems: "center", gap: "12px", textAlign: "center", fontSize: "13px", color: C.muted }}>
            <span>No fue posible cargar los pagos enviados.</span>
            <Btn label="Reintentar" variant="outline" onClick={onRetryPagos} />
          </div>
        ) : (
          <>
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
                  {filtered.map((p, i) => {
                    const estadoPago = (p.estado ?? "PENDIENTE").toUpperCase();
                    return (
                      <tr
                        key={p.id}
                        onClick={() => abrirDetalle(String(p.credito_id))}
                        style={{
                          background: estadoPago === "RECHAZADO" ? "rgba(190,18,60,0.025)" : "transparent",
                          borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none",
                          cursor: "pointer",
                        }}
                      >
                        <td style={{ padding: "16px 20px", fontSize: "14px", fontWeight: 700, color: C.navy, fontFamily: C.mono }}>{formatDate(p.fecha_pago ?? null) ?? "—"}</td>
                        <td style={{ padding: "16px 20px", textAlign: "right" }}>
                          <div style={{ fontSize: "14px", fontWeight: 800, color: C.navy, fontFamily: FONT_UI, letterSpacing: "-0.02em" }}>{p.credito_id}</div>
                          <div style={{ fontSize: "12px", color: C.muted, marginTop: "3px", fontFamily: C.mono }}>{p.rut}</div>
                        </td>
                        <td style={{ padding: "16px 20px", textAlign: "right" }}>
                          <Badge s={estadoPago} width={120} />
                        </td>
                        <td style={{ padding: "16px 20px", textAlign: "right", fontSize: "15px", fontWeight: 800, color: C.navy, fontFamily: FONT_UI, letterSpacing: "-0.03em" }}>{clp(p.monto_total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filtered.length === 0 && (
              <div style={{ padding: "28px", textAlign: "center", fontSize: "13px", color: C.muted }}>
                {pagos.length === 0 ? "No hay pagos enviados." : "Sin resultados para los filtros seleccionados."}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

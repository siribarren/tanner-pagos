import { useState } from "react";
import { Search } from "lucide-react";
import { C, FONT_UI } from "../theme";
import type { CarteraItem } from "../data";
import { CarteraTable } from "../CarteraTable";
import type { Screen } from "../types";
import { Chip, GhostBtn, HeroHeader, updatedAtLabel } from "../ui";

// ════════════════════════════════════════════════════════════════════════════════
// COMPROMISOS (doc §14.1) — misma cartera y misma tabla que "Mi cartera" del Panel.
// Filtro por Situación: permite llegar aquí ya filtrado desde las cards de "Mi
// Escritorio" (p. ej. "Compromisos pendientes de pago" / "Compromisos por
// validar" → Situación "Pago pendiente de validar"). "Pago validado" y "Pago
// rechazado" NO aplican acá — son estados de la solicitud SOLCOB una vez
// enviada a autorización, y solo existen en "Mis Pagos".
// ════════════════════════════════════════════════════════════════════════════════
export type SituacionFiltro = "todos" | "SITUACION_PENDIENTE" | "SITUACION_OBSERVADO";

const SITUACIONES: Array<{ key: SituacionFiltro; label: string }> = [
  { key: "todos",               label: "Todos" },
  { key: "SITUACION_PENDIENTE", label: "Pago pendiente de validar" },
  { key: "SITUACION_OBSERVADO", label: "Pago validado con observaciones" },
];

export function Buscar({ cartera, navigate, onSync, abrirCompromiso, filtroSituacionInicial = "todos" }: {
  cartera: CarteraItem[]; navigate: (s: Screen) => void; onSync: () => void; abrirCompromiso: (item: CarteraItem) => void;
  filtroSituacionInicial?: SituacionFiltro;
}) {
  const [q, setQ] = useState("");
  const [situacion, setSituacion] = useState<SituacionFiltro>(filtroSituacionInicial);

  const filtered = cartera.filter((m) =>
    (!q || m.cliente.toLowerCase().includes(q.toLowerCase()) || m.rut.includes(q) || m.id.includes(q)) &&
    (situacion === "todos" || m.situacion === situacion)
  );

  return (
    <div style={{ padding: "0 24px" }}>
      <HeroHeader
        title="Mis Compromisos"
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
          placeholder="Buscar por RUT, nombre o ID de crédito..."
          autoFocus
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "15px", color: C.text, fontFamily: FONT_UI, fontWeight: 500 }}
        />
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginBottom: "18px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginRight: "2px" }}>Situación</span>
        {SITUACIONES.map((s) => (
          <Chip key={s.key} label={s.label} tone="blue" active={situacion === s.key} onClick={() => setSituacion(s.key)} />
        ))}
      </div>

      <CarteraTable items={filtered} onRowClick={abrirCompromiso} />
    </div>
  );
}

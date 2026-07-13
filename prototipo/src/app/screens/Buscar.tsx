import { useState } from "react";
import { Search } from "lucide-react";
import { C, FONT_UI } from "../theme";
import { CARTERA_EJECUTIVO, type CarteraItem } from "../data";
import { CarteraTable } from "../CarteraTable";
import type { Screen } from "../types";
import { GhostBtn, HeroHeader, updatedAtLabel } from "../ui";

// ════════════════════════════════════════════════════════════════════════════════
// COMPROMISOS (doc §14.1) — misma cartera y misma tabla que "Mi cartera" del Panel.
// ════════════════════════════════════════════════════════════════════════════════
export function Buscar({ navigate, onSync, abrirCompromiso }: {
  navigate: (s: Screen) => void; onSync: () => void; abrirCompromiso: (item: CarteraItem) => void;
}) {
  const [q, setQ] = useState("");

  const filtered = CARTERA_EJECUTIVO.filter((m) =>
    !q || m.cliente.toLowerCase().includes(q.toLowerCase()) || m.rut.includes(q) || m.id.includes(q)
  );

  return (
    <div style={{ padding: "0 24px" }}>
      <HeroHeader
        title="Compromisos"
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

      <CarteraTable items={filtered} onRowClick={abrirCompromiso} />
    </div>
  );
}

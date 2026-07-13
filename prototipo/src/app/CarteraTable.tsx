import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { C, FONT_UI, clp } from "./theme";
import type { CarteraItem } from "./data";
import { Badge, Card } from "./ui";

// ════════════════════════════════════════════════════════════════════════════════
// Tabla de cartera (Sin compromiso / Comprometido) reutilizada tal cual por el
// Panel ("Mi cartera") y por la pantalla Compromisos, para que ambas muestren
// siempre los mismos datos con el mismo estilo.
// ════════════════════════════════════════════════════════════════════════════════
type SortKey = "fecha" | "id" | "estado" | "pago" | "situacion" | "monto";

const COLUMNAS: Array<{ label: string; key: SortKey }> = [
  { label: "Fecha", key: "fecha" },
  { label: "ID del crédito", key: "id" },
  { label: "Estado", key: "estado" },
  { label: "Pago", key: "pago" },
  { label: "Situación", key: "situacion" },
  { label: "Monto", key: "monto" },
];

function diaDeFecha(s?: string) {
  if (!s) return -1;
  const m = s.match(/^(\d+)-/);
  return m ? parseInt(m[1], 10) : -1;
}

export function CarteraTable({ items, onRowClick }: { items: CarteraItem[]; onRowClick: (item: CarteraItem) => void }) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const ordenados = [...items].sort((a, b) => {
    if (!sortKey) return 0;
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "fecha":      return (diaDeFecha(a.fechaCompromiso) - diaDeFecha(b.fechaCompromiso)) * dir;
      case "id":         return (Number(a.id) - Number(b.id)) * dir;
      case "estado":     return a.estado.localeCompare(b.estado) * dir;
      case "pago":       return (a.pago ?? "").localeCompare(b.pago ?? "") * dir;
      case "situacion":  return (a.situacion ?? "").localeCompare(b.situacion ?? "") * dir;
      case "monto":      return (a.monto - b.monto) * dir;
      default:           return 0;
    }
  });

  return (
    <Card style={{ overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}>
              {COLUMNAS.map(({ label, key }, i) => {
                const active = sortKey === key;
                const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <th key={key} style={{ textAlign: i === 0 ? "left" : "right", padding: 0 }}>
                    <button
                      type="button"
                      onClick={() => toggleSort(key)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "4px",
                        justifyContent: i === 0 ? "flex-start" : "flex-end",
                        width: "100%", padding: "10px 20px",
                        background: "transparent", border: "none", cursor: "pointer",
                        fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                        color: active ? C.blue : C.muted,
                      }}
                    >
                      {label}
                      <Icon size={12} />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {ordenados.map((a, i) => (
              <tr
                key={a.id}
                onClick={() => onRowClick(a)}
                onMouseEnter={() => setHoveredId(a.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  background: hoveredId === a.id ? "rgba(0,92,185,0.05)" : "transparent",
                  borderBottom: i < ordenados.length - 1 ? `1px solid ${C.border}` : "none",
                  cursor: "pointer",
                  transition: "background-color 120ms ease",
                }}
              >
                <td style={{ padding: "16px 20px", fontSize: "14px", fontWeight: 700, color: a.fechaCompromiso ? C.navy : C.muted, fontFamily: C.mono }}>{a.fechaCompromiso ?? "—"}</td>
                <td style={{ padding: "16px 20px", textAlign: "right" }}>
                  <span style={{ fontSize: "14px", fontWeight: 800, color: C.navy, fontFamily: FONT_UI, letterSpacing: "-0.02em" }}>{a.id}</span>
                  <div style={{ fontSize: "12px", color: C.muted, marginTop: "3px", fontFamily: C.mono }}>{a.rut}</div>
                </td>
                <td style={{ padding: "16px 20px", textAlign: "right" }}>
                  <Badge s={a.estado} width={130} />
                </td>
                <td style={{ padding: "16px 20px", textAlign: "right" }}>
                  {a.pago ? <Badge s={a.pago} width={90} /> : <span style={{ fontSize: "13px", color: C.muted }}>Se define al guardar</span>}
                </td>
                <td style={{ padding: "16px 20px", textAlign: "right" }}>
                  {a.situacion ? <Badge s={a.situacion} /> : <span style={{ fontSize: "13px", color: C.muted }}>Se define al guardar</span>}
                </td>
                <td style={{ padding: "16px 20px", textAlign: "right", fontSize: "15px", fontWeight: 800, color: C.navy, fontFamily: FONT_UI, letterSpacing: "-0.03em" }}>{clp(a.monto)}</td>
              </tr>
            ))}
            {ordenados.length === 0 && (
              <tr>
                <td colSpan={COLUMNAS.length} style={{ padding: "28px", textAlign: "center", fontSize: "13px", color: C.muted }}>
                  Sin resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

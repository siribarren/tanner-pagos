import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { C, FONT_UI, clp } from "./theme";
import type { CarteraItem } from "./api/cartera";
import { Badge, Card } from "./ui";

// ════════════════════════════════════════════════════════════════════════════════
// Tabla de cartera (Sin compromiso / Comprometido) reutilizada tal cual por el
// Panel ("Mi cartera") y por la pantalla Compromisos, para que ambas muestren
// siempre los mismos datos con el mismo estilo.
// ════════════════════════════════════════════════════════════════════════════════
type SortKey = "fechaContacto" | "fechaCompromiso" | "fechaPago" | "id" | "estado" | "pago" | "situacion" | "cuotas" | "monto";

const COLUMNAS: Array<{ label: string; key: SortKey; width: string }> = [
  { label: "ID del crédito",      key: "id",              width: "13%" },
  { label: "Fecha de contacto",   key: "fechaContacto",   width: "12%" },
  { label: "Fecha de compromiso", key: "fechaCompromiso", width: "12%" },
  { label: "Fecha de pago",       key: "fechaPago",       width: "11%" },
  { label: "Estado",              key: "estado",          width: "10%" },
  { label: "Pago",                key: "pago",            width: "8%"  },
  { label: "Situación",           key: "situacion",       width: "17%" },
  { label: "Cuotas",              key: "cuotas",          width: "6%"  },
  { label: "Monto",               key: "monto",           width: "11%" },
];

function diaDeFecha(s?: string) {
  if (!s) return -1;
  const m = s.match(/^(\d+)-/);
  return m ? parseInt(m[1], 10) : -1;
}

// Estilo único para las 3 columnas de fecha: mismo tamaño, peso y familia
// tipográfica sin importar si el valor está definido o no (solo cambia el color).
function estiloFecha(definida: boolean) {
  return { padding: "14px 10px", fontSize: "13px", fontWeight: 700, color: definida ? C.navy : C.muted, fontFamily: C.mono };
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
      case "fechaContacto":   return (diaDeFecha(a.fechaContacto) - diaDeFecha(b.fechaContacto)) * dir;
      case "fechaCompromiso": return (diaDeFecha(a.fechaCompromiso) - diaDeFecha(b.fechaCompromiso)) * dir;
      case "fechaPago":       return (diaDeFecha(a.fechaPago) - diaDeFecha(b.fechaPago)) * dir;
      case "id":         return (Number(a.id) - Number(b.id)) * dir;
      case "estado":     return (a.estado ?? "").localeCompare(b.estado ?? "") * dir;
      case "pago":       return (a.pago ?? "").localeCompare(b.pago ?? "") * dir;
      case "situacion":  return (a.situacion ?? "").localeCompare(b.situacion ?? "") * dir;
      case "cuotas":     return (a.cuotas - b.cuotas) * dir;
      case "monto":      return (a.monto - b.monto) * dir;
      default:           return 0;
    }
  });

  return (
    <Card style={{ overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            {COLUMNAS.map(({ key, width }) => <col key={key} style={{ width }} />)}
          </colgroup>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}>
              {COLUMNAS.map(({ label, key }, i) => {
                const active = sortKey === key;
                const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <th key={key} style={{ textAlign: i < 4 ? "left" : "right", padding: 0 }}>
                    <button
                      type="button"
                      onClick={() => toggleSort(key)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "4px",
                        justifyContent: i < 4 ? "flex-start" : "flex-end",
                        width: "100%", padding: "10px 10px",
                        background: "transparent", border: "none", cursor: "pointer",
                        fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em",
                        color: active ? C.blue : C.muted, lineHeight: 1.3, textAlign: i < 4 ? "left" : "right",
                      }}
                    >
                      {label}
                      <Icon size={12} style={{ flexShrink: 0 }} />
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
                <td style={{ padding: "14px 10px", overflow: "hidden" }}>
                  <span style={{ fontSize: "13px", fontWeight: 800, color: C.navy, fontFamily: FONT_UI, letterSpacing: "-0.02em" }}>{a.id}</span>
                  <div style={{ fontSize: "11px", color: C.muted, marginTop: "3px", fontFamily: C.mono }}>{a.rut}</div>
                </td>
                {/* Las 3 fechas se muestran siempre como texto (mismo estilo); para
                    reprogramar la fecha de contacto hay que abrir la ficha del
                    compromiso — esta tabla es de solo lectura. */}
                <td style={estiloFecha(!!a.fechaContacto)}>{a.fechaContacto || "No definido"}</td>
                <td style={estiloFecha(!!a.fechaCompromiso)}>{a.fechaCompromiso || "No definido"}</td>
                <td style={estiloFecha(!!a.fechaPago)}>{a.fechaPago || "No definido"}</td>
                <td style={{ padding: "14px 10px", textAlign: "center" }}>
                  {a.estado ? <Badge s={a.estado} width="100%" wrap /> : <span style={{ fontSize: "12px", color: C.muted }}>No definido</span>}
                </td>
                <td style={{ padding: "14px 10px", textAlign: "center" }}>
                  {a.pago ? <Badge s={a.pago} width="100%" /> : <span style={{ fontSize: "12px", color: C.muted }}>No definido</span>}
                </td>
                <td style={{ padding: "14px 10px", textAlign: "center" }}>
                  {a.situacion ? <Badge s={a.situacion} width="100%" wrap /> : <span style={{ fontSize: "12px", color: C.muted }}>No definido</span>}
                </td>
                <td style={{ padding: "14px 10px", textAlign: "right", fontSize: "13px", fontWeight: 700, color: C.navy, fontFamily: C.mono }}>{a.cuotas}</td>
                <td style={{ padding: "14px 10px", textAlign: "right", fontSize: "14px", fontWeight: 800, color: C.navy, fontFamily: FONT_UI, letterSpacing: "-0.03em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clp(a.monto)}</td>
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

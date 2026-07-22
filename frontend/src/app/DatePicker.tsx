import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { C, FONT_UI } from "./theme";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["L", "M", "M", "J", "V", "S", "D"];

function parseISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
}
function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function formatLargo(iso: string) {
  if (!iso) return "Seleccionar fecha";
  const { y, m, d } = parseISO(iso);
  return `${d} de ${MESES[m].toLowerCase()} de ${y}`;
}

const navBtnStyle: React.CSSProperties = {
  width: "28px", height: "28px", borderRadius: "8px", border: `1px solid ${C.border}`,
  background: "#fff", display: "grid", placeItems: "center", cursor: "pointer", color: C.navy,
};

// ── DatePicker ─────────────────────────────────────────────────────────────────
// Calendario propio (sin depender del <input type="date"> nativo del navegador),
// con estilo ad-hoc a la plataforma: card flotante, mes navegable, día seleccionado
// resaltado en azul y días fuera del mínimo permitido deshabilitados.
export function DatePicker({ value, onChange, min }: { value: string; onChange: (iso: string) => void; min?: string }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 272 });
  const seed = parseISO(value || min || new Date().toISOString().slice(0, 10));
  const [viewY, setViewY] = useState(seed.y);
  const [viewM, setViewM] = useState(seed.m);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onScrollOrResize = () => setOpen(false);
    document.addEventListener("mousedown", onClick);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  const openCalendar = () => {
    const b = parseISO(value || min || new Date().toISOString().slice(0, 10));
    setViewY(b.y);
    setViewM(b.m);
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setCoords({ top: rect.bottom + 8, left: rect.left, width: Math.max(rect.width, 272) });
    setOpen(true);
  };

  const firstOfMonth = new Date(viewY, viewM, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const cells: Array<number | null> = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isDisabled = (d: number) => !!min && toISO(viewY, viewM, d) < min;
  const todayISO = new Date().toISOString().slice(0, 10);

  const prevMonth = () => { const m = viewM === 0 ? 11 : viewM - 1; setViewM(m); if (viewM === 0) setViewY((y) => y - 1); };
  const nextMonth = () => { const m = viewM === 11 ? 0 : viewM + 1; setViewM(m); if (viewM === 11) setViewY((y) => y + 1); };

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openCalendar())}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          width: "100%", height: "40px", padding: "0 12px", borderRadius: "10px",
          border: `1.5px solid ${open ? C.blue : C.border}`, background: C.white,
          boxShadow: open ? "0 0 0 3px rgba(0,92,185,0.12)" : "0 1px 2px rgba(0,30,61,0.04)",
          cursor: "pointer", fontFamily: FONT_UI, textAlign: "left",
          transition: "box-shadow 0.15s, border-color 0.15s",
        }}
      >
        <Calendar size={15} color={C.blue} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: "13px", fontWeight: 700, color: value ? C.navy : C.muted }}>{formatLargo(value)}</span>
      </button>

      {open && createPortal(
        <div ref={popRef} style={{
          position: "fixed", zIndex: 200, top: coords.top, left: coords.left,
          width: "272px", borderRadius: "16px", background: "#fff",
          border: `1px solid ${C.border}`, boxShadow: "0 20px 48px rgba(0,30,61,0.18)",
          padding: "14px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <button type="button" onClick={prevMonth} style={navBtnStyle} aria-label="Mes anterior"><ChevronLeft size={16} /></button>
            <span style={{ fontSize: "13px", fontWeight: 800, color: C.navy }}>{MESES[viewM]} {viewY}</span>
            <button type="button" onClick={nextMonth} style={navBtnStyle} aria-label="Mes siguiente"><ChevronRight size={16} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "2px", marginBottom: "4px" }}>
            {DIAS.map((d, i) => (
              <div key={i} style={{ textAlign: "center", fontSize: "10px", fontWeight: 700, color: C.muted, padding: "4px 0" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "2px" }}>
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const iso = toISO(viewY, viewM, d);
              const selected = iso === value;
              const disabled = isDisabled(d);
              const isToday = iso === todayISO;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => { onChange(iso); setOpen(false); }}
                  style={{
                    height: "32px", borderRadius: "8px", border: "none",
                    background: selected ? C.blue : "transparent",
                    color: disabled ? "#c7ced9" : selected ? "#fff" : C.navy,
                    fontSize: "12px", fontWeight: selected ? 800 : 600,
                    cursor: disabled ? "not-allowed" : "pointer",
                    boxShadow: isToday && !selected ? `inset 0 0 0 1.5px ${C.blue}` : "none",
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

import type { CSSProperties, ElementType, ReactNode } from "react";
import { C, FONT_UI, STATUS } from "./theme";

// ── Badge ──────────────────────────────────────────────────────────────────────
// `width` es opcional: fija el ancho del chip (para columnas donde todos los
// chips deben verse del mismo tamaño aunque el texto varíe). Sin `width`, el
// chip se sigue autoajustando al texto como siempre.
// `wrap`: permite que el texto pase a una segunda línea en vez de forzar
// nowrap — útil en columnas angostas con labels largos (p. ej. "Pago validado
// con observaciones") para evitar que el chip empuje el ancho de la tabla.
export function Badge({ s, width, wrap }: { s: string; width?: number | string; wrap?: boolean }) {
  const [c, bg, label] = STATUS[s] ?? [C.muted, "rgba(107,114,128,0.1)", s];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      justifyContent: width ? "center" : undefined,
      padding: "4px 10px", borderRadius: "999px",
      fontSize: "11px", fontWeight: 700,
      color: c, background: bg, whiteSpace: wrap ? "normal" : "nowrap",
      textAlign: wrap ? "center" : undefined,
      lineHeight: wrap ? 1.3 : undefined,
      width, boxSizing: width ? "border-box" : undefined,
    }}>{label}</span>
  );
}

// ── Chip ───────────────────────────────────────────────────────────────────────
export function Chip({ label, active = false, tone = "light", onClick }: {
  label: string;
  active?: boolean;
  tone?: "light" | "blue" | "dark";
  onClick?: () => void;
}) {
  const palette = {
    light: {
      active: { background: C.navy, border: C.navy, color: "#fff" },
      inactive: { background: "#f2f6fb", border: "#d8e1ee", color: C.navy },
    },
    blue: {
      active: { background: C.blueSoft, border: "#9fd2ff", color: C.blue },
      inactive: { background: "#f8fbff", border: "#d8e1ee", color: C.navy },
    },
    dark: {
      active: { background: "rgba(255,255,255,0.10)", border: "rgba(255,255,255,0.15)", color: "#fff" },
      inactive: { background: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.88)" },
    },
  }[tone];
  const st = active ? palette.active : palette.inactive;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: "40px",
        padding: "0 16px",
        borderRadius: "999px",
        border: `1px solid ${st.border}`,
        background: st.background,
        color: st.color,
        fontSize: "14px",
        fontWeight: 700,
        cursor: onClick ? "pointer" : "default",
        boxShadow: active && tone !== "dark" ? "0 8px 18px rgba(0,30,61,0.08)" : "none",
      }}
    >
      {label}
    </button>
  );
}

// ── Btn ────────────────────────────────────────────────────────────────────────
export function Btn({ label, icon: Icon, onClick, variant = "primary", full, disabled }: {
  label: string; icon?: ElementType;
  onClick?: () => void; variant?: "primary" | "ghost" | "outline";
  full?: boolean; disabled?: boolean;
}) {
  const styles: Record<string, CSSProperties> = {
    primary: { background: "linear-gradient(180deg,#005cb9 0%, #0050a0 100%)", color: "#fff", border: "none", boxShadow: "0 10px 22px rgba(0,92,185,0.24)" },
    ghost:   { background: C.white, color: C.navy, border: `1px solid ${C.border}` },
    outline: { background: "transparent", color: C.blue, border: `1px solid ${C.border}` },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: "8px",
        padding: "10px 16px", borderRadius: "12px",
        fontSize: "14px", fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
        width: full ? "100%" : undefined,
        justifyContent: full ? "center" : undefined,
        letterSpacing: "-0.01em",
        ...styles[variant],
        ...(disabled ? { background: "#eef1f6", color: C.muted, border: `1px solid ${C.border}`, boxShadow: "none" } : {}),
      }}>
      {Icon && <Icon size={15} />}{label}
    </button>
  );
}

// ── TopBar ─────────────────────────────────────────────────────────────────────
export function TopBar({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "18px 24px 18px",
      gap: "16px",
    }}>
      <div>
        <h1 style={{ margin: 0, fontSize: "31px", fontWeight: 800, letterSpacing: "-0.05em", color: C.navy, fontFamily: FONT_UI, lineHeight: 1.08 }}>{title}</h1>
        {sub && <p style={{ margin: "6px 0 0", fontSize: "14px", color: C.muted, maxWidth: "760px", lineHeight: 1.45 }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────────
export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      background: C.white, border: `1px solid ${C.border}`,
      borderRadius: "16px", boxShadow: "0 10px 24px rgba(0,30,61,0.05)",
      backdropFilter: "blur(18px)",
      ...style,
    }}>{children}</div>
  );
}

// ── HeroHeader ─────────────────────────────────────────────────────────────────
// Banner azul con degradé usado como encabezado de las pantallas principales del
// Ejecutivo (Panel, Compromisos, etc.): título + fecha de actualización + acciones.
export function updatedAtLabel() {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat("es-CL", { weekday: "long" }).format(now);
  const day = new Intl.DateTimeFormat("es-CL", { day: "numeric" }).format(now);
  const month = new Intl.DateTimeFormat("es-CL", { month: "long" }).format(now);
  const time = new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  const cap = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
  return `Información actualizada al ${cap(weekday)} ${day} de ${month} · ${time}`;
}

export function HeroHeader({ title, sub, actions }: { title: string; sub: string; actions?: ReactNode }) {
  return (
    <Card style={{
      marginBottom: "22px",
      padding: "26px 24px",
      border: "none",
      borderRadius: "10px",
      background: "linear-gradient(135deg, #001E3D 0%, #023AE0 100%)",
      color: "#fff",
      boxShadow: "0 16px 36px rgba(0,30,61,0.18)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "18px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "34px", fontWeight: 800, lineHeight: 1.04, letterSpacing: "-0.05em", color: "#fff" }}>{title}</h1>
          <p style={{ margin: "8px 0 0", fontSize: "14px", color: "rgba(255,255,255,0.82)", lineHeight: 1.45 }}>{sub}</p>
        </div>
        {actions && <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>{actions}</div>}
      </div>
    </Card>
  );
}

export function GhostBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      height: "48px", padding: "0 18px", borderRadius: "12px",
      background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)",
      color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer",
    }}>
      {label}
    </button>
  );
}

export function SolidBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      height: "48px", padding: "0 18px", borderRadius: "12px",
      background: "linear-gradient(180deg,#0b5ab7,#0750a6)", border: "none",
      color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer",
      boxShadow: "0 10px 22px rgba(0,92,185,0.26)",
    }}>
      {label}
    </button>
  );
}

// ── ReceiptThumb ───────────────────────────────────────────────────────────────
export function ReceiptThumb({ src, label, caption }: { src: string; label: string; caption: string }) {
  return (
    <div style={{
      borderRadius: "16px",
      overflow: "hidden",
      border: `1px solid ${C.border}`,
      background: C.white,
      boxShadow: "0 10px 24px rgba(0,30,61,0.08)",
    }}>
      <div style={{ aspectRatio: "4 / 3", background: "#fff", overflow: "hidden" }}>
        <img src={src} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontSize: "12px", fontWeight: 800, color: C.navy }}>{label}</div>
        <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>{caption}</div>
      </div>
    </div>
  );
}

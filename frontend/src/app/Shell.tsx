import type { ReactNode } from "react";
import { LogOut, User } from "lucide-react";
import { C, FONT_UI } from "./theme";
import { PERFIL_BASE } from "./data";
import type { Rol, Screen } from "./types";
import { Chip } from "./ui";
import logoSidebarUrl from "../assets/logo.svg";

const NAV: Array<{ key: string; label: string; screen?: Screen; roles: Rol[] }> = [
  { key: "panel",         label: "Mi Escritorio", screen: "panel",         roles: ["ejecutivo", "supervisor"] },
  { key: "compromisos",   label: "Mis Compromisos", screen: "buscar",        roles: ["ejecutivo"] },
  { key: "pagos",         label: "Mis Pagos",       screen: "pagos",         roles: ["ejecutivo"] },
  { key: "excepciones",   label: "Excepciones",   screen: "excepciones",   roles: ["supervisor"] },
  { key: "auditoria",     label: "Auditoría",     screen: "auditoria",     roles: ["supervisor"] },
  { key: "sincronizacion",label: "Sincronización", screen: "sincronizacion", roles: ["ejecutivo", "supervisor"] },
  // Fuera de alcance de este prototipo (no forman parte de las 8 pantallas
  // requeridas en el documento de requerimientos; Configuración corresponde
  // al rol Administrador, no incluido aquí). Se mantienen definidas para no
  // perder la funcionalidad, solo no se muestran en el menú.
  { key: "reportes",      label: "Reportes",                               roles: [] },
  { key: "configuracion", label: "Configuración",                          roles: [] },
];

function rolLabel(rol: Rol) {
  return rol === "supervisor" ? "Supervisor de Cobranza" : "Ejecutivo de Cobranza";
}

export function Shell({ screen, rol, navigate, onChangeRol, onLogout, children }: {
  screen: Screen; rol: Rol; navigate: (s: Screen) => void; onChangeRol: (r: Rol) => void; onLogout: () => void; children: ReactNode;
}) {
  const activeNavKey =
    screen === "buscar" || screen === "compromiso_nuevo" || screen === "compromiso" ? "compromisos" :
    screen === "pagos" || screen === "comprobante" || screen === "matching" || screen === "cuadratura" ? "pagos" :
    screen === "excepciones" ? "excepciones" :
    screen === "auditoria" ? "auditoria" :
    screen === "sincronizacion" ? "sincronizacion" :
    "panel";

  const visibleNav = NAV.filter((item) => item.roles.includes(rol));

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      fontFamily: FONT_UI,
      display: "grid",
      gridTemplateColumns: "300px minmax(0, 1fr)",
    }}>
      <aside style={{
        position: "sticky",
        top: 0,
        height: "100vh",
        padding: "28px 24px 18px",
        background: "linear-gradient(180deg, #001E3D 0%, #002080 100%)",
        color: "rgba(255,255,255,0.8)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "8px",
        boxShadow: "0 24px 60px rgba(0, 30, 61, 0.12)",
      }}>
        <div style={{ display: "grid", gap: "10px" }}>
          <img
            src={logoSidebarUrl}
            alt="Tanner Servicios Financieros"
            style={{
              width: "220px",
              maxWidth: "100%",
              objectFit: "contain",
              filter: "drop-shadow(0 10px 20px rgba(0, 30, 61, 0.35))",
            }}
          />
          <span style={{
            color: "rgba(255,255,255,0.75)",
            fontSize: "12px",
            lineHeight: 1.35,
          }}>
            Motor de Pagos y Conciliaciones
          </span>
        </div>

        <nav style={{ display: "grid", gap: "8px" }}>
          {visibleNav.map(({ key, label, screen: targetScreen }) => {
            const active = key === activeNavKey;
            return (
              <button
                key={key}
                type="button"
                onClick={() => targetScreen && navigate(targetScreen)}
                disabled={!targetScreen}
                style={{
                minHeight: "48px",
                padding: "12px 16px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                color: active ? "#FFFFFF" : "rgba(255,255,255,0.80)",
                fontWeight: active ? 600 : 500,
                background: active ? "rgba(255,255,255,0.10)" : "transparent",
                border: active ? "1px solid rgba(255,255,255,0.15)" : "1px solid transparent",
                cursor: targetScreen ? "pointer" : "default",
                boxShadow: "none",
                transition: "background-color 160ms ease, color 160ms ease, border-color 160ms ease",
                textAlign: "left",
                fontSize: "16px",
                lineHeight: 1.5,
                fontFamily: FONT_UI,
                opacity: 1,
              }}>
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto", display: "grid", gap: "12px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "10px 12px", borderRadius: "10px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: "rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <User size={18} color="rgba(255,255,255,0.85)" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: "14px", fontWeight: 600, color: "#fff",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {PERFIL_BASE.nombre} {PERFIL_BASE.apellido}
              </div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.60)" }}>
                {rolLabel(rol)}
              </div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.60)" }}>
                Phoenix Services
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            <div style={{ flex: 1 }}>
              <Chip label="Ejecutivo" tone="dark" active={rol === "ejecutivo"} onClick={() => onChangeRol("ejecutivo")} />
            </div>
            <div style={{ flex: 1 }}>
              <Chip label="Supervisor" tone="dark" active={rol === "supervisor"} onClick={() => onChangeRol("supervisor")} />
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "10px 12px", borderRadius: "10px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.80)",
              fontSize: "14px", fontWeight: 600,
              cursor: "pointer",
              fontFamily: FONT_UI,
              width: "100%",
              justifyContent: "flex-start",
            }}
          >
            <LogOut size={16} />
            Salir
          </button>

          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)" }}>v1.0 Prototipo</div>
        </div>
      </aside>

      <div style={{ minWidth: 0, padding: "24px" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

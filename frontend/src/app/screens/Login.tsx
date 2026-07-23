import { useState } from "react";
import { C, FONT_UI } from "../theme";
import logoLoginUrl from "../../assets/logo.png";

export function Login({ onLogin }: { onLogin: () => void }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");

  // ponytail: sin credenciales — pide el token al backend y lo guarda.
  async function ingresar() {
    const r = await fetch("/api/token/", { method: "POST" });
    const { access, refresh } = await r.json();
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);
    onLogin();
  }

  const inp: React.CSSProperties = {
    width: "100%", height: "48px", padding: "0 16px",
    borderRadius: "12px", border: "1px solid rgba(2,73,147,0.12)",
    background: "rgba(255,255,255,0.92)", color: C.text,
    fontSize: "14px", outline: "none", boxSizing: "border-box",
    fontFamily: FONT_UI,
  };

  return (
    <div style={{
      minHeight: "100vh",
      background:
        "radial-gradient(circle at top left, rgba(77, 210, 255, 0.18), transparent 28%), radial-gradient(circle at top right, rgba(2, 58, 224, 0.12), transparent 24%), linear-gradient(180deg, #f8fbff 0%, #eef3f9 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: FONT_UI,
      padding: "32px 20px",
    }}>
      <div style={{ width: "100%", maxWidth: "460px" }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <img
            src={logoLoginUrl}
            alt="Tanner Servicios Financieros"
            style={{ width: "100%", maxWidth: "320px", display: "block", margin: "0 auto" }}
          />
          <div style={{ marginTop: "10px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted }}>
            Motor de Pagos y Conciliaciones
          </div>
        </div>

        <div style={{
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(18px)",
          border: `1px solid ${C.border}`,
          borderRadius: "24px", padding: "36px 28px",
          boxShadow: "0 30px 80px rgba(0,30,61,0.12)",
        }}>
          <div style={{ display: "grid", gap: "14px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted, marginBottom: "8px" }}>Usuario</label>
              <input value={u} onChange={e => setU(e.target.value)} placeholder="carlos.morales@tanner.cl" style={inp} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted, marginBottom: "8px" }}>Contraseña</label>
              <input type="password" value={p} onChange={e => setP(e.target.value)} placeholder="••••••••" style={inp} />
            </div>
          </div>

          <button onClick={ingresar} style={{
            width: "100%", height: "50px", borderRadius: "14px",
            background: "linear-gradient(180deg,#0b5ab7,#0750a6)",
            border: "none", color: "#fff", fontSize: "15px", fontWeight: 700,
            cursor: "pointer", boxShadow: "0 10px 22px rgba(11,90,183,0.35)",
            fontFamily: FONT_UI,
          }}>
            Ingresar
          </button>

          <p style={{ margin: "16px 0 0", textAlign: "center", fontSize: "11px", color: C.muted }}>
            Plataforma operativa · v2.4
          </p>
        </div>
      </div>
    </div>
  );
}

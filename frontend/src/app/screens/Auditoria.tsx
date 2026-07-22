import { useState } from "react";
import { Search } from "lucide-react";
import { C, FONT_UI } from "../theme";
import { Card, TopBar } from "../ui";

// ════════════════════════════════════════════════════════════════════════════════
// AUDITORÍA (doc §14.7) — línea de tiempo global, trazabilidad completa. Solo rol Supervisor.
// ════════════════════════════════════════════════════════════════════════════════
// "compromiso" es el ID del crédito: numérico, 7 dígitos, clave única en toda la plataforma.
const EVENTOS = [
  { ts: "12/07 09:14", compromiso: "3350049", cliente: "Pamela González Álvarez",  actor: "Carlos Morales",  accion: "Consulta a Mónaco · deuda vigente obtenida",                dot: C.blue },
  { ts: "12/07 09:20", compromiso: "3350049", cliente: "Pamela González Álvarez",  actor: "Carlos Morales",  accion: "Compromiso creado · 4 cuotas comprometidas",                dot: C.muted },
  { ts: "12/07 14:02", compromiso: "3287612", cliente: "Rodrigo Soto Fuentes",     actor: "Daniela Poblete", accion: "Comprobante cargado · OCR confianza 88%",                   dot: C.blue },
  { ts: "12/07 14:03", compromiso: "3287612", cliente: "Rodrigo Soto Fuentes",     actor: "Motor",           accion: "Matching · match probable 74%",                             dot: "#7c3aed" },
  { ts: "12/07 14:05", compromiso: "3287612", cliente: "Rodrigo Soto Fuentes",     actor: "Motor",           accion: "Cuadratura · faltante $84.200 fuera de tolerancia",         dot: C.amber },
  { ts: "12/07 14:06", compromiso: "3287612", cliente: "Rodrigo Soto Fuentes",     actor: "Motor",           accion: "Caso derivado a bandeja de excepciones",                    dot: C.red },
  { ts: "11/07 10:41", compromiso: "3419820", cliente: "Manuel Torres Díaz",       actor: "Felipe Aránguiz", accion: "Compromiso creado · 2 cuotas comprometidas",                dot: C.muted },
  { ts: "11/07 16:12", compromiso: "3419820", cliente: "Manuel Torres Díaz",       actor: "Motor",           accion: "Cuadratura · excedente $5.500 no confirmado como SAF",      dot: C.cyan },
  { ts: "10/07 11:05", compromiso: "3102456", cliente: "Jorge Espinoza Torres",    actor: "Sistema",         accion: "Mónaco actualizado · interés moratorio recalculado",        dot: C.blue },
  { ts: "10/07 11:20", compromiso: "3102456", cliente: "Jorge Espinoza Torres",    actor: "Recaudaciones",   accion: "Pago aplicado · enviado a Recaudaciones (SOLCOB-84216)",    dot: C.green },
  { ts: "09/07 09:02", compromiso: "2876543", cliente: "Ana Castillo Bravo",       actor: "Ignacia Rojas",   accion: "Comprobante rechazado · monto no coincide",                 dot: C.red },
  { ts: "08/07 17:44", compromiso: "2734510", cliente: "Marcela Uribe Contreras",  actor: "Motor",           accion: "Posible duplicado detectado · aplicación bloqueada",        dot: C.red },
];

export function Auditoria() {
  const [q, setQ] = useState("");

  const filtrados = EVENTOS.filter((e) =>
    !q ||
    e.cliente.toLowerCase().includes(q.toLowerCase()) ||
    e.compromiso.toLowerCase().includes(q.toLowerCase()) ||
    e.actor.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <TopBar
        title="Auditoría"
        sub="Línea de tiempo global · consultas a Mónaco, lecturas OCR, cambios de estado y aprobaciones"
      />

      <div style={{ padding: "0 24px 24px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          minHeight: "52px", padding: "0 16px",
          borderRadius: "12px", background: C.white,
          border: `1px solid ${C.border}`,
          boxShadow: "0 8px 22px rgba(0,30,61,0.06)",
          marginBottom: "18px",
        }}>
          <Search size={16} color={C.blue} style={{ flexShrink: 0 }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por RUT, cliente, ID de compromiso o usuario..."
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "15px", color: C.text, fontFamily: FONT_UI, fontWeight: 500 }}
          />
        </div>

        <Card style={{ padding: "12px 0" }}>
          {filtrados.map((e, i) => (
            <div key={i} style={{ display: "flex", gap: "14px", padding: "12px 20px" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, paddingTop: "4px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "999px", background: e.dot }} />
                {i < filtrados.length - 1 && <div style={{ width: "2px", flex: 1, background: C.border, marginTop: "4px" }} />}
              </div>
              <div style={{ paddingBottom: "8px", flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: C.navy }}>{e.accion}</div>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: C.blue, fontFamily: C.mono }}>{e.compromiso}</span>
                </div>
                <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px", fontFamily: C.mono }}>{e.ts} · {e.actor} · {e.cliente}</div>
              </div>
            </div>
          ))}
          {filtrados.length === 0 && (
            <div style={{ padding: "28px", textAlign: "center", fontSize: "13px", color: C.muted }}>Sin eventos para esta búsqueda.</div>
          )}
        </Card>
      </div>
    </>
  );
}

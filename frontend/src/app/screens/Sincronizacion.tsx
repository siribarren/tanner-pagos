import { C } from "../theme";
import { Badge, Card, SolidBtn, TopBar } from "../ui";

export type SincronizacionEvento = { fecha: string; hora: string; estado: "COMPLETADA" | "FALLIDA" };

// ════════════════════════════════════════════════════════════════════════════════
// SINCRONIZACIÓN — historial de sincronizaciones contra Mónaco/Tubo/Flokzu
// disparadas desde el botón "Sincronizar" (cualquier pantalla). El historial vive
// en memoria en App.tsx y crece con cada sincronización realizada en la sesión.
// ════════════════════════════════════════════════════════════════════════════════
export function Sincronizacion({ historial, onSync }: { historial: SincronizacionEvento[]; onSync: () => void }) {
  return (
    <>
      <TopBar
        title="Sincronización"
        sub="Historial de sincronizaciones contra Mónaco, el Tubo y Flokzu realizadas en esta sesión"
        right={<SolidBtn label="Sincronizar" onClick={onSync} />}
      />

      <div style={{ padding: "0 24px 24px" }}>
        <Card style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "480px" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}>
                  {["Día", "Hora", "Estado"].map((h, i) => (
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
                {historial.map((e, i) => (
                  <tr key={i} style={{ borderBottom: i < historial.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <td style={{ padding: "16px 20px", fontSize: "14px", fontWeight: 700, color: C.navy, fontFamily: C.mono }}>{e.fecha}</td>
                    <td style={{ padding: "16px 20px", textAlign: "right", fontSize: "14px", color: C.navy, fontFamily: C.mono }}>{e.hora}</td>
                    <td style={{ padding: "16px 20px", textAlign: "right" }}><Badge s={e.estado} width={110} /></td>
                  </tr>
                ))}
                {historial.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: "28px", textAlign: "center", fontSize: "13px", color: C.muted }}>
                      Todavía no se ha realizado ninguna sincronización en esta sesión.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}

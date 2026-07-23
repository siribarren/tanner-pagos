import { useEffect, useState } from "react";
import { Upload, Zap } from "lucide-react";
import { getCarteraDetalle, type CarteraDetalle } from "../../api/cartera";
import { C, clp, STATUS } from "../theme";
import type { DetalleTipo, Screen } from "../types";
import { Badge, Btn, Card } from "../ui";

function tintFor(statusKey: string) {
  const [color, bg] = STATUS[statusKey] ?? [C.muted, "rgba(107,114,128,0.1)"];
  return { background: bg, border: `1px solid ${color}30` };
}

function formatDate(value?: string | null) {
  if (!value) return "No definido";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
  });
}

function statusKey(value?: string | null) {
  return value ? value.toUpperCase() : undefined;
}

export function CompromisoDetalle({ navigate, tipo = "compromiso", idCredito, solcob }: {
  navigate: (s: Screen) => void;
  tipo?: DetalleTipo;
  idCredito: string;
  solcob?: string | null;
}) {
  const [detalle, setDetalle] = useState<CarteraDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    getCarteraDetalle(idCredito)
      .then((data) => {
        if (mounted) setDetalle(data);
      })
      .catch((requestError) => {
        if (mounted) setError(requestError instanceof Error ? requestError.message : "No fue posible cargar el detalle");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [idCredito]);

  if (loading) {
    return <div style={{ padding: "40px 24px", color: C.muted }}>Cargando detalle...</div>;
  }

  if (error || !detalle) {
    return <div style={{ padding: "40px 24px", textAlign: "center", color: C.muted }}>{error ?? "No hay detalle disponible"}</div>;
  }

  const crm = detalle.crm;
  const estado = statusKey(crm?.estado) ?? "SIN_COMPROMISO";
  const pago = statusKey(crm?.pago);
  const situacion = crm?.situacion ? `SITUACION_${statusKey(crm.situacion)}` : undefined;
  const monto = detalle.cuotas
    .filter((cuota) => crm?.id != null && cuota.crm_fila_id === crm.id)
    .reduce((total, cuota) => total + cuota.monto, 0);

  return (
    <>
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        gap: "16px", padding: "18px 24px 18px",
      }}>
        <div>
          <div style={{ fontSize: "31px", fontWeight: 800, letterSpacing: "-0.05em", color: C.navy, lineHeight: 1.08 }}>
            ID {detalle.credito.id}
          </div>
          <div style={{ marginTop: "6px", fontSize: "13px", color: C.muted, fontFamily: C.mono }}>
            RUT {detalle.credito.rut}
          </div>
          {tipo === "pago" && solcob && (
            <div style={{ marginTop: "2px", fontSize: "13px", color: C.muted, fontFamily: C.mono }}>{solcob}</div>
          )}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Btn
            label={situacion === "SITUACION_PENDIENTE" ? "Validar pago" : "Cargar comprobante"}
            icon={Upload}
            onClick={() => navigate("comprobante")}
            disabled={situacion === "SITUACION_VALIDADO"}
          />
          <Btn
            label={situacion === "SITUACION_PENDIENTE" ? "Cuadratura pendiente" : "Ver cuadratura"}
            icon={Zap}
            onClick={() => navigate("cuadratura")}
            variant="ghost"
            disabled={situacion === "SITUACION_PENDIENTE"}
          />
        </div>
      </div>

      <div style={{ padding: "0 24px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px", marginBottom: "12px" }}>
          {[
            ["Fecha de contacto", crm?.fecha_contacto],
            ["Fecha de compromiso", crm?.fecha_compromiso],
            ["Fecha de pago", crm?.fecha_pago],
          ].map(([label, value]) => (
            <Card key={label} style={{ padding: "18px 18px", minHeight: "84px", background: C.blueSoft, border: "1px solid rgba(0,92,185,0.18)" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted }}>{label}</div>
              <div style={{ marginTop: "5px", fontSize: "18px", fontWeight: 800, fontFamily: C.mono, color: value ? C.blue : C.muted, letterSpacing: "-0.03em" }}>{formatDate(value)}</div>
            </Card>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "12px", marginBottom: "20px" }}>
          <Card style={{ padding: "18px 18px", minHeight: "92px", ...tintFor(estado) }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: C.muted, marginBottom: "8px" }}>Estado</div>
            <Badge s={estado} />
          </Card>
          <Card style={{ padding: "18px 18px", minHeight: "92px", ...tintFor(pago ?? "") }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: C.muted, marginBottom: "8px" }}>Pago</div>
            {pago ? <Badge s={pago} /> : <span style={{ color: C.muted, fontSize: "12px" }}>No definido</span>}
          </Card>
          <Card style={{ padding: "18px 18px", minHeight: "92px", ...tintFor(situacion ?? "") }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: C.muted, marginBottom: "8px" }}>Situación</div>
            {situacion ? <Badge s={situacion} /> : <span style={{ color: C.muted, fontSize: "12px" }}>No definido</span>}
          </Card>
          <Card style={{ padding: "18px 18px", minHeight: "92px", background: C.blueSoft, border: "1px solid rgba(0,92,185,0.18)" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: C.muted }}>Monto a validar</div>
            <div style={{ marginTop: "5px", fontSize: "18px", fontWeight: 800, fontFamily: C.mono, color: C.blue }}>{clp(monto)}</div>
          </Card>
        </div>

        <h3 style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 700, color: C.navy }}>Cuotas</h3>
        <Card style={{ marginBottom: "20px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}>
                  {["N° cuota", "Fecha", "Estado", "Monto"].map((header, index) => (
                    <th key={header} style={{ textAlign: index === 0 ? "left" : "right", padding: "10px 16px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: C.muted }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detalle.cuotas.map((cuota, index) => {
                  const comprometida = crm?.id != null && cuota.crm_fila_id === crm.id;
                  return (
                    <tr key={cuota.id} style={{
                      borderBottom: index < detalle.cuotas.length - 1 ? `1px solid ${C.border}` : "none",
                      background: comprometida ? "rgba(0,92,185,0.04)" : "transparent",
                      boxShadow: comprometida ? "inset 4px 0 0 " + C.blue : "none",
                    }}>
                      <td style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 800, color: C.navy }}>Cuota {index + 1}</td>
                      <td style={{ padding: "14px 16px", fontSize: "13px", fontFamily: C.mono, color: C.navy, textAlign: "right" }}>{formatDate(cuota.fecha)}</td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}><Badge s={cuota.estado.toUpperCase()} /></td>
                      <td style={{ padding: "14px 16px", fontSize: "14px", fontWeight: 800, fontFamily: C.mono, color: C.navy, textAlign: "right" }}>{clp(cuota.monto)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}

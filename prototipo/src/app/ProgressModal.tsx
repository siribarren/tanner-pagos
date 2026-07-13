import { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, Check, Clock } from "lucide-react";
import { C } from "./theme";
import type { SyncMode } from "./types";

export const STEP_DURATION = 5;

export type ProgressStep = {
  key: string;
  title: string;
  runningText: string;
  successText: string;
  errorText: string;
};

// ════════════════════════════════════════════════════════════════════════════════
// Modal de progreso genérico (avance por pasos + barra + advertencia de no cerrar).
// Reutilizado por la sincronización con Monaco/Flokzu y por la generación de un
// compromiso, para que ambos flujos compartan la misma interacción y estilo.
// ════════════════════════════════════════════════════════════════════════════════
export function ProgressModal({
  open,
  runId,
  title,
  warningText,
  steps,
  resumen,
  onClose,
  onRetry,
  onSuccess,
  totalSeconds: totalSecondsProp,
}: {
  open: boolean;
  runId: number;
  title: string;
  warningText: string;
  steps: readonly ProgressStep[];
  resumen: { running: string; success: string; error: string };
  onClose: () => void;
  onRetry: () => void;
  /** Se dispara una vez, en el instante en que el proceso termina con éxito. */
  onSuccess?: () => void;
  /** Duración total en segundos. Por defecto STEP_DURATION segundos por paso. */
  totalSeconds?: number;
}) {
  const totalSeconds = totalSecondsProp ?? steps.length * STEP_DURATION;
  const stepDuration = totalSeconds / steps.length;

  const [mode, setMode] = useState<SyncMode>("running");
  const [elapsed, setElapsed] = useState(0);
  const [remaining, setRemaining] = useState(totalSeconds);
  const [failedStep, setFailedStep] = useState<number | null>(null);
  const [failedProgress, setFailedProgress] = useState(0);

  useEffect(() => {
    if (!open) return;

    const shouldFail = Math.random() < 0.3;
    const plannedFailureStep = shouldFail ? Math.floor(Math.random() * steps.length) : null;
    const failureThreshold = plannedFailureStep === null ? null : plannedFailureStep * stepDuration + Math.min(2, stepDuration / 2);

    setMode("running");
    setElapsed(0);
    setRemaining(totalSeconds);
    setFailedStep(null);
    setFailedProgress(0);

    const timer = window.setInterval(() => {
      setElapsed((currentElapsed) => {
        const nextElapsed = Math.min(currentElapsed + 1, totalSeconds);
        const nextRemaining = Math.max(totalSeconds - nextElapsed, 0);
        setRemaining(nextRemaining);

        if (plannedFailureStep !== null && failureThreshold !== null && nextElapsed >= failureThreshold) {
          setMode("error");
          setFailedStep(plannedFailureStep);
          setFailedProgress(Math.max(15, Math.round(((nextElapsed - plannedFailureStep * stepDuration) / stepDuration) * 100)));
          window.clearInterval(timer);
          return nextElapsed;
        }

        if (nextElapsed >= totalSeconds) {
          setMode("success");
          setFailedStep(null);
          setFailedProgress(100);
          window.clearInterval(timer);
          onSuccess?.();
        }

        return nextElapsed;
      });
    }, 1000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, runId, steps, totalSeconds, stepDuration]);

  if (!open) return null;

  const overallProgress =
    mode === "success" ? 100 :
    mode === "error" && failedStep !== null ? Math.min(100, Math.round(((failedStep * stepDuration) + (failedProgress / 100) * stepDuration) / totalSeconds * 100)) :
    Math.min(100, Math.round((elapsed / totalSeconds) * 100));

  const buttonRow = mode === "error"
    ? (
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            height: "42px",
            padding: "0 16px",
            borderRadius: "12px",
            border: `1px solid ${C.border}`,
            background: "#fff",
            color: C.navy,
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Cerrar
        </button>
        <button
          type="button"
          onClick={onRetry}
          style={{
            height: "42px",
            padding: "0 16px",
            borderRadius: "12px",
            border: "none",
            background: "linear-gradient(180deg,#005cb9 0%, #0050a0 100%)",
            color: "#fff",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 10px 22px rgba(0,92,185,0.24)",
          }}
        >
          Reintentar
        </button>
      </div>
    )
    : (
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            height: "42px",
            padding: "0 16px",
            borderRadius: "12px",
            border: "none",
            background: "linear-gradient(180deg,#005cb9 0%, #0050a0 100%)",
            color: "#fff",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 10px 22px rgba(0,92,185,0.24)",
          }}
        >
          Cerrar
        </button>
      </div>
    );

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 80,
      background: "rgba(8, 15, 31, 0.48)",
      backdropFilter: "blur(10px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "720px",
        borderRadius: "20px",
        background: "#fff",
        border: `1px solid ${C.border}`,
        boxShadow: "0 28px 72px rgba(0,30,61,0.25)",
        overflow: "hidden",
      }}>
        <div style={{
          padding: "20px 22px 16px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "24px", fontWeight: 800, letterSpacing: "-0.04em", color: C.navy, lineHeight: 1.08 }}>
              {title}
            </h3>
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "8px",
              marginTop: "12px", padding: "10px 12px", borderRadius: "10px",
              background: C.amberSoft, border: "1px solid rgba(217,119,6,0.2)",
            }}>
              <AlertTriangle size={16} color={C.amber} style={{ flexShrink: 0, marginTop: "1px" }} />
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#7a4a00", lineHeight: 1.45 }}>
                Advertencia: {warningText}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              border: `1px solid ${C.border}`,
              background: "#fff",
              color: C.navy,
              cursor: "pointer",
              fontSize: "20px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: "20px 22px 22px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            marginBottom: "14px",
            flexWrap: "wrap",
          }}>
            <div style={{ fontSize: "14px", fontWeight: 800, color: C.navy }}>
              {overallProgress}% Complete
            </div>
            <div style={{
              padding: "8px 12px",
              borderRadius: "999px",
              background: "rgba(0,92,185,0.08)",
              color: C.blue,
              fontSize: "13px",
              fontWeight: 700,
            }}>
              Tiempo aproximado: {remaining} segundos
            </div>
          </div>

          <div style={{ height: "10px", borderRadius: "999px", background: "#e9eef6", overflow: "hidden", marginBottom: "18px" }}>
            <div style={{ width: `${overallProgress}%`, height: "100%", background: "linear-gradient(90deg,#001e3d,#005cb9)", borderRadius: "999px" }} />
          </div>

          <div style={{ display: "grid", gap: "14px" }}>
            {steps.map((step, index) => {
              const stepStart = index * stepDuration;
              const stepEnd = stepStart + stepDuration;
              const isFailedStep = mode === "error" && failedStep === index;
              const isComplete = mode === "success" || (mode === "running" && elapsed >= stepEnd) || (mode === "error" && failedStep !== null && index < failedStep);
              const isRunning = mode === "running" && elapsed >= stepStart && elapsed < stepEnd;
              const stepProgress =
                mode === "success" ? 100 :
                isFailedStep ? failedProgress :
                isComplete ? 100 :
                isRunning ? Math.max(10, Math.round(((elapsed - stepStart) / stepDuration) * 100)) : 0;

              const statusLabel =
                isFailedStep ? step.errorText :
                isComplete ? step.successText :
                isRunning ? step.runningText : "En espera para iniciar.";

              const statusTone = isFailedStep ? C.red : isComplete ? C.green : isRunning ? C.blue : C.muted;
              const icon = isFailedStep ? <AlertCircle size={16} /> : isComplete ? <Check size={16} /> : isRunning ? <Clock size={16} /> : <span style={{ width: "8px", height: "8px", borderRadius: "999px", background: C.muted, display: "inline-block" }} />;

              return (
                <div key={step.key} style={{
                  border: `1px solid ${isFailedStep ? "rgba(190,18,60,0.18)" : C.border}`,
                  borderRadius: "14px",
                  padding: "14px 14px 12px",
                  background: isFailedStep ? "rgba(190,18,60,0.03)" : "#fff",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "10px" }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <div style={{ color: statusTone, marginTop: "1px" }}>{icon}</div>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 800, color: C.navy }}>{step.title}</div>
                        <div style={{ fontSize: "13px", color: statusTone, marginTop: "4px", lineHeight: 1.45 }}>{statusLabel}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: isFailedStep ? C.red : C.muted, whiteSpace: "nowrap" }}>
                      {stepProgress}% Complete
                    </div>
                  </div>
                  <div style={{ height: "8px", borderRadius: "999px", background: "#e9eef6", overflow: "hidden" }}>
                    <div style={{
                      width: `${stepProgress}%`,
                      height: "100%",
                      borderRadius: "999px",
                      background: isFailedStep
                        ? "linear-gradient(90deg,#be123c,#ef4444)"
                        : isComplete
                          ? "linear-gradient(90deg,#0b7c5a,#16a34a)"
                          : "linear-gradient(90deg,#001e3d,#005cb9)",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: "18px", padding: "14px 16px", borderRadius: "12px", background: mode === "error" ? "rgba(190,18,60,0.08)" : "rgba(0,92,185,0.08)", border: `1px solid ${mode === "error" ? "rgba(190,18,60,0.18)" : "rgba(0,92,185,0.14)"}` }}>
            <div style={{ fontSize: "13px", fontWeight: 800, color: mode === "error" ? C.red : C.blue, marginBottom: "4px" }}>
              {mode === "error" ? "Proceso interrumpido" : mode === "success" ? "Proceso completado" : "Información del proceso"}
            </div>
            <div style={{ fontSize: "13px", color: C.navy, lineHeight: 1.5 }}>
              {mode === "error" ? resumen.error : mode === "success" ? resumen.success : resumen.running}
            </div>
          </div>

          <div style={{ marginTop: "18px" }}>
            {buttonRow}
          </div>
        </div>
      </div>
    </div>
  );
}

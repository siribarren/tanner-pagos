import { useState } from "react";
import { Shell } from "./Shell";
import { ProgressModal, type ProgressStep } from "./ProgressModal";
import type { DetalleTipo, Rol, Screen } from "./types";
import { Login } from "./screens/Login";
import { Panel } from "./screens/Panel";
import { Buscar } from "./screens/Buscar";
import { CompromisoNuevo } from "./screens/CompromisoNuevo";
import { CompromisoDetalle } from "./screens/CompromisoDetalle";
import { PagosEnviados } from "./screens/PagosEnviados";
import { Comprobante } from "./screens/Comprobante";
import { Matching } from "./screens/Matching";
import { Cuadratura } from "./screens/Cuadratura";
import { Excepciones } from "./screens/Excepciones";
import { Auditoria } from "./screens/Auditoria";

const EJECUTIVO_SCREENS: Screen[] = ["buscar", "compromiso_nuevo", "compromiso", "pagos", "comprobante", "matching", "cuadratura"];
const SUPERVISOR_SCREENS: Screen[] = ["excepciones", "auditoria"];

// Ejecutivo: sincroniza contra Monaco, el Tubo (planilla de cobranza) y el motor de pagos.
const SYNC_STEPS_EJECUTIVO: ProgressStep[] = [
  {
    key: "connect",
    title: "Conectando con Monaco",
    runningText: "Estableciendo conexión segura con el origen de datos.",
    successText: "Conectado con éxito. Sesión autenticada y lista para extraer.",
    errorText: "Error en la conexión. Revisa credenciales o conectividad.",
  },
  {
    key: "extract",
    title: "Extrayendo los datos desde el Tubo",
    runningText: "Consultando compromisos, pagos y estados desde el Tubo.",
    successText: "Datos extraídos con éxito y validados para actualización.",
    errorText: "Error en la extracción de datos. La respuesta del origen fue incompleta.",
  },
  {
    key: "update",
    title: "Actualizando los datos en el motor de pagos",
    runningText: "Sincronizando montos y estados en la plataforma.",
    successText: "Datos actualizados. Monaco y el motor de pagos quedaron alineados.",
    errorText: "Error en la actualización. La plataforma no pudo persistir los cambios.",
  },
];

// Supervisor: no sincroniza contra el Tubo (eso es operativa del ejecutivo). Solo
// contra Monaco (deuda oficial) y Flokzu (solicitudes y aprobaciones de cobranza).
const SYNC_STEPS_SUPERVISOR: ProgressStep[] = [
  {
    key: "connect",
    title: "Conectando con Monaco",
    runningText: "Estableciendo conexión segura con el origen de datos.",
    successText: "Conectado con éxito. Sesión autenticada y lista para extraer.",
    errorText: "Error en la conexión. Revisa credenciales o conectividad.",
  },
  {
    key: "flokzu",
    title: "Sincronizando con Flokzu",
    runningText: "Consultando solicitudes de cobranza y aprobaciones en Flokzu.",
    successText: "Datos de Flokzu sincronizados correctamente.",
    errorText: "Error al sincronizar con Flokzu. Revisa la conexión con el BPM.",
  },
];

const SYNC_RESUMEN = {
  running: "Estamos conectando, extrayendo y actualizando datos en tiempo real. El proceso puede tardar unos segundos.",
  success: "Los datos quedaron sincronizados correctamente entre Monaco y el motor de pagos.",
  error: "Se detectó un error durante la sincronización. Puedes cerrar la ventana o reintentar el proceso completo.",
};

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [screen, setScreen] = useState<Screen>("panel");
  const [rol, setRol] = useState<Rol>("ejecutivo");
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncRunId, setSyncRunId] = useState(0);
  const [detalleTipo, setDetalleTipo] = useState<DetalleTipo>("compromiso");
  const [detalleIdCredito, setDetalleIdCredito] = useState("3350049");
  const [detalleSolcob, setDetalleSolcob] = useState<string | null>(null);

  // La ficha de detalle (screen "compromiso") es compartida por Compromisos y
  // Pagos: quien navega hacia ella indica de cuál de las dos se trata, y de qué
  // ID de crédito, para que la ficha muestre los datos de ESE compromiso.
  const abrirDetalle = (tipo: DetalleTipo, idCredito: string, solcob: string | null = null) => {
    setDetalleTipo(tipo);
    setDetalleIdCredito(idCredito);
    setDetalleSolcob(solcob);
    setScreen("compromiso");
  };

  // Click en una fila de la cartera (Panel o Compromisos): si ya está Comprometido
  // muestra la ficha rica; si está Sin compromiso o Pendiente, lleva a crearlo,
  // pasando igual el ID de crédito para que esa pantalla muestre al cliente correcto.
  const abrirCompromiso = (item: { id: string; estado: string }) => {
    if (item.estado === "COMPROMETIDO") {
      abrirDetalle("compromiso", item.id);
    } else {
      setDetalleIdCredito(item.id);
      setScreen("compromiso_nuevo");
    }
  };

  const startSync = () => {
    setSyncOpen(true);
    setSyncRunId((current) => current + 1);
  };

  const retrySync = () => {
    setSyncRunId((current) => current + 1);
  };

  const changeRol = (newRol: Rol) => {
    setRol(newRol);
    if (newRol === "supervisor" && EJECUTIVO_SCREENS.includes(screen)) setScreen("panel");
    if (newRol === "ejecutivo" && SUPERVISOR_SCREENS.includes(screen)) setScreen("panel");
  };

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />;

  return (
    <>
      <Shell screen={screen} rol={rol} navigate={setScreen} onChangeRol={changeRol} onLogout={() => setLoggedIn(false)}>
        {screen === "panel"            && <Panel            rol={rol} navigate={setScreen} onSync={startSync} abrirDetalle={abrirDetalle} abrirCompromiso={abrirCompromiso} />}
        {screen === "buscar"           && <Buscar            navigate={setScreen} onSync={startSync} abrirCompromiso={abrirCompromiso} />}
        {screen === "compromiso_nuevo" && <CompromisoNuevo   idCredito={detalleIdCredito} navigate={setScreen} />}
        {screen === "compromiso"       && <CompromisoDetalle navigate={setScreen} tipo={detalleTipo} idCredito={detalleIdCredito} solcob={detalleSolcob} />}
        {screen === "pagos"            && <PagosEnviados     navigate={setScreen} onSync={startSync} abrirDetalle={abrirDetalle} />}
        {screen === "comprobante"      && <Comprobante       navigate={setScreen} idCredito={detalleIdCredito} />}
        {screen === "matching"         && <Matching          navigate={setScreen} />}
        {screen === "cuadratura"       && <Cuadratura        navigate={setScreen} abrirDetalle={abrirDetalle} idCredito={detalleIdCredito} />}
        {screen === "excepciones"      && <Excepciones />}
        {screen === "auditoria"        && <Auditoria />}
      </Shell>
      <ProgressModal
        open={syncOpen}
        runId={syncRunId}
        title="Sincronizando datos"
        warningText="no cierres esta ventana mientras se realiza la sincronización."
        steps={rol === "supervisor" ? SYNC_STEPS_SUPERVISOR : SYNC_STEPS_EJECUTIVO}
        resumen={SYNC_RESUMEN}
        onClose={() => setSyncOpen(false)}
        onRetry={retrySync}
      />
    </>
  );
}

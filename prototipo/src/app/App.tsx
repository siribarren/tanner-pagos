import { useMemo, useState } from "react";
import { Shell } from "./Shell";
import { CARTERA_EJECUTIVO, type CarteraItem } from "./data";
import { ProgressModal, type ProgressStep } from "./ProgressModal";
import type { DetalleTipo, Rol, Screen } from "./types";
import { Login } from "./screens/Login";
import { Panel } from "./screens/Panel";
import { Buscar, type SituacionFiltro } from "./screens/Buscar";
import { CompromisoNuevo } from "./screens/CompromisoNuevo";
import { CompromisoDetalle } from "./screens/CompromisoDetalle";
import { PagosEnviados, type EstadoFiltro } from "./screens/PagosEnviados";
import { Comprobante } from "./screens/Comprobante";
import { Matching } from "./screens/Matching";
import { Cuadratura } from "./screens/Cuadratura";
import { Excepciones } from "./screens/Excepciones";
import { Auditoria } from "./screens/Auditoria";
import { Sincronizacion, type SincronizacionEvento } from "./screens/Sincronizacion";

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
  const [historialSincronizaciones, setHistorialSincronizaciones] = useState<SincronizacionEvento[]>([]);
  const [detalleTipo, setDetalleTipo] = useState<DetalleTipo>("compromiso");
  const [detalleIdCredito, setDetalleIdCredito] = useState("3350049");
  const [detalleSolcob, setDetalleSolcob] = useState<string | null>(null);

  // Filtros iniciales de Compromisos/Pagos al llegar desde las cards de "Mi
  // Escritorio" (p. ej. "Pagos rechazados" → Pagos filtrado por Rechazada). Se
  // resetean a "todos" en cualquier otra navegación para que no queden pegados.
  const [compromisoFiltroInicial, setCompromisoFiltroInicial] = useState("todos");
  const [pagoFiltroInicial, setPagoFiltroInicial] = useState("todos");

  // Overrides de cartera creados en esta sesión (ejemplos de interacción: al
  // crear un compromiso, la fila de "Mi cartera"/"Compromisos" pasa a
  // Comprometido con su monto/cuotas/pago/situación reales). Vive solo en
  // memoria — no se persiste — así que se pierde al recargar o reiniciar la
  // plataforma, volviendo la cartera a su estado de ejemplo original.
  const [comprometidosSesion, setComprometidosSesion] = useState<Record<string, Omit<CarteraItem, "id" | "rut" | "cliente" | "estado">>>({});
  const cartera = useMemo(
    () => CARTERA_EJECUTIVO.map((item) =>
      comprometidosSesion[item.id] ? { ...item, estado: "COMPROMETIDO" as const, ...comprometidosSesion[item.id] } : item
    ),
    [comprometidosSesion]
  );
  const registrarCompromisoSesion = (id: string, datos: Omit<CarteraItem, "id" | "rut" | "cliente" | "estado">) => {
    setComprometidosSesion((prev) => ({ ...prev, [id]: datos }));
  };

  // Navegación genérica: siempre resetea los filtros iniciales de Compromisos/
  // Pagos a "todos", para que solo queden aplicados justo al entrar desde una
  // card de "Mi Escritorio" (ver irACompromisos/irAPagos más abajo).
  const navigate = (s: Screen) => {
    setCompromisoFiltroInicial("todos");
    setPagoFiltroInicial("todos");
    setScreen(s);
  };

  const irACompromisos = (situacion: string) => {
    setCompromisoFiltroInicial(situacion);
    setScreen("buscar");
  };

  const irAPagos = (estado: string) => {
    setPagoFiltroInicial(estado);
    setScreen("pagos");
  };

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

  // Registra cada sincronización (exitosa o fallida) en el historial que muestra
  // la pantalla "Sincronización" del menú lateral.
  const registrarSincronizacion = (estado: SincronizacionEvento["estado"]) => {
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
    const hora = ahora.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });
    setHistorialSincronizaciones((prev) => [{ fecha, hora, estado }, ...prev]);
  };

  const changeRol = (newRol: Rol) => {
    setRol(newRol);
    if (newRol === "supervisor" && EJECUTIVO_SCREENS.includes(screen)) setScreen("panel");
    if (newRol === "ejecutivo" && SUPERVISOR_SCREENS.includes(screen)) setScreen("panel");
  };

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />;

  return (
    <>
      <Shell screen={screen} rol={rol} navigate={navigate} onChangeRol={changeRol} onLogout={() => setLoggedIn(false)}>
        {screen === "panel"            && <Panel            rol={rol} cartera={cartera} navigate={navigate} onSync={startSync} abrirDetalle={abrirDetalle} abrirCompromiso={abrirCompromiso} irACompromisos={irACompromisos} irAPagos={irAPagos} />}
        {screen === "buscar"           && <Buscar            cartera={cartera} navigate={navigate} onSync={startSync} abrirCompromiso={abrirCompromiso} filtroSituacionInicial={compromisoFiltroInicial as SituacionFiltro} />}
        {screen === "compromiso_nuevo" && <CompromisoNuevo   idCredito={detalleIdCredito} navigate={navigate} onCompromisoCreado={registrarCompromisoSesion} />}
        {screen === "compromiso"       && <CompromisoDetalle navigate={navigate} tipo={detalleTipo} idCredito={detalleIdCredito} solcob={detalleSolcob} />}
        {screen === "pagos"            && <PagosEnviados     navigate={navigate} onSync={startSync} abrirDetalle={abrirDetalle} filtroEstadoInicial={pagoFiltroInicial as EstadoFiltro} />}
        {screen === "comprobante"      && <Comprobante       navigate={navigate} idCredito={detalleIdCredito} />}
        {screen === "matching"         && <Matching          navigate={navigate} />}
        {screen === "cuadratura"       && <Cuadratura        navigate={navigate} abrirDetalle={abrirDetalle} idCredito={detalleIdCredito} />}
        {screen === "excepciones"      && <Excepciones />}
        {screen === "auditoria"        && <Auditoria />}
        {screen === "sincronizacion"   && <Sincronizacion    historial={historialSincronizaciones} onSync={startSync} />}
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
        onSuccess={() => registrarSincronizacion("COMPLETADA")}
        onError={() => registrarSincronizacion("FALLIDA")}
      />
    </>
  );
}

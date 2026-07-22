export type Screen =
  | "login"
  | "panel"
  | "buscar"
  | "compromiso_nuevo"
  | "compromiso"
  | "pagos"
  | "comprobante"
  | "matching"
  | "cuadratura"
  | "excepciones"
  | "auditoria"
  | "sincronizacion";

export type Rol = "ejecutivo" | "supervisor";

// La ficha de detalle (screen "compromiso") sirve tanto para un Compromiso como
// para un Pago ya enviado; "pago" agrega la línea de la solicitud SOLCOB.
export type DetalleTipo = "compromiso" | "pago";

export type SyncMode = "idle" | "running" | "error" | "success";

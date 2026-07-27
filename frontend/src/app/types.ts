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

export type EstadoCargaPagos = "cargando" | "listo" | "error";

export type SyncMode = "idle" | "running" | "error" | "success";

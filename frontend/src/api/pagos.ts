import { apiClient } from "./client";
import type { components } from "./schema";

export type Pago = components["schemas"]["Pago"];
export type PagoTransferencia = components["schemas"]["PagoTransferencia"];
export type PagoCuota = components["schemas"]["PagoCuota"];

export type PagoEnviado = components["schemas"]["PagoEnviado"];
export type PagoAnalisis = components["schemas"]["PagoAnalisis"];
export type PagoConfirmar = components["schemas"]["PagoConfirmar"];
export type SolicitudFlokzu = components["schemas"]["SolicitudFlokzu"];
export type CuadraturaCheck = components["schemas"]["CuadraturaCheck"];
export type ImputacionPropuesta = components["schemas"]["ImputacionPropuesta"];

export const TIPOS_COMPROBANTE = ["image/png", "image/jpeg", "application/pdf"];
export const MAX_COMPROBANTES = 15;

export const TIPO_PAGO_FLOKZU: Record<SolicitudFlokzu["tipo_pago"], string> = {
  pago_total: "Pago total",
  put_cuotas: "PUT en cuotas",
};

// El backend une los comprobantes en un solo PDF (una página por imagen, los PDF
// tal cual vienen), lo pasa por DocumentAI + IA y devuelve la cuadratura propuesta.
// No guarda nada: eso ocurre recién en confirmarPago.
export async function analizarComprobantes(creditoId: string, imagenes: File[]): Promise<PagoAnalisis> {
  const { data, error } = await apiClient.POST("/api/cartera/{id}/pago/analizar/", {
    params: { path: { id: Number(creditoId) } },
    body: { imagenes: imagenes as unknown as string[] },
    bodySerializer(body) {
      const formData = new FormData();
      for (const imagen of body.imagenes as unknown as File[]) formData.append("imagenes", imagen);
      return formData;
    },
  });
  if (error || !data) throw new Error(mensajeError(error));
  return data;
}

// Persiste el pago que el ejecutivo revisó y corrigió en el formulario de Flokzu.
export async function confirmarPago(creditoId: string, solicitud: PagoConfirmar): Promise<Pago> {
  const { data, error } = await apiClient.POST("/api/cartera/{id}/pago/", {
    params: { path: { id: Number(creditoId) } },
    body: solicitud,
  });
  if (error || !data) throw new Error(mensajeError(error));
  return data;
}

// Los pagos ya enviados al mandante, del más reciente al más antiguo.
export async function getPagosEnviados(): Promise<PagoEnviado[]> {
  const { data, error } = await apiClient.GET("/api/pagos/");
  if (error || !data) throw new Error("No fue posible cargar los pagos enviados");
  return data;
}

// El PDF va detrás del JWT (son comprobantes de clientes), y un <iframe> no puede mandar el header
// Authorization: se descarga con fetch y se entrega como blob URL para incrustarlo o abrirlo.
export async function urlComprobante(creditoId: string, archivo: string): Promise<string> {
  const base = import.meta.env.VITE_API_BASE_URL ?? "";
  const respuesta = await fetch(
    `${base}/api/cartera/${Number(creditoId)}/comprobante/?archivo=${encodeURIComponent(archivo)}`,
    { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken") ?? ""}` } },
  );
  if (!respuesta.ok) throw new Error("No fue posible abrir el comprobante.");
  return URL.createObjectURL(await respuesta.blob());
}

// DRF responde {campo: ["mensaje"]}; mostramos el primer mensaje que venga.
function mensajeError(error: unknown): string {
  const detalles = Object.values((error ?? {}) as Record<string, unknown>).flat();
  const mensaje = detalles.find((detalle) => typeof detalle === "string");
  return typeof mensaje === "string" ? mensaje : "No fue posible procesar los comprobantes";
}

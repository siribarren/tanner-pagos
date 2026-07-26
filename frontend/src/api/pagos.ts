import { apiClient } from "./client";
import type { components } from "./schema";

export type Pago = components["schemas"]["Pago"];
export type PagoTransferencia = components["schemas"]["PagoTransferencia"];
export type PagoCuota = components["schemas"]["PagoCuota"];

export const TIPOS_COMPROBANTE = ["image/png", "image/jpeg", "application/pdf"];
export const MAX_COMPROBANTES = 15;

// El backend une los comprobantes en un solo PDF (una página por imagen, los PDF
// tal cual vienen), lo pasa por DocumentAI + IA y devuelve el pago con el detalle
// de cada transferencia y su imputación.
export async function cargarComprobantes(creditoId: string, imagenes: File[]): Promise<Pago> {
  const { data, error } = await apiClient.POST("/api/cartera/{id}/pago/", {
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

// DRF responde {campo: ["mensaje"]}; mostramos el primer mensaje que venga.
function mensajeError(error: unknown): string {
  const detalles = Object.values((error ?? {}) as Record<string, unknown>).flat();
  const mensaje = detalles.find((detalle) => typeof detalle === "string");
  return typeof mensaje === "string" ? mensaje : "No fue posible procesar los comprobantes";
}

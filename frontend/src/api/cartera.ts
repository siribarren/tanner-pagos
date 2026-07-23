import { apiClient } from "./client";
import type { paths } from "./schema";

type ListResponse = paths["/api/cartera/"]["get"]["responses"][200]["content"]["application/json"];
type DetailResponse = paths["/api/cartera/{id}/"]["get"]["responses"][200]["content"]["application/json"];

export type CarteraItem = {
  id: string;
  rut: string;
  cliente: string;
  estado?: "SIN_COMPROMISO" | "COMPROMETIDO" | "PAGADO";
  monto: number;
  cuotas: number;
  fechaContacto?: string;
  fechaCompromiso?: string;
  fechaPago?: string;
  pago?: "TOTAL" | "PARCIAL";
  situacion?: "SITUACION_PENDIENTE" | "SITUACION_VALIDADO";
};

export type CarteraDetalle = DetailResponse;

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatDate(value: string | null): string | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return `${String(day).padStart(2, "0")}-${MESES[month - 1]}`;
}

function statusKey(value: string | null | undefined): string | undefined {
  return value?.toUpperCase();
}

function situationKey(value: string | null | undefined): CarteraItem["situacion"] {
  const key = statusKey(value);
  return key ? (`SITUACION_${key}` as CarteraItem["situacion"]) : undefined;
}

function toCarteraItem(item: ListResponse[number]): CarteraItem {
  return {
    id: String(item.id),
    rut: item.rut,
    cliente: item.cliente,
    estado: statusKey(item.estado) as CarteraItem["estado"],
    monto: item.monto,
    cuotas: item.cuotas,
    fechaContacto: formatDate(item.fecha_contacto),
    fechaCompromiso: formatDate(item.fecha_compromiso),
    fechaPago: formatDate(item.fecha_pago),
    pago: statusKey(item.pago) as CarteraItem["pago"],
    situacion: situationKey(item.situacion),
  };
}

export async function getCartera(): Promise<CarteraItem[]> {
  const { data, error } = await apiClient.GET("/api/cartera/");
  if (error) throw new Error("No fue posible cargar la cartera");
  return (data ?? []).map(toCarteraItem);
}

export async function getCarteraDetalle(creditoId: string): Promise<CarteraDetalle> {
  const { data, error } = await apiClient.GET("/api/cartera/{id}/", {
    params: { path: { id: Number(creditoId) } },
  });
  if (error || !data) throw new Error("No fue posible cargar el detalle del crédito");
  return data;
}

export type CrmFila = paths["/api/cartera/{id}/contacto/"]["post"]["responses"][200]["content"]["application/json"];

export async function guardarFechaContacto(creditoId: string, fechaContacto: string): Promise<CrmFila> {
  const { data, error } = await apiClient.POST("/api/cartera/{id}/contacto/", {
    params: { path: { id: Number(creditoId) } },
    body: { fecha_contacto: fechaContacto },
  });
  if (error || !data) throw new Error("No fue posible guardar la fecha de contacto");
  return data;
}

export type CrearCompromisoInput = {
  fecha_compromiso: string;
  canal_contacto: "telefono" | "whatsapp" | "presencial";
  monto: number;
  cuota_ids: number[];
};

export async function crearCompromiso(creditoId: string, input: CrearCompromisoInput): Promise<CrmFila> {
  const { data, error } = await apiClient.POST("/api/cartera/{id}/compromiso/", {
    params: { path: { id: Number(creditoId) } },
    body: input,
  });
  if (error || !data) throw new Error("No fue posible crear el compromiso");
  return data;
}

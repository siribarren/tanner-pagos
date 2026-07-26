from datetime import date

from pydantic import BaseModel, Field


class TokenInfo(BaseModel):
    input_tokens: int
    thoughts_tokens: int
    output_token: int
    total_tokens: int

class TransferenciaResponse(BaseModel):
    orden: int
    monto: int
    fecha: date | None
    cuenta_destino: str | None
    banco: str | None
    n_operacion: str | None

class PagoResponse(BaseModel):
    pago_total: int
    fecha_pago: date
    cuenta_destino: str | None
    cuentas_distintas: bool
    transferencias: list[TransferenciaResponse]

class CantidadTransferenciasResponse(BaseModel):
    cantidad: int
    evidencia: str = Field(max_length=100)
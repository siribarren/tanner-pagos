from pydantic import BaseModel, Field


class TokenInfo(BaseModel):
    input_tokens: int
    thoughts_tokens: int
    output_token: int
    total_tokens: int

class PagoResponse(BaseModel):
    mmm: str #...

class CantidadTransferenciasResponse(BaseModel):
    cantidad: int
    evidencia: str = Field(max_length=100)
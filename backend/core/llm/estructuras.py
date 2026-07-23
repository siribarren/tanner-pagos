from pydantic import BaseModel


class TokenInfo(BaseModel):
    input_tokens: int
    thoughts_tokens: int
    output_token: int
    total_tokens: int

class PagoResponse(BaseModel):
    mmm: str #...
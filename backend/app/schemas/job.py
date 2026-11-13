from pydantic import BaseModel


class JobOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    type: str
    status: str
    result: dict | None
    error: str | None
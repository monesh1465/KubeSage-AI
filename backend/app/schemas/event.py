from pydantic import BaseModel


class EventResponse(BaseModel):
    namespace: str
    reason: str
    message: str
    type: str
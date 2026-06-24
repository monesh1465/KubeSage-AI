from pydantic import BaseModel


class NodeResponse(BaseModel):
    name: str
    status: str
    version: str
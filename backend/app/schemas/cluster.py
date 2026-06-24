from pydantic import BaseModel


class ClusterCreate(BaseModel):
    name: str
    description: str | None = None


class ClusterResponse(BaseModel):
    id: int
    name: str
    description: str | None
    status: str

    class Config:
        from_attributes = True
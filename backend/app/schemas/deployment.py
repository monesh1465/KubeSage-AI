from pydantic import BaseModel


class DeploymentResponse(BaseModel):
    name: str
    namespace: str
    desired: int
    available: int
    status: str
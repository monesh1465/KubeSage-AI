from pydantic import BaseModel


class ClusterCreate(BaseModel):
    name: str
    description: str | None = None


class ClusterResponse(BaseModel):
    id: int
    name: str
    description: str | None
    status: str
    latest_investigation_status: str | None = None
    latest_investigation_issue_count: int | None = None
    latest_investigation_summary: str | None = None

    class Config:
        from_attributes = True
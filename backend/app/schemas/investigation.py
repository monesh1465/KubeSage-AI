from pydantic import BaseModel
from datetime import datetime


class IssueResponse(BaseModel):
    type: str
    resource: str
    namespace: str
    severity: str
    recommendation: str


class InvestigationResponse(BaseModel):
    id: int
    cluster_status: str
    issues: list[IssueResponse]
    summary: str
    started_at: datetime | None = None
    completed_at: datetime | None = None
    duration_seconds: float | None = None
    cluster_id: int | None = None
    cluster_name: str | None = None
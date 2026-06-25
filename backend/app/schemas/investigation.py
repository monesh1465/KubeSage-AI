from pydantic import BaseModel
from datetime import datetime


class IssueResponse(BaseModel):
    type: str
    resource: str
    namespace: str
    severity: str
    recommendation: str


class InvestigationResponse(BaseModel):
    cluster_status: str
    issues: list[IssueResponse]
    summary: str
    started_at: datetime | None = None
    completed_at: datetime | None = None
    duration_seconds: float | None = None
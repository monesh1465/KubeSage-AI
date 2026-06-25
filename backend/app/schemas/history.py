from pydantic import BaseModel
from datetime import datetime


class InvestigationHistoryResponse(
    BaseModel
):
    id: int
    status: str
    summary: str
    issues: str
    started_at: datetime | None = None
    completed_at: datetime | None = None
    duration_seconds: float | None = None
    created_at: datetime

    class Config:
        from_attributes = True
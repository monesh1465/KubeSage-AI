from pydantic import BaseModel
from datetime import datetime


class InvestigationHistoryResponse(
    BaseModel
):
    id: int
    status: str
    summary: str
    issues: str
    created_at: datetime

    class Config:
        from_attributes = True
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class AIAnalysisResponse(BaseModel):
    """Full AI analysis record returned from the database."""

    id: int
    investigation_id: int
    analysis: str
    model: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    duration_seconds: float | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AIAnalysisHistoryItem(BaseModel):
    """Lightweight record for the history list — does not include full analysis text."""

    id: int
    model: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    duration_seconds: float | None = None
    created_at: datetime

    model_config = {"from_attributes": True}

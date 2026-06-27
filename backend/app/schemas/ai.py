# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field
from typing import Any


# --------------------------------------------------------------------------- #
#  Request                                                                      #
# --------------------------------------------------------------------------- #

class IssueInput(BaseModel):
    """A single issue emitted by the rule-based engine."""
    type: str
    resource: str
    namespace: str | None = None
    severity: str | None = None
    recommendation: str | None = None


class AIAnalyzeRequest(BaseModel):
    """
    Payload sent by the client to POST /api/ai/analyze.

    investigation_data mirrors the shape returned by the rule-based engine so
    that the caller can forward the result directly without reshaping it.
    """
    cluster_name: str = Field(
        default="Unknown Cluster",
        description="Human-readable cluster identifier."
    )
    cluster_status: str = Field(
        ...,
        description="Overall cluster health: 'Healthy', 'Warning', or 'Critical'."
    )
    summary: str = Field(
        ...,
        description="One-line summary produced by the rule engine."
    )
    issues: list[IssueInput] = Field(
        default_factory=list,
        description="List of issues detected by the rule engine."
    )
    duration_seconds: float | None = Field(
        default=None,
        description="How long the investigation took (seconds)."
    )

# --------------------------------------------------------------------------- #
#  Response                                                                     #
# --------------------------------------------------------------------------- #

class AIAnalyzeResponse(BaseModel):
    """Response returned by POST /api/ai/analyze and POST /api/ai/investigation/{id}."""
    id: int | None = Field(
        default=None,
        description="Database ID of the persisted analysis record (None for ad-hoc calls)."
    )
    analysis: str = Field(
        ...,
        description="Markdown-formatted AI analysis and remediation guidance."
    )
    model: str = Field(
        ...,
        description="The Ollama model that produced the analysis."
    )
    prompt_tokens: int | None = Field(
        default=None,
        description="Number of prompt tokens consumed (if reported by the model)."
    )
    completion_tokens: int | None = Field(
        default=None,
        description="Number of completion tokens generated (if reported by the model)."
    )
    duration_seconds: float | None = Field(
        default=None,
        description="Wall-clock time in seconds for AI generation."
    )
    generated_at: str | None = Field(
        default=None,
        description="Timestamp when the analysis was generated."
    )


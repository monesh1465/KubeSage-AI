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


# --------------------------------------------------------------------------- #
#  Chat — context-aware Q&A                                                     #
# --------------------------------------------------------------------------- #

class ChatHistoryMessage(BaseModel):
    """A single prior turn in the conversation history."""
    role: str  # 'user' or 'assistant'
    content: str


class AIChatRequest(BaseModel):
    """Payload for POST /api/ai/chat — a single user turn with full investigation context."""
    message: str = Field(..., description="The user's question or message.")
    history: list[ChatHistoryMessage] = Field(
        default_factory=list,
        description="Previous turns in the conversation (oldest first, excluding current message)."
    )
    investigation_id: int | None = Field(
        default=None,
        description="ID of the investigation being discussed."
    )
    cluster_name: str = Field(default="Unknown Cluster")
    status: str = Field(default="Unknown")
    namespace: str = Field(default="")
    summary: str = Field(default="")
    findings: list[dict] = Field(default_factory=list)
    commands: list[str] = Field(default_factory=list)
    ai_report: str = Field(default="")
    issue_counts: dict = Field(default_factory=dict)


class AIChatResponse(BaseModel):
    """Response from POST /api/ai/chat."""
    reply: str = Field(..., description="The AI assistant's response in markdown.")
    model: str = Field(..., description="Model used for this reply.")
    prompt_tokens: int | None = None
    completion_tokens: int | None = None



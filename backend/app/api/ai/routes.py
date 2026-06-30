"""
app/api/ai/routes.py
====================
AI analysis endpoints for KubeSage AI.

Endpoints
---------
POST /api/ai/investigation/{investigation_id}  — generate & save
GET  /api/ai/investigation/{investigation_id}  — get latest saved analysis
GET  /api/ai/history/{investigation_id}        — list all saved analyses
POST /api/ai/analyze                           — ad-hoc (no persistence)
GET  /api/ai/health                            — Ollama health check
"""
from __future__ import annotations

import json
import logging

import ollama
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.investigation import Investigation
from app.models.investigation_run import InvestigationRun
from app.models.cluster import Cluster
from app.schemas.ai import AIAnalyzeRequest, AIAnalyzeResponse, AIChatRequest, AIChatResponse, ChatHistoryMessage, AIAssistantRequest, AIAssistantResponse
from app.schemas.ai_analysis import AIAnalysisResponse, AIAnalysisHistoryItem
from app.services.ai_service import ai_service
from app.services.ai_analysis_service import save_analysis, get_latest, get_history

router = APIRouter(prefix="/api/ai", tags=["AI"])
logger = logging.getLogger("kubesage.ai_routes")


# --------------------------------------------------------------------------- #
#  Helpers                                                                      #
# --------------------------------------------------------------------------- #

def _load_investigation(db: Session, investigation_id: int):
    """Fetch investigation + cluster + duration; raise 404 if not found."""
    investigation = (
        db.query(Investigation)
        .filter(Investigation.id == investigation_id)
        .first()
    )
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")

    cluster = db.query(Cluster).filter(Cluster.id == investigation.cluster_id).first()
    cluster_name = cluster.name if cluster else "Unknown Cluster"

    run = (
        db.query(InvestigationRun)
        .filter(InvestigationRun.investigation_id == investigation_id)
        .first()
    )
    duration_seconds = run.duration_seconds if run else None

    try:
        issues = json.loads(investigation.issues) if investigation.issues else []
    except Exception:
        issues = []

    return {
        "cluster_name": cluster_name,
        "cluster_status": investigation.status,
        "summary": investigation.summary,
        "issues": issues,
        "duration_seconds": duration_seconds,
    }


# --------------------------------------------------------------------------- #
#  POST /api/ai/investigation/{id}  — generate & persist                       #
# --------------------------------------------------------------------------- #

@router.post(
    "/investigation/{investigation_id}",
    response_model=AIAnalyzeResponse,
    summary="Generate and save AI analysis for an investigation",
    status_code=status.HTTP_200_OK,
)
def analyze_investigation(
    investigation_id: int,
    db: Session = Depends(get_db),
) -> AIAnalyzeResponse:
    """Generate a new AI analysis, persist it to the database, and return it.
    If an AI report already exists for this investigation, returns it instead."""
    logger.info("POST /api/ai/investigation/%d — generating AI analysis", investigation_id)

    # 1. Check whether an AI report already exists
    existing = get_latest(db, investigation_id)
    if existing:
        logger.info("AI analysis already exists for investigation %d. Returning cached report.", investigation_id)
        return AIAnalyzeResponse(
            id=existing.id,
            analysis=existing.analysis,
            model=existing.model,
            prompt_tokens=existing.prompt_tokens,
            completion_tokens=existing.completion_tokens,
            duration_seconds=existing.duration_seconds,
            generated_at=existing.created_at.isoformat(),
        )

    investigation_data = _load_investigation(db, investigation_id)

    try:
        result = ai_service.generate_summary(investigation_data)
        logger.info("AI analysis generated for investigation %d", investigation_id)
    except RuntimeError as exc:
        logger.error("AI analysis failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error in AI analysis: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while generating the AI analysis.",
        ) from exc

    # Persist the result
    record = save_analysis(db, investigation_id, result)

    return AIAnalyzeResponse(
        id=record.id,
        analysis=record.analysis,
        model=record.model,
        prompt_tokens=record.prompt_tokens,
        completion_tokens=record.completion_tokens,
        duration_seconds=record.duration_seconds,
        generated_at=record.created_at.isoformat(),
    )


# --------------------------------------------------------------------------- #
#  GET /api/ai/investigation/{id}  — saved analysis                            #
# --------------------------------------------------------------------------- #

@router.get(
    "/investigation/{investigation_id}",
    response_model=AIAnalysisResponse,
    summary="Get the saved AI analysis for an investigation",
    status_code=status.HTTP_200_OK,
)
def get_latest_analysis(
    investigation_id: int,
    db: Session = Depends(get_db),
) -> AIAnalysisResponse:
    """Return the generated and saved analysis. 404 if none exists."""
    logger.info("GET /api/ai/investigation/%d", investigation_id)

    # Ensure the investigation exists
    exists = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not exists:
        raise HTTPException(status_code=404, detail="Investigation not found")

    record = get_latest(db, investigation_id)
    if not record:
        raise HTTPException(
            status_code=404,
            detail="No AI analysis found for this investigation",
        )

    return record



# --------------------------------------------------------------------------- #
#  POST /api/ai/analyze  — ad-hoc analysis (no persistence)                   #
# --------------------------------------------------------------------------- #

@router.post(
    "/analyze",
    response_model=AIAnalyzeResponse,
    summary="Ad-hoc AI cluster analysis (not persisted)",
    status_code=status.HTTP_200_OK,
)
def analyze_cluster(payload: AIAnalyzeRequest) -> AIAnalyzeResponse:
    """Generate analysis from a raw payload — for direct API use, not persisted."""
    logger.info(
        "POST /api/ai/analyze | cluster=%s status=%s issues=%d",
        payload.cluster_name,
        payload.cluster_status,
        len(payload.issues),
    )

    investigation_data = {
        "cluster_name": payload.cluster_name,
        "cluster_status": payload.cluster_status,
        "summary": payload.summary,
        "issues": [issue.model_dump() for issue in payload.issues],
        "duration_seconds": payload.duration_seconds,
    }

    try:
        result = ai_service.generate_summary(investigation_data)
    except RuntimeError as exc:
        logger.error("AI analysis failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error in AI analysis: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while generating the AI analysis.",
        ) from exc

    return AIAnalyzeResponse(
        analysis=result["analysis"],
        model=result["model"],
        prompt_tokens=result.get("prompt_tokens"),
        completion_tokens=result.get("completion_tokens"),
        duration_seconds=result.get("duration_seconds"),
        generated_at=result.get("generated_at"),
    )


# --------------------------------------------------------------------------- #
#  POST /api/ai/chat  — conversational context-aware Q&A                        #
# --------------------------------------------------------------------------- #

_CHAT_SYSTEM_PROMPT = """\
You are KubeSage AI, an experienced Kubernetes SRE helping a teammate.

Your guidelines:
- Respond conversationally. Avoid documentation-style or report-style responses.
- Keep answers concise and practical.
- Explain concepts first and provide commands only when needed.
- Limit excessive code blocks. Prefer the flow: Explanation ➔ Commands ➔ Conclusion.
- For general Kubernetes, Docker, Linux, or Cloud infrastructure questions (e.g. "What is Kubernetes?", "What is a Deployment?", "Explain Services"), answer them normally and connect the explanation back to the current investigation context whenever relevant.
- Do not use emojis.

Formatting rules:
- DO NOT use report-style headers like "## Root Cause", "## Recommendations", "## Evidence", "## Findings".
- Respond in short, clean paragraphs.
- Keep code blocks clean, wrapped in fenced code blocks:
  ```bash
  kubectl get pods
  ```
- If the user asks something completely outside SRE/DevOps/Linux/Cloud domains (like essays, maths, general programming in Python/Java unrelated to scripts/configs, current affairs), respond politely:
  "I'm KubeSage AI and I'm designed to help with Kubernetes troubleshooting, investigations, Docker, Linux, and cloud infrastructure questions. I may not be the best assistant for topics outside these areas."
"""


def _build_context_block(payload: AIChatRequest) -> str:
    """Build the investigation context block injected into the first user turn."""
    findings_lines = []
    if payload.findings:
        for i, f in enumerate(payload.findings, 1):
            line = (
                f"{i}. [{f.get('severity','?')}] {f.get('type','?')} — "
                f"resource: {f.get('resource','?')}, namespace: {f.get('namespace','-')}"
            )
            if f.get('recommendation'):
                line += f", fix: {f.get('recommendation')}"
            findings_lines.append(line)
        findings_text = "\n".join(findings_lines)
    else:
        findings_text = "No issues detected."

    commands_text = "\n".join(f"- {c}" for c in payload.commands) if payload.commands else "None"

    counts = payload.issue_counts or {}
    severity_text = ", ".join(f"{k}: {v}" for k, v in counts.items()) or "N/A"

    ai_report_excerpt = ""
    if payload.ai_report:
        excerpt = payload.ai_report[:1200]
        if len(payload.ai_report) > 1200:
            excerpt += "..."
        ai_report_excerpt = f"\n\nPrior AI Report Excerpt:\n{excerpt}"

    return (
        f"[INVESTIGATION CONTEXT — do not repeat this block verbatim in your reply]\n"
        f"Investigation ID: {payload.investigation_id or 'N/A'}\n"
        f"Cluster: {payload.cluster_name} | Status: {payload.status}\n"
        f"Namespace(s): {payload.namespace or 'N/A'}\n"
        f"Summary: {payload.summary or 'N/A'}\n"
        f"Issue counts: {severity_text}\n\n"
        f"Findings:\n{findings_text}\n\n"
        f"Recommended diagnostic commands:\n{commands_text}"
        f"{ai_report_excerpt}"
    )


_HEALTHY_INSTRUCTION = """
ADDITIONAL CONTEXT: The current cluster is healthy and no active issues are detected.
- Focus your answers on monitoring, cluster optimization, Kubernetes best practices, resource management, learning, and prevention of future incidents.
- Do not assume there are active failures or provide troubleshooting steps for non-existent issues.
"""


def _build_ollama_messages(payload: AIChatRequest) -> list[dict]:
    """
    Build the full Ollama messages list:
    [system] + [context injected into first user turn] + [history turns] + [current user message]
    """
    is_healthy = payload.status == "Healthy" or not payload.findings

    system_prompt = _CHAT_SYSTEM_PROMPT
    if is_healthy:
        system_prompt += "\n" + _HEALTHY_INSTRUCTION

    messages = [{"role": "system", "content": system_prompt}]

    context_block = _build_context_block(payload)

    if payload.history:
        # Prepend context to the very first user message in history
        first = payload.history[0]
        first_content = f"{context_block}\n\n---\n\n{first.content}"
        messages.append({"role": first.role, "content": first_content})
        for turn in payload.history[1:]:
            messages.append({"role": turn.role, "content": turn.content})
        # Current user message (no context re-injection)
        messages.append({"role": "user", "content": payload.message})
    else:
        # First ever message — inject context into this turn
        messages.append({
            "role": "user",
            "content": f"{context_block}\n\n---\n\n{payload.message}",
        })

    return messages


@router.post(
    "/chat",
    response_model=AIChatResponse,
    summary="Conversational context-aware Q&A for an investigation",
    status_code=status.HTTP_200_OK,
)
def chat_with_investigation(payload: AIChatRequest) -> AIChatResponse:
    """
    Accept a user message with investigation context and conversation history.
    Builds a multi-turn Ollama prompt for natural, conversational responses.
    """
    logger.info(
        "POST /api/ai/chat | inv=%s cluster=%s history_turns=%d",
        payload.investigation_id,
        payload.cluster_name,
        len(payload.history),
    )

    ollama_messages = _build_ollama_messages(payload)

    try:
        response = ollama.chat(
            model=ai_service.model,
            messages=ollama_messages,
        )
    except ollama.ResponseError as exc:
        logger.error("Ollama ResponseError in /chat: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI model returned an error: {exc}",
        ) from exc
    except Exception as exc:
        logger.error("Unexpected error in /chat: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reach AI model. Ensure Ollama is running. Detail: {exc}",
        ) from exc

    reply: str = response.message.content or ""
    prompt_tokens: int | None = getattr(response, "prompt_eval_count", None)
    completion_tokens: int | None = getattr(response, "eval_count", None)

    logger.info(
        "Chat reply generated | inv=%s tokens=%s/%s",
        payload.investigation_id, prompt_tokens, completion_tokens,
    )

    return AIChatResponse(
        reply=reply,
        model=ai_service.model,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
    )



# --------------------------------------------------------------------------- #
#  POST /api/ai/assistant  — global DevOps assistant (no investigation ctx)    #
# --------------------------------------------------------------------------- #

_ASSISTANT_SYSTEM_PROMPT = """\
You are KubeSage AI, an expert Kubernetes, Docker, Linux, Cloud, and DevOps assistant.

Your guidelines:
- Respond conversationally and naturally, like an experienced SRE helping a teammate.
- Keep answers concise and practical. Avoid documentation-style walls of text.
- Explain concepts clearly first, then provide commands or examples when helpful.
- Use fenced code blocks for shell commands and config snippets.
- Do not use emojis.
- Do not use report-style headers like "## Overview", "## Summary", "## Recommendations".

Domains you cover:
- Kubernetes (architecture, workloads, networking, storage, RBAC, Helm)
- Docker and container runtimes
- Linux (systemd, networking, filesystem, permissions)
- Cloud platforms (AWS, GCP, Azure)
- DevOps tools (Terraform, Helm, CI/CD pipelines)
- Observability (Prometheus, Grafana, OpenTelemetry)

Out-of-scope policy:
- If the user asks something completely outside these domains (math, essays, general programming unrelated to scripts/configs, current events), respond politely:
  "I'm KubeSage AI and I'm designed to help with Kubernetes, Docker, Linux, Cloud, and DevOps questions. I may not be the best assistant for topics outside these areas."
"""


@router.post(
    "/assistant",
    response_model=AIAssistantResponse,
    summary="Global Kubernetes and DevOps assistant (no investigation context)",
    status_code=status.HTTP_200_OK,
)
def global_assistant(payload: AIAssistantRequest) -> AIAssistantResponse:
    """
    Stateless global DevOps assistant.
    No investigation context — accepts a message and prior history only.
    """
    logger.info(
        "POST /api/ai/assistant | history_turns=%d",
        len(payload.history),
    )

    messages: list[dict] = [{"role": "system", "content": _ASSISTANT_SYSTEM_PROMPT}]

    for turn in payload.history:
        messages.append({"role": turn.role, "content": turn.content})

    messages.append({"role": "user", "content": payload.message})

    try:
        response = ollama.chat(
            model=ai_service.model,
            messages=messages,
        )
    except ollama.ResponseError as exc:
        logger.error("Ollama ResponseError in /assistant: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI model returned an error: {exc}",
        ) from exc
    except Exception as exc:
        logger.error("Unexpected error in /assistant: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reach AI model. Ensure Ollama is running. Detail: {exc}",
        ) from exc

    reply: str = response.message.content or ""
    prompt_tokens: int | None = getattr(response, "prompt_eval_count", None)
    completion_tokens: int | None = getattr(response, "eval_count", None)

    logger.info("Assistant reply generated | tokens=%s/%s", prompt_tokens, completion_tokens)

    return AIAssistantResponse(
        reply=reply,
        model=ai_service.model,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
    )


# --------------------------------------------------------------------------- #
#  GET /api/ai/health                                                           #
# --------------------------------------------------------------------------- #

@router.get("/health", summary="Ollama health check")
def ai_health():
    try:
        ollama.list()
        return {"status": "healthy", "model": "gemma4:31b-cloud"}
    except Exception:
        return {"status": "unavailable"}

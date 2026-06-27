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
from app.schemas.ai import AIAnalyzeRequest, AIAnalyzeResponse
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
#  GET /api/ai/health                                                           #
# --------------------------------------------------------------------------- #

@router.get("/health", summary="Ollama health check")
def ai_health():
    try:
        ollama.list()
        return {"status": "healthy", "model": "gemma4:31b-cloud"}
    except Exception:
        return {"status": "unavailable"}

"""
ai_service.py
=============
Completely isolated AI layer for KubeSage AI.

Responsibilities
----------------
- Accept structured investigation data from the rule-based engine.
- Build a rich, context-aware prompt.
- Call the cloud Ollama model (gemma4:31b-cloud).
- Return a markdown-formatted analysis string.

This module has NO imports from the rule engine or existing investigation code.
"""
from __future__ import annotations
from datetime import datetime

import logging
import textwrap
from typing import Any

# pyrefly: ignore [missing-import]
import ollama

# --------------------------------------------------------------------------- #
#  Logging                                                                      #
# --------------------------------------------------------------------------- #

logger = logging.getLogger("kubesage.ai_service")

# --------------------------------------------------------------------------- #
#  Constants                                                                    #
# --------------------------------------------------------------------------- #

_MODEL = "gemma4:31b-cloud"

_SYSTEM_PROMPT = textwrap.dedent("""\
    You are KubeSage AI, an automated Kubernetes cluster intelligence engine.
    Your audience is exclusively DevOps engineers, SREs, and Platform Engineers.

    Produce structured, concise, and actionable diagnostic reports.
    Mirror the output style of Datadog, Dynatrace Davis, and AWS Health Assistant.

    ---

    ## STRICT OUTPUT FORMAT

    Use plain uppercase headers — no emojis.

    ### EXECUTIVE SUMMARY

    Investigation completed successfully. No critical findings were detected. All cluster components are operating within expected parameters and no immediate remediation is required.

    ---

    ### FINDINGS

    * All Pods are in Running state and all Nodes are reporting Ready status.
    * No unhealthy workloads were detected during the investigation.
    * No CPU, memory, or scheduling pressure indicators were detected.
    * No resource pressure detected.
    * No failed pods detected.
    * No immediate operational risks identified.

    ---

    ### IMPACT ASSESSMENT

    No operational impact identified. The cluster is functioning within expected parameters and no service degradation was detected.

    ---

    ### RECOMMENDATIONS

    **Immediate Actions**
    - No immediate remediation required.

    **Short-Term Improvements**
    - Review resource requests and limits for all workloads to ensure predictable scheduling and prevent future resource contention.

    **Long-Term Preventive Measures**
    - Implement continuous monitoring and alerting to establish historical baselines and proactively identify abnormal behavior patterns.

    ---

    ### COMMANDS

    If the cluster is healthy, include the heading "Optional Verification Commands" and list minimal commands like:
    * kubectl get nodes
    * kubectl get pods -A
    * kubectl top nodes
    * kubectl top pods -A
    If there are warnings or critical issues, use the heading "Recommended Diagnostic Commands" and list diagnostic commands:
    * kubectl describe pod
    * kubectl logs
    * kubectl get events
    * kubectl describe node

    ---

    ## ABSOLUTE RULES

    - No emojis anywhere in the output.
    - No beginner analogies ("imagine a hotel", "like a restaurant", etc.).
    - No explanations of Kubernetes fundamentals.
    - No ChatGPT‑style preambles.
    - No filler phrases.
    - Never invent resource names, namespaces, or metrics not present in the report.
    - Never assume information not explicitly provided.
    - All kubectl commands must be wrapped in fenced code blocks.
    - Be direct, precise, and actionable.
""")


def _build_user_prompt(
    cluster_name: str,
    cluster_status: str,
    summary: str,
    issues: list[dict[str, Any]],
    duration_seconds: float | None,
) -> str:
    """Construct the user-turn prompt from investigation data."""

    duration_str = (
        f"{duration_seconds:.2f}s" if duration_seconds is not None else "N/A"
    )

    lines: list[str] = [
        f"# Cluster Investigation Report",
        f"",
        f"**Cluster**: {cluster_name}",
        f"**Overall Status**: {cluster_status}",
        f"**Summary**: {summary}",
        f"**Investigation Duration**: {duration_str}",
        f"",
    ]

    if not issues:
        lines.append("No issues were detected. The cluster appears healthy.")
    else:
        lines.append(f"## Detected Issues ({len(issues)} total)")
        lines.append("")

        for idx, issue in enumerate(issues, start=1):
            lines += [
                f"### Issue {idx}: {issue.get('type', 'Unknown')}",
                f"- **Resource**: `{issue.get('resource', 'N/A')}`",
                f"- **Namespace**: `{issue.get('namespace', 'N/A')}`",
                f"- **Severity**: {issue.get('severity', 'Unknown')}",
                f"- **Rule-engine Recommendation**: {issue.get('recommendation', 'N/A')}",
                "",
            ]

    lines.append(
        "Please analyse the above report and provide your expert assessment."
    )

    return "\n".join(lines)


# --------------------------------------------------------------------------- #
#  Service class                                                                #
# --------------------------------------------------------------------------- #

class AIService:
    """
    Thin wrapper around the Ollama Python client for KubeSage AI.

    Instantiation is cheap; no network calls are made at init time.
    A single instance can be shared across requests.
    """

    def __init__(self, model: str = _MODEL) -> None:
        self.model = model
        logger.info("AIService initialised with model=%s", self.model)

    # ---------------------------------------------------------------------- #

    def generate_summary(self, investigation_data: dict[str, Any]) -> dict[str, Any]:
        """
        Generate a markdown-formatted AI analysis from investigation data.

        Parameters
        ----------
        investigation_data : dict
            Keys expected:
                - cluster_name     (str, optional)
                - cluster_status   (str)
                - summary          (str)
                - issues           (list[dict])
                - duration_seconds (float | None, optional)

        Returns
        -------
        dict with keys:
            - analysis          (str)  — markdown-formatted response
            - model             (str)  — model name used
            - prompt_tokens     (int | None)
            - completion_tokens (int | None)
        """
        cluster_name = investigation_data.get("cluster_name", "Unknown Cluster")
        cluster_status = investigation_data.get("cluster_status", "Unknown")
        summary = investigation_data.get("summary", "")
        issues = investigation_data.get("issues", [])
        duration_seconds = investigation_data.get("duration_seconds")

        logger.info(
            "generate_summary called | cluster=%s status=%s issues=%d",
            cluster_name,
            cluster_status,
            len(issues),
        )

        user_prompt = _build_user_prompt(
            cluster_name=cluster_name,
            cluster_status=cluster_status,
            summary=summary,
            issues=issues,
            duration_seconds=duration_seconds,
        )
        logger.info(
    "AI request | cluster=%s | issues=%d",
    cluster_name,
    len(issues),
)       

        logger.debug("Sending prompt to Ollama model=%s", self.model)

        start_time = datetime.utcnow()
        try:
            response = ollama.chat(
                model=self.model,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
            )
            duration = (datetime.utcnow() - start_time).total_seconds()
            logger.info(
                "AI response generated successfully using model=%s in %.2f seconds",
                self.model,
                duration,
            )   
        except ollama.ResponseError as exc:
            logger.error(
                "Ollama ResponseError for model=%s: %s", self.model, exc
            )
            raise RuntimeError(
                f"AI model returned an error: {exc}"
            ) from exc
        except Exception as exc:
            logger.error(
                "Unexpected error calling Ollama model=%s: %s", self.model, exc
            )
            raise RuntimeError(
                f"Failed to reach the AI model. "
                f"Ensure Ollama is running and the model '{self.model}' is available. "
                f"Detail: {exc}"
            ) from exc

        # ------------------------------------------------------------------ #
        #  Extract content and optional token usage                           #
        # ------------------------------------------------------------------ #
        analysis: str = response.message.content or ""

        prompt_tokens: int | None = None
        completion_tokens: int | None = None

        if hasattr(response, "prompt_eval_count"):
            prompt_tokens = response.prompt_eval_count
        if hasattr(response, "eval_count"):
            completion_tokens = response.eval_count

        logger.info(
            "AI analysis generated | prompt_tokens=%s completion_tokens=%s",
            prompt_tokens,
            completion_tokens,
        )

        return {
            "analysis": analysis,
            "model": self.model,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "generated_at": datetime.utcnow().isoformat(),
            "duration_seconds": duration,
        }


# --------------------------------------------------------------------------- #
#  Module-level singleton (reused across FastAPI requests)                     #
# --------------------------------------------------------------------------- #

ai_service = AIService()

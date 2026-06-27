import json
import time
from datetime import datetime, timedelta, timezone

from app.models.investigation import Investigation
from app.models.investigation_run import InvestigationRun

from app.services.kubernetes_service import (
    get_cluster_nodes,
    get_cluster_pods,
    get_cluster_events,
    get_cluster_deployments
)


def normalize_resource_name(resource_name: str):
    if not resource_name or resource_name == "-":
        return "Unknown"

    parts = resource_name.split("-")
    if len(parts) >= 3 and len(parts[-1]) >= 5 and len(parts[-2]) >= 5:
        return "-".join(parts[:-2])

    return resource_name


def build_issue(
    issue_type: str,
    resource: str,
    namespace: str,
    severity: str,
    recommendation: str,
):
    return {
        "type": issue_type,
        "resource": normalize_resource_name(resource),
        "namespace": namespace,
        "severity": severity,
        "recommendation": recommendation,
    }


def investigate_cluster(
    db,
    cluster_id: int,
    kubeconfig_path: str
):
    started_at = datetime.now(timezone.utc)
    started_perf = time.perf_counter()
    issues = []

    nodes = get_cluster_nodes(
        kubeconfig_path
    )

    pods = get_cluster_pods(
        kubeconfig_path
    )

    events = get_cluster_events(
        kubeconfig_path
    )
    current_pods = {
    pod["name"]
    for pod in pods
    }

    deployments = get_cluster_deployments(
        kubeconfig_path
    )

    # Node checks
    for node in nodes:
        if node["status"] != "Ready":
            issues.append(
                build_issue(
                    "NodeNotReady",
                    node["name"],
                    "-",
                    "High",
                    "Check kubelet and node resources."
                )
            )

    # Pod checks
    for pod in pods:

        if pod["namespace"] == "kube-system":
            continue
        
        if pod["status"] == "Pending":
            issues.append(
                build_issue(
                    "PodPending",
                    pod["name"],
                    pod["namespace"],
                    "Medium",
                    "Check scheduling events."
                )
            )

        elif pod["status"] == "ImagePullBackOff":
            issues.append(
                build_issue(
                    "ImagePullBackOff",
                    pod["name"],
                    pod["namespace"],
                    "High",
                    "Verify image name and tag."
                )
            )

        elif pod["status"] == "ErrImagePull":
            issues.append(
                build_issue(
                    "ErrImagePull",
                    pod["name"],
                    pod["namespace"],
                    "High",
                    "Image could not be pulled. Check image repository and credentials."
                )
            )

        elif pod["status"] == "CrashLoopBackOff":
            issues.append(
                build_issue(
                    "CrashLoopBackOff",
                    pod["name"],
                    pod["namespace"],
                    "High",
                    "Check application logs, container startup commands, and probe failures."
                )
            )

        elif pod["status"] == "OOMKilled":
            issues.append(
                build_issue(
                    "OOMKilled",
                    pod["name"],
                    pod["namespace"],
                    "High",
                    "Increase memory limits or optimize application memory usage."
                )
            )

        # Rule 9
        if pod.get("restart_count", 0) > 5:
            issues.append(
                build_issue(
                    "HighRestartCount",
                    pod["name"],
                    pod["namespace"],
                    "High",
                    "Check logs and health probes."
                )
            )

    # Event checks
    for event in events:
        if event["namespace"] == "kube-system":
            continue

        if (
            event["kind"] == "Pod" 
            and event["resource"]
            not in current_pods
        ):
            continue
        
        if event["reason"] == "FailedScheduling":
            issues.append(
                build_issue(
                    "FailedScheduling",
                    event.get("resource") or "Unknown",
                    event["namespace"],
                    "High",
                    "Check CPU, memory, taints and node selectors."
                )
            )

        elif event["reason"] == "FailedMount":
            issues.append(
                build_issue(
                    "FailedMount",
                    event.get("resource") or "Unknown",
                    event["namespace"],
                    "High",
                    "Verify PVC and volume configuration."
                )
            )

    # Deployment checks
    for deployment in deployments:
        if deployment["namespace"] == "kube-system":
            continue
        if (
            deployment["desired"]
            != deployment["available"]
        ):
            issues.append(
                build_issue(
                    "ReplicaMismatch",
                    deployment["name"],
                    deployment["namespace"],
                    "Medium",
                    "Investigate deployment rollout."
                )
            )

    # Final summary
    if issues:
        if any(issue["severity"] == "High" for issue in issues):
            cluster_status = "Critical"
        else:
            cluster_status = "Warning"
        summary = f"{len(issues)} issue(s) detected."
    else:
        cluster_status = "Healthy"
        summary = "All nodes are Ready and all pods are Running."

    issues_json = json.dumps(issues, sort_keys=True)

    latest = (
        db.query(Investigation)
        .filter(Investigation.cluster_id == cluster_id)
        .order_by(Investigation.created_at.desc())
        .first()
    )

    should_insert = True

    investigation_id = latest.id if latest else None
    
    if should_insert:
        investigation = Investigation(
            cluster_id=cluster_id,
            status=cluster_status,
            summary=summary,
            issues=issues_json,
        )

        db.add(investigation)
        db.commit()
        db.refresh(investigation)

        completed_at = datetime.now(timezone.utc)
        duration_seconds = max(time.perf_counter() - started_perf, 0.0)

        run = InvestigationRun(
            investigation_id=investigation.id,
            cluster_id=cluster_id,
            started_at=started_at,
            completed_at=completed_at,
            duration_seconds=duration_seconds,
        )
        db.add(run)
        db.commit()
        
        investigation_id = investigation.id

    completed_at = datetime.now(timezone.utc)
    duration_seconds = max(time.perf_counter() - started_perf, 0.0)

    return {
        "cluster_status":
            cluster_status,
        "issues":
            issues,
        "summary":
            summary,
        "started_at": started_at,
        "completed_at": completed_at,
        "duration_seconds": duration_seconds,
        "id": investigation_id,
    }
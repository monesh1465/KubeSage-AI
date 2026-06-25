import json

from app.models.investigation import Investigation

from app.services.kubernetes_service import (
    get_cluster_nodes,
    get_cluster_pods,
    get_cluster_events,
    get_cluster_deployments
)


def investigate_cluster(
    db,
    cluster_id: int,
    kubeconfig_path: str
):
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
            issues.append({
                "type":
                    "NodeNotReady",
                "resource":
                    node["name"],
                "namespace":
                    "-",
                "severity":
                    "High",
                "recommendation":
                    "Check kubelet and node resources."
            })

    # Pod checks
    for pod in pods:

        if pod["namespace"] == "kube-system":
            continue
        
        if pod["status"] == "Pending":
            issues.append({
                "type":
                    "PodPending",
                "resource":
                    pod["name"],
                "namespace":
                    pod["namespace"],
                "severity":
                    "Medium",
                "recommendation":
                    "Check scheduling events."
            })

        elif pod["status"] == "ImagePullBackOff":
            issues.append({
                "type":
                    "ImagePullBackOff",
                "resource":
                    pod["name"],
                "namespace":
                    pod["namespace"],
                "severity":
                    "High",
                "recommendation":
                    "Verify image name and tag."
            })

        elif pod["status"] == "ErrImagePull":
            issues.append({
                "type":
                    "ErrImagePull",
                "resource":
                    pod["name"],
                "namespace":
                    pod["namespace"],
                "severity":
                    "High",
                "recommendation":
                    "Image could not be pulled. Check image repository and credentials."
            })

        elif pod["status"] == "CrashLoopBackOff":
            issues.append({
                "type":
                    "CrashLoopBackOff",
                "resource":
                    pod["name"],
                "namespace":
                    pod["namespace"],
                "severity":
                    "High",
                "recommendation":
                    "Check application logs and container startup commands."
            })

        elif pod["status"] == "OOMKilled":
            issues.append({
                "type":
                    "OOMKilled",
                "resource":
                    pod["name"],
                "namespace":
                    pod["namespace"],
                "severity":
                    "High",
                "recommendation":
                    "Increase memory limits or optimize application memory usage."
            })

        # Rule 9
        if pod.get("restart_count", 0) > 5:
            issues.append({
                "type":
                    "HighRestartCount",
                "resource":
                    pod["name"],
                "namespace":
                    pod["namespace"],
                "severity":
                    "High",
                "recommendation":
                    "Check logs and health probes."
            })

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
            issues.append({
                "type":
                    "FailedScheduling",
                "resource":
                    "-",
                "namespace":
                    event["namespace"],
                "severity":
                    "High",
                "recommendation":
                    "Check CPU, memory, taints and node selectors."
            })

        elif event["reason"] == "FailedMount":
            issues.append({
                "type":
                    "FailedMount",
                "resource":
                    "-",
                "namespace":
                    event["namespace"],
                "severity":
                    "High",
                "recommendation":
                    "Verify PVC and volume configuration."
            })

    # Deployment checks
    for deployment in deployments:
        if deployment["namespace"] == "kube-system":
            continue
        if (
            deployment["desired"]
            != deployment["available"]
        ):
            issues.append({
                "type":
                    "ReplicaMismatch",
                "resource":
                    deployment["name"],
                "namespace":
                    deployment["namespace"],
                "severity":
                    "Medium",
                "recommendation":
                    "Investigate deployment rollout."
            })

    # Final summary
    if issues:
        cluster_status = "Warning"
        summary = (
            f"{len(issues)} issue(s) detected."
        )
    else:
        cluster_status = "Healthy"
        summary = (
            "All nodes are Ready and "
            "all pods are Running."
        )

    # Save investigation
    investigation = Investigation(
        cluster_id=cluster_id,
        status=cluster_status,
        summary=summary,
        issues=json.dumps(issues)
    )

    db.add(investigation)
    db.commit()

    return {
        "cluster_status":
            cluster_status,
        "issues":
            issues,
        "summary":
            summary
    }
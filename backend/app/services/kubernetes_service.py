from kubernetes import client
from kubernetes import config


def test_cluster_connection(
    kubeconfig_path: str
):
    try:
        config.load_kube_config(
            config_file=kubeconfig_path
        )

        v1 = client.CoreV1Api()

        nodes = v1.list_node()

        return {
            "connected": True,
            "nodes": len(nodes.items)
        }

    except Exception as e:
        return {
            "connected": False,
            "error": str(e)
        }


def get_cluster_nodes(
    kubeconfig_path: str
):
    config.load_kube_config(
        config_file=kubeconfig_path
    )

    v1 = client.CoreV1Api()

    nodes = v1.list_node()

    result = []

    for node in nodes.items:
        status = "Unknown"

        for condition in node.status.conditions:
            if condition.type == "Ready":
                status = condition.status

        result.append({
            "name": node.metadata.name,
            "status":
                "Ready"
                if status == "True"
                else "NotReady",
            "version":
                node.status.node_info.kubelet_version
        })

    return result


def get_cluster_pods(
    kubeconfig_path: str
):
    config.load_kube_config(
        config_file=kubeconfig_path
    )

    v1 = client.CoreV1Api()

    pods = v1.list_pod_for_all_namespaces()

    result = []

    def get_container_reason(container_status):
        state = container_status.state
        if state.waiting:
            return getattr(state.waiting, "reason", None)
        if state.terminated:
            return getattr(state.terminated, "reason", None)

        return None

    for pod in pods.items:
        status = pod.status.phase

        if pod.status.container_statuses:
            reasons = [
                get_container_reason(container_status)
                for container_status in pod.status.container_statuses
            ]
            reasons = [reason for reason in reasons if reason]

            if "CrashLoopBackOff" in reasons:
                status = "CrashLoopBackOff"
            elif reasons:
                status = reasons[0]

        restart_count = 0

        if pod.status.container_statuses:
            restart_count = sum(
                container.restart_count
                for container
                in pod.status.container_statuses
            )

        result.append({
            "name":
                pod.metadata.name,
            "namespace":
                pod.metadata.namespace,
            "status":
                status,
            "restart_count":
                restart_count
        })

    return result


def get_cluster_namespaces(
    kubeconfig_path: str
):
    config.load_kube_config(
        config_file=kubeconfig_path
    )

    v1 = client.CoreV1Api()

    namespaces = v1.list_namespace()

    result = []

    for ns in namespaces.items:
        result.append({
            "name":
                ns.metadata.name,
            "status":
                ns.status.phase
        })

    return result


def get_cluster_events(
    kubeconfig_path: str
):
    config.load_kube_config(
        config_file=kubeconfig_path
    )

    v1 = client.CoreV1Api()

    events = v1.list_event_for_all_namespaces()

    result = []

    for event in events.items:
        result.append({
    "namespace":
        event.metadata.namespace,
    "reason":
        event.reason,
    "message":
        event.message,
    "type":
        event.type,
    "resource":
        event.involved_object.name
        if event.involved_object
        else None,
    "kind":
        event.involved_object.kind
        if event.involved_object
        else None
        })

    return result


def get_cluster_deployments(
    kubeconfig_path: str
):
    config.load_kube_config(
        config_file=kubeconfig_path
    )

    apps = client.AppsV1Api()

    deployments = (
        apps
        .list_deployment_for_all_namespaces()
    )

    result = []

    for deployment in deployments.items:

        desired = (
            deployment.spec.replicas
            or 0
        )

        available = (
            deployment.status.available_replicas
            or 0
        )

        status = "Healthy"
        if available == 0:
            status = "Critical"
        elif available < desired:
            status = "Warning"

        result.append({
            "name":
                deployment.metadata.name,
            "namespace":
                deployment.metadata.namespace,
            "desired":
                desired,
            "available":
                available,
            "status":
                status
        })

    return result
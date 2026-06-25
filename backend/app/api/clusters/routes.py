from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
import os
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.cluster import Cluster
from app.models.investigation import Investigation
from app.models.investigation_run import InvestigationRun
from app.models.user import User
from app.schemas.cluster import ClusterCreate, ClusterResponse
from app.schemas.event import EventResponse
from app.schemas.history import InvestigationHistoryResponse
from app.schemas.deployment import DeploymentResponse
from app.schemas.investigation import InvestigationResponse
from app.schemas.namespace import NamespaceResponse
from app.schemas.node import NodeResponse
from app.schemas.pod import PodResponse
from app.services.cluster_service import create_cluster, get_clusters
from app.services.investigation_service import investigate_cluster
from app.services.kubernetes_service import (
    get_cluster_events,
    get_cluster_namespaces,
    get_cluster_nodes,
    get_cluster_pods,
    get_cluster_deployments,
    test_cluster_connection,
)

router = APIRouter(prefix="/clusters", tags=["Clusters"])


def _get_owned_cluster(db: Session, cluster_id: int, user_id: int) -> Cluster:
    cluster = (
        db.query(Cluster)
        .filter(Cluster.id == cluster_id, Cluster.user_id == user_id)
        .first()
    )
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    return cluster


def _require_kubeconfig(cluster: Cluster) -> None:
    if not cluster.kubeconfig_path:
        raise HTTPException(
            status_code=400,
            detail="Kubeconfig is not uploaded for this cluster",
        )


def _raise_cluster_api_error(operation: str) -> None:
    raise HTTPException(
        status_code=502,
        detail=(
            f"Unable to {operation}. Could not reach the Kubernetes API server for this cluster. "
            "Verify that the cluster is running and kubeconfig server address is reachable."
        ),
    )


def _set_cluster_status(db: Session, cluster: Cluster, status: str) -> None:
    if cluster.status != status:
        cluster.status = status
        db.commit()


def _handle_cluster_api_failure(db: Session, cluster: Cluster, operation: str) -> None:
    _set_cluster_status(db, cluster, "disconnected")
    _raise_cluster_api_error(operation)


@router.post("", response_model=ClusterResponse)
def add_cluster(
    cluster: ClusterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_cluster(db, cluster.name, cluster.description, current_user.id)


@router.get("", response_model=list[ClusterResponse])
def list_clusters(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_clusters(db, current_user.id)


@router.delete("/{cluster_id}")
def delete_cluster(
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cluster = _get_owned_cluster(db, cluster_id, current_user.id)

    investigation_ids = (
        db.query(Investigation.id)
        .filter(Investigation.cluster_id == cluster.id)
        .all()
    )

    investigation_ids = [x[0] for x in investigation_ids]

    if investigation_ids:
        db.query(InvestigationRun).filter(
            InvestigationRun.investigation_id.in_(investigation_ids)
        ).delete(synchronize_session=False)

    db.query(Investigation).filter(
        Investigation.cluster_id == cluster.id
    ).delete(synchronize_session=False)

    db.delete(cluster)
    db.commit()

    return {"message": "Cluster removed successfully"}


@router.post("/{cluster_id}/kubeconfig")
async def upload_kubeconfig(
    cluster_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cluster = _get_owned_cluster(db, cluster_id, current_user.id)

    os.makedirs("storage/kubeconfigs", exist_ok=True)
    file_path = f"storage/kubeconfigs/cluster_{cluster_id}.yaml"

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    cluster.kubeconfig_path = file_path

    result = test_cluster_connection(file_path)
    cluster.status = "connected" if result.get("connected") else "failed"

    db.commit()
    db.refresh(cluster)

    return {
        "message": "Kubeconfig uploaded successfully",
        "status": cluster.status,
        "connection": result,
    }


@router.get("/{cluster_id}/nodes", response_model=list[NodeResponse])
def get_nodes(
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cluster = _get_owned_cluster(db, cluster_id, current_user.id)
    _require_kubeconfig(cluster)

    try:
        nodes = get_cluster_nodes(cluster.kubeconfig_path)
        _set_cluster_status(db, cluster, "connected")
        return nodes
    except Exception:
        _handle_cluster_api_failure(db, cluster, "fetch nodes")


@router.get("/{cluster_id}/pods", response_model=list[PodResponse])
def get_pods(
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cluster = _get_owned_cluster(db, cluster_id, current_user.id)
    _require_kubeconfig(cluster)

    try:
        pods = get_cluster_pods(cluster.kubeconfig_path)
        _set_cluster_status(db, cluster, "connected")
        return pods
    except Exception:
        _handle_cluster_api_failure(db, cluster, "fetch pods")


@router.get("/{cluster_id}/namespaces", response_model=list[NamespaceResponse])
def get_namespaces(
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cluster = _get_owned_cluster(db, cluster_id, current_user.id)
    _require_kubeconfig(cluster)

    try:
        namespaces = get_cluster_namespaces(cluster.kubeconfig_path)
        _set_cluster_status(db, cluster, "connected")
        return namespaces
    except Exception:
        _handle_cluster_api_failure(db, cluster, "fetch namespaces")


@router.get("/{cluster_id}/events", response_model=list[EventResponse])
def get_events(
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cluster = _get_owned_cluster(db, cluster_id, current_user.id)
    _require_kubeconfig(cluster)

    try:
        events = get_cluster_events(cluster.kubeconfig_path)
        _set_cluster_status(db, cluster, "connected")
        return events
    except Exception:
        _handle_cluster_api_failure(db, cluster, "fetch events")


@router.get("/{cluster_id}/deployments", response_model=list[DeploymentResponse])
def get_deployments(
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cluster = _get_owned_cluster(db, cluster_id, current_user.id)
    _require_kubeconfig(cluster)

    try:
        deployments = get_cluster_deployments(cluster.kubeconfig_path)
        _set_cluster_status(db, cluster, "connected")
        return deployments
    except Exception:
        _handle_cluster_api_failure(db, cluster, "fetch deployments")


@router.post("/{cluster_id}/investigate", response_model=InvestigationResponse)
def investigate(
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cluster = _get_owned_cluster(db, cluster_id, current_user.id)
    _require_kubeconfig(cluster)

    try:
        result = investigate_cluster(
            db,
            cluster.id,
            cluster.kubeconfig_path
        )
        _set_cluster_status(db, cluster, "connected")
        return result

    except Exception as e:
        import traceback
        traceback.print_exc()
        print("REAL ERROR:", str(e))
        raise e


@router.get("/{cluster_id}/history", response_model=list[InvestigationHistoryResponse])
def get_history(
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_cluster(db, cluster_id, current_user.id)

    investigations = (
        db.query(Investigation)
        .filter(Investigation.cluster_id == cluster_id)
        .order_by(Investigation.created_at.desc())
        .all()
    )

    runs = {
        run.investigation_id: run
        for run in (
            db.query(InvestigationRun)
            .filter(InvestigationRun.cluster_id == cluster_id)
            .all()
        )
    }

    return [
        {
            "id": investigation.id,
            "status": investigation.status,
            "summary": investigation.summary,
            "issues": investigation.issues,
            "created_at": investigation.created_at,
            "started_at": runs.get(investigation.id).started_at if runs.get(investigation.id) else None,
            "completed_at": runs.get(investigation.id).completed_at if runs.get(investigation.id) else None,
            "duration_seconds": runs.get(investigation.id).duration_seconds if runs.get(investigation.id) else None,
        }
        for investigation in investigations
    ]

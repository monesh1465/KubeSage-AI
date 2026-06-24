from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    HTTPException
)

import os
from sqlalchemy.orm import Session

from app.models.cluster import Cluster
from app.models.user import User

from app.db.database import get_db

from app.schemas.cluster import (
    ClusterCreate,
    ClusterResponse
)

from app.services.cluster_service import (
    create_cluster,
    get_clusters
)

from app.services.kubernetes_service import (
    test_cluster_connection
)

from app.core.dependencies import (
    get_current_user
)
from app.schemas.node import NodeResponse

from app.services.kubernetes_service import (
    test_cluster_connection,
    get_cluster_nodes
)

from app.schemas.pod import PodResponse

from app.schemas.namespace import (
    NamespaceResponse
)

from app.services.kubernetes_service import (
    test_cluster_connection,
    get_cluster_nodes,
    get_cluster_pods,
    get_cluster_namespaces
)
from app.schemas.event import EventResponse

from app.services.kubernetes_service import (
    test_cluster_connection,
    get_cluster_nodes,
    get_cluster_pods,
    get_cluster_namespaces,
    get_cluster_events
)

from app.models.investigation import Investigation
from app.schemas.history import (
    InvestigationHistoryResponse
)

router = APIRouter(
    prefix="/clusters",
    tags=["Clusters"]
)

@router.post(
    "",
    response_model=ClusterResponse
)
def add_cluster(
    cluster: ClusterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    )
):
    return create_cluster(
        db,
        cluster.name,
        cluster.description,
        current_user.id
    )

@router.get(
    "",
    response_model=list[ClusterResponse]
)
def list_clusters(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    )
):
    return get_clusters(
        db,
        current_user.id
    )

@router.post("/{cluster_id}/kubeconfig")
async def upload_kubeconfig(
    cluster_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cluster = (
        db.query(Cluster)
        .filter(
            Cluster.id == cluster_id,
            Cluster.user_id == current_user.id
        )
        .first()
    )

    if not cluster:
        raise HTTPException(
            status_code=404,
            detail="Cluster not found"
        )

    os.makedirs(
        "storage/kubeconfigs",
        exist_ok=True
    )

    file_path = (
        f"storage/kubeconfigs/"
        f"cluster_{cluster_id}.yaml"
    )

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    # Save kubeconfig path
    cluster.kubeconfig_path = file_path

    # Test Kubernetes connection
    result = test_cluster_connection(
        file_path
    )

    if result["connected"]:
        cluster.status = "connected"
    else:
        cluster.status = "failed"

    db.commit()
    db.refresh(cluster)

    return {
        "message": "Kubeconfig uploaded successfully",
        "status": cluster.status,
        "connection": result
    }

@router.get(
    "/{cluster_id}/nodes",
    response_model=list[NodeResponse]
)
def get_nodes(
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    )
):
    cluster = (
        db.query(Cluster)
        .filter(
            Cluster.id == cluster_id,
            Cluster.user_id == current_user.id
        )
        .first()
    )

    if not cluster:
        raise HTTPException(
            status_code=404,
            detail="Cluster not found"
        )

    return get_cluster_nodes(
        cluster.kubeconfig_path
    )

from app.services.kubernetes_service import (
    test_cluster_connection,
    get_cluster_nodes,
    get_cluster_pods
)

@router.get(
    "/{cluster_id}/pods",
    response_model=list[PodResponse]
)
def get_pods(
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    )
):
    cluster = (
        db.query(Cluster)
        .filter(
            Cluster.id == cluster_id,
            Cluster.user_id == current_user.id
        )
        .first()
    )

    if not cluster:
        raise HTTPException(
            status_code=404,
            detail="Cluster not found"
        )

    return get_cluster_pods(
        cluster.kubeconfig_path
    )

@router.get(
    "/{cluster_id}/namespaces",
    response_model=list[NamespaceResponse]
)
def get_namespaces(
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    )
):
    cluster = (
        db.query(Cluster)
        .filter(
            Cluster.id == cluster_id,
            Cluster.user_id == current_user.id
        )
        .first()
    )

    if not cluster:
        raise HTTPException(
            status_code=404,
            detail="Cluster not found"
        )

    return get_cluster_namespaces(
        cluster.kubeconfig_path
    )

@router.get(
    "/{cluster_id}/events",
    response_model=list[EventResponse]
)
def get_events(
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    )
):
    cluster = (
        db.query(Cluster)
        .filter(
            Cluster.id == cluster_id,
            Cluster.user_id == current_user.id
        )
        .first()
    )

    if not cluster:
        raise HTTPException(
            status_code=404,
            detail="Cluster not found"
        )

    return get_cluster_events(
        cluster.kubeconfig_path
    )

from app.schemas.investigation import (
    InvestigationResponse
)

from app.services.investigation_service import (
    investigate_cluster
)

@router.post(
    "/{cluster_id}/investigate",
    response_model=InvestigationResponse
)
def investigate(
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    )
):
    cluster = (
        db.query(Cluster)
        .filter(
            Cluster.id == cluster_id,
            Cluster.user_id == current_user.id
        )
        .first()
    )

    if not cluster:
        raise HTTPException(
            status_code=404,
            detail="Cluster not found"
        )

    return investigate_cluster(
    db,
    cluster.id,
    cluster.kubeconfig_path
)

@router.get(
    "/{cluster_id}/history",
    response_model=list[
        InvestigationHistoryResponse
    ]
)
def get_history(
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    )
):
    cluster = (
        db.query(Cluster)
        .filter(
            Cluster.id == cluster_id,
            Cluster.user_id == current_user.id
        )
        .first()
    )

    if not cluster:
        raise HTTPException(
            status_code=404,
            detail="Cluster not found"
        )

    return (
        db.query(Investigation)
        .filter(
            Investigation.cluster_id
            == cluster_id
        )
        .order_by(
            Investigation.created_at.desc()
        )
        .all()
    )
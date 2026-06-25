import json

from sqlalchemy.orm import Session

from app.models.cluster import Cluster
from app.models.investigation import Investigation


def create_cluster(
    db: Session,
    name: str,
    description: str,
    user_id: int
):
    cluster = Cluster(
        name=name,
        description=description,
        user_id=user_id
    )

    db.add(cluster)
    db.commit()
    db.refresh(cluster)

    return cluster


def get_clusters(
    db: Session,
    user_id: int
):
    clusters = (
        db.query(Cluster)
        .filter(Cluster.user_id == user_id)
        .all()
    )

    latest_investigations = {}
    if clusters:
        cluster_ids = [cluster.id for cluster in clusters]
        for investigation in (
            db.query(Investigation)
            .filter(Investigation.cluster_id.in_(cluster_ids))
            .order_by(Investigation.cluster_id, Investigation.created_at.desc())
            .all()
        ):
            if investigation.cluster_id not in latest_investigations:
                issues = []
                try:
                    issues = json.loads(investigation.issues or "[]")
                except Exception:
                    issues = []

                latest_investigations[investigation.cluster_id] = {
                    "status": investigation.status,
                    "summary": investigation.summary,
                    "issue_count": len(issues),
                }

    response = []
    for cluster in clusters:
        latest = latest_investigations.get(cluster.id)
        payload = {
            "id": cluster.id,
            "name": cluster.name,
            "description": cluster.description,
            "status": cluster.status,
        }

        if latest:
            payload["latest_investigation_status"] = latest["status"]
            payload["latest_investigation_summary"] = latest["summary"]
            payload["latest_investigation_issue_count"] = latest["issue_count"]

        response.append(payload)

    return response
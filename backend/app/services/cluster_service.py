from sqlalchemy.orm import Session

from app.models.cluster import Cluster


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
    return (
        db.query(Cluster)
        .filter(Cluster.user_id == user_id)
        .all()
    )
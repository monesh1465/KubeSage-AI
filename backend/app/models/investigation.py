from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    DateTime,
    Text
)
from sqlalchemy.sql import func

from app.db.database import Base


class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    cluster_id = Column(
        Integer,
        ForeignKey("clusters.id")
    )

    status = Column(
        String(50)
    )

    summary = Column(
        Text
    )

    issues = Column(
        Text
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )
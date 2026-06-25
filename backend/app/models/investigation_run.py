from sqlalchemy import Column, Integer, ForeignKey, DateTime, Float
from sqlalchemy.sql import func

from app.db.database import Base


class InvestigationRun(Base):
    __tablename__ = "investigation_runs"

    id = Column(Integer, primary_key=True, index=True)
    investigation_id = Column(
        Integer,
        ForeignKey("investigations.id"),
        unique=True,
        nullable=False,
    )
    cluster_id = Column(Integer, ForeignKey("clusters.id"), nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=False)
    duration_seconds = Column(Float, nullable=False)
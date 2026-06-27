from app.db.database import Base
from app.models.user import User
from app.models.cluster import Cluster
from app.models.investigation import Investigation
from app.models.investigation_run import InvestigationRun
from app.models.ai_analysis import AIAnalysis  # noqa: F401 – registers table
from pydantic import BaseModel


class IssueResponse(BaseModel):
    type: str
    resource: str
    namespace: str
    severity: str
    recommendation: str


class InvestigationResponse(BaseModel):
    cluster_status: str
    issues: list[IssueResponse]
    summary: str
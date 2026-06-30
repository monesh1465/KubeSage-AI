import { parseIssues } from "./parseIssues";

/**
 * Derive the list of deduplicated diagnostic commands from parsed issues.
 * Mirrors the logic already used in Investigation.jsx.
 */
function resolveIssueCommands(issue) {
  const commands = [];
  const type = issue.type?.toLowerCase() ?? "";
  const ns = issue.namespace && issue.namespace !== "-" ? `-n ${issue.namespace}` : "-A";
  const resource = issue.resource ?? "";

  if (type.includes("pending") || type.includes("crashloop") || type.includes("oom") || type.includes("imagepull")) {
    commands.push(`kubectl describe pod ${resource} ${ns}`);
    commands.push(`kubectl logs ${resource} ${ns} --previous`);
  }
  if (type.includes("notready")) {
    commands.push(`kubectl describe node ${resource}`);
    commands.push(`kubectl get events --field-selector involvedObject.name=${resource}`);
  }
  if (type.includes("replicamismatch")) {
    commands.push(`kubectl rollout status deployment/${resource} ${ns}`);
    commands.push(`kubectl describe deployment ${resource} ${ns}`);
  }
  if (type.includes("failedscheduling")) {
    commands.push(`kubectl get events ${ns} --field-selector reason=FailedScheduling`);
  }
  if (type.includes("failedmount")) {
    commands.push(`kubectl describe pod ${resource} ${ns}`);
    commands.push(`kubectl get pvc ${ns}`);
  }
  if (commands.length === 0) {
    commands.push(`kubectl get pods ${ns}`);
    commands.push(`kubectl get events ${ns}`);
  }
  return commands;
}

/**
 * Build a structured investigation context object from the raw API responses.
 *
 * @param {object} investigation  - Raw investigation record from getInvestigationById()
 * @param {object|null} aiAnalysis - Raw AI analysis record (may be null)
 * @returns {object} investigationContext
 */
export function buildInvestigationContext(investigation, aiAnalysis) {
  if (!investigation) return null;

  const issues = parseIssues(investigation.issues);

  // Namespaces
  const namespaces = Array.from(
    new Set(issues.map((i) => i.namespace).filter((ns) => ns && ns !== "-"))
  );

  // Severity counts
  const issueCounts = {
    High: issues.filter((i) => i.severity === "High").length,
    Medium: issues.filter((i) => i.severity === "Medium").length,
    Low: issues.filter((i) => i.severity === "Low").length,
    Total: issues.length,
  };

  // Deduplicated diagnostic commands
  const commands = Array.from(
    new Set(issues.flatMap((issue) => resolveIssueCommands(issue)))
  );

  const ctx = {
    investigationId: investigation.id,
    clusterName: investigation.cluster_name || "Unknown Cluster",
    status: investigation.cluster_status || investigation.status || "Unknown",
    namespace: namespaces.join(", ") || "N/A",
    summary: investigation.summary || "",
    findings: issues,
    commands,
    aiReport: aiAnalysis?.analysis || "",
    issueCounts,
    // Raw references — available to the page but not sent to the API
    _raw: { investigation, aiAnalysis },
  };

  console.log("Investigation Context:", ctx);
  return ctx;
}

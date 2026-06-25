export function parseIssues(issuesStr) {
  if (!issuesStr) return [];
  if (Array.isArray(issuesStr)) return issuesStr;

  try {
    const parsed = JSON.parse(issuesStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

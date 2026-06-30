import api from "../api/axios";

/**
 * Send a context-aware, conversational chat message to KubeSage AI.
 *
 * @param {object} params
 * @param {string} params.message              - The current user question
 * @param {object} params.investigationCtx     - Full investigation context object
 * @param {Array}  params.history              - Prior turns [{role, content}, ...]
 * @returns {Promise<{reply: string, model: string}>}
 */
export const sendChatMessage = async ({ message, investigationCtx, history = [] }) => {
  const payload = {
    message,
    // Send history excluding the welcome message (role=assistant, id=welcome)
    history: history
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content })),
    investigation_id: investigationCtx.investigationId ?? null,
    cluster_name: investigationCtx.clusterName ?? "Unknown Cluster",
    status: investigationCtx.status ?? "Unknown",
    namespace: investigationCtx.namespace ?? "",
    summary: investigationCtx.summary ?? "",
    findings: investigationCtx.findings ?? [],
    commands: investigationCtx.commands ?? [],
    ai_report: investigationCtx.aiReport ?? "",
    issue_counts: investigationCtx.issueCounts ?? {},
  };

  // 120-second timeout for longer AI responses
  const response = await api.post("/api/ai/chat", payload, { timeout: 120_000 });
  return response.data; // { reply, model, prompt_tokens, completion_tokens }
};

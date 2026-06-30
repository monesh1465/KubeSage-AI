import api from "../api/axios";

/**
 * Send a message to the global KubeSage AI assistant (no investigation context).
 *
 * @param {object} params
 * @param {string} params.message   - Current user question
 * @param {Array}  params.history   - Prior turns [{role, content}, ...]
 * @returns {Promise<{reply: string, model: string}>}
 */
export const sendAssistantMessage = async ({ message, history = [] }) => {
  const payload = {
    message,
    history: history
      .filter((m) => m.id !== "assistant-welcome")
      .map((m) => ({ role: m.role, content: m.content })),
  };

  const response = await api.post("/api/ai/assistant", payload, {
    timeout: 120_000,
  });
  return response.data; // { reply, model, prompt_tokens, completion_tokens }
};

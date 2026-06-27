import api from "../api/axios";

/**
 * Generate a new AI analysis for an investigation and save it to the DB.
 * Returns the saved AI report row (including id, analysis, model, tokens).
 * If a report already exists, the backend returns the cached report.
 */
export const generateAIAnalysis = async (investigationId) => {
  const response = await api.post(`/api/ai/investigation/${investigationId}`);
  return response.data;
};

/**
 * Fetch the saved AI analysis for an investigation.
 * Returns null (does not throw) on 404, indicating no report has been generated yet.
 */
export const getLatestAIAnalysis = async (investigationId) => {
  try {
    const response = await api.get(`/api/ai/investigation/${investigationId}`);
    return response.data;
  } catch (err) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
};

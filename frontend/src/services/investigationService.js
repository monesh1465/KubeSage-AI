import api from "../api/axios";

export const runInvestigation = async (clusterId) => {
  const response = await api.post(`/clusters/${clusterId}/investigate`);
  return response.data;
};

export const getInvestigationHistory = async (clusterId) => {
  const response = await api.get(`/clusters/${clusterId}/history`);
  return response.data;
};

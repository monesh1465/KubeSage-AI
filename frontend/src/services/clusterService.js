import api from "../api/axios";

export const getClusters = async () => {
  const response = await api.get("/clusters");
  return response.data;
};

export const createCluster = async (clusterData) => {
  const response = await api.post("/clusters", clusterData);
  return response.data;
};

export const uploadKubeconfig = async (clusterId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post(
    `/clusters/${clusterId}/kubeconfig`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return response.data;
};

export const getNodes = async (clusterId) => {
  const response = await api.get(`/clusters/${clusterId}/nodes`);
  return response.data;
};

export const getPods = async (clusterId) => {
  const response = await api.get(`/clusters/${clusterId}/pods`);
  return response.data;
};

export const getNamespaces = async (clusterId) => {
  const response = await api.get(`/clusters/${clusterId}/namespaces`);
  return response.data;
};

export const getEvents = async (clusterId) => {
  const response = await api.get(`/clusters/${clusterId}/events`);
  return response.data;
};

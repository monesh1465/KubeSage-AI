import axios from "axios";
import { getApiErrorMessage } from "../utils/errors";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    error.userMessage = getApiErrorMessage(error);

    if (error.response?.status === 401) {
      const isAuthRoute =
        window.location.pathname === "/" ||
        window.location.pathname === "/register";

      localStorage.removeItem("token");

      if (!isAuthRoute) {
        window.dispatchEvent(new CustomEvent("auth:logout"));
      }
    }

    return Promise.reject(error);
  }
);

export default api;

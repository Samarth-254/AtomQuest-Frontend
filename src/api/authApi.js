import api from "./axios";

export const login = (credentials) => api.post("/auth/login", credentials);
export const getMe = () => api.get("/auth/me");
export const seedPasswords = () => api.post("/auth/seed-passwords");
export const requestPasswordReset = (payload) => api.post("/auth/forgot-password", payload);
export const resetPassword = (payload) => api.post("/auth/reset-password", payload);

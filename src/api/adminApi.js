import api from "./axios";

export const listUsers = () => api.get("/admin/users");
export const createUser = (payload) => api.post("/admin/users", payload);
export const suspendUser = (userId) => api.patch(`/admin/users/${userId}/suspend`);
export const deleteUser = (userId) => api.delete(`/admin/users/${userId}`);
export const getGoalSheets = () => api.get("/admin/goal-sheets");
export const unlockGoalSheet = (sheetId) =>
  api.post(`/admin/unlock/${sheetId}`);
export const getAuditLogs = (params) => api.get("/admin/audit-logs", { params });
export const createCycle = (payload) => api.post("/admin/cycles", payload);
export const getEscalationRules = () => api.get("/admin/escalation-rules");
export const updateEscalationRule = (ruleId, payload) =>
  api.put(`/admin/escalation-rules/${ruleId}`, payload);
export const getEscalationLogs = () => api.get("/admin/escalation-logs");

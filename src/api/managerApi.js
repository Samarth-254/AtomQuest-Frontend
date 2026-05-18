import api from "./axios";

export const listTeamSheets = () => api.get("/manager/team-sheets");
export const getSheetDetails = (sheetId) =>
  api.get(`/manager/sheet/${sheetId}`);
export const updateGoalAsManager = (goalId, payload) =>
  api.put(`/manager/goal/${goalId}`, payload);
export const approveSheet = (sheetId) =>
  api.post(`/manager/approve/${sheetId}`);
export const returnSheet = (sheetId, payload) =>
  api.post(`/manager/return/${sheetId}`, payload);
export const getTeamCheckins = (sheetId) =>
  api.get(`/manager/checkins/${sheetId}`);
export const addCheckinComment = (payload) =>
  api.post("/manager/checkin-comment", payload);
export const pushGoalToTeam = (payload) =>
  api.post(`/manager/goal/push`, payload);
export const getSharedGoals = () => api.get("/manager/shared-goals");
export const approveModification = (sheetId) => api.post(`/manager/approve-modification/${sheetId}`);
export const rejectModification = (sheetId, payload) => api.post(`/manager/reject-modification/${sheetId}`, payload);

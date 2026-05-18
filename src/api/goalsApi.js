import api from "./axios";

export const getThrustAreas = () => api.get("/goals/thrust-areas");
export const getCycles = () => api.get("/goals/cycles");
export const getMyGoalSheet = () => api.get("/goals/my-sheet");
export const createGoalSheet = (payload) => api.post("/goals/sheet", payload);
export const addGoal = (payload) => api.post("/goals", payload);
export const updateGoal = (id, payload) => api.put(`/goals/${id}`, payload);
export const deleteGoal = (id) => api.delete(`/goals/${id}`);
export const submitGoalSheet = (sheetId) =>
	api.post(`/goals/submit/${sheetId}`);
export const requestModification = (sheetId) =>
	api.post(`/goals/request-modification/${sheetId}`);

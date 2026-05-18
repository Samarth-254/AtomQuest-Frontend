import api from "./axios";

export const upsertCheckin = (payload) => api.post("/checkins", payload);
export const getMyProgress = () => api.get("/checkins/my-progress");

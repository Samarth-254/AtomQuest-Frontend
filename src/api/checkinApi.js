import api from "./axios";

export const upsertCheckin = (payload) => api.post("/checkins", payload);
export const getMyProgress = (options = {}) => {
	const params = {};
	if (options.cyclePhase) params.cyclePhase = options.cyclePhase;
	if (options.all) params.all = true;
	return api.get("/checkins/my-progress", { params: Object.keys(params).length ? params : undefined });
};

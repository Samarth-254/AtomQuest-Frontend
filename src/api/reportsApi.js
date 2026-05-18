import api from "./axios";

export const getAchievementReport = () =>
	api.get("/reports/achievement-export", { responseType: "blob" });
export const getCompletionReport = () =>
	api.get("/reports/completion-dashboard");

import api from "./axios";

export const getQoqTrends = () => api.get("/analytics/qoq-trends");
export const getCompletionHeatmap = () =>
  api.get("/analytics/completion-heatmap");
export const getGoalDistribution = () =>
  api.get("/analytics/goal-distribution");
export const getManagerEffectiveness = () =>
  api.get("/analytics/manager-effectiveness");
export const getLiveInsights = () =>
  api.get("/analytics/live-insights");

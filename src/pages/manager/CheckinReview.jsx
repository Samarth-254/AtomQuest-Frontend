import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { addCheckinComment, getTeamCheckins } from "../../api/managerApi";
import toast from "react-hot-toast";

export default function CheckinReview() {
  const { sheetId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [draftComments, setDraftComments] = useState({});
  const [savingId, setSavingId] = useState(null);

  const loadCheckins = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await getTeamCheckins(sheetId);
      setItems(res.data || []);
      setError("");
    } catch (err) {
      setError("Failed to load check-ins.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [sheetId]);

  useEffect(() => {
    loadCheckins(true);
  }, [loadCheckins]);

  useEffect(() => {
    const handleSocketEvent = (e) => {
      const { event } = e.detail;
      if (event === "checkin_completed") {
        
        loadCheckins(false); // Silent reload in background
      }
    };

    window.addEventListener("app_socket_event", handleSocketEvent);
    return () => {
      window.removeEventListener("app_socket_event", handleSocketEvent);
    };
  }, [loadCheckins]);

  const getCheckinKey = (item) => item.checkin_id ?? `${item.goal_id}-${item.cycle_phase}`;

  const handleTextareaChange = (key, val) => {
    setDraftComments(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleComment = async (checkinId, comment) => {
    if (!checkinId) {
      toast.error('Check-in record is missing for this goal.');
      return;
    }
    setSavingId(checkinId);
    try {
      await addCheckinComment({ checkinId, comment });
      toast.success("Comment saved successfully!");
      setItems(prev => prev.map(item => item.checkin_id === checkinId ? { ...item, manager_comment: comment } : item));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save comment.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="h-full -m-6 bg-[#F6F8F8]">
      <div className="p-6 space-y-6">
        <section className="bg-white border border-[#D9E3E4] rounded-[12px] p-5">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
            <div>
              <h1 className="text-[20px] md:text-[22px] font-semibold text-[#1B1D1F]">
                Check-in Review
              </h1>
              <p className="text-[15px] text-[#586270] mt-1">
                Review check-ins and add manager comments.
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-12 gap-6 items-start">
          <div className="col-span-12 xl:col-span-8 space-y-5">
            <div className="flex items-center gap-2 text-[#1B1D1F]">
              <span className="material-symbols-outlined text-[20px]">tune</span>
              <h2 className="text-[18px] font-semibold">Planned vs. Actual Performance</h2>
            </div>

            {loading && (
              <div className="space-y-5 animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white border border-[#D9E3E4] rounded-[12px] p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-2 w-1/2">
                        <div className="h-5 bg-gray-200 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-20 bg-gray-200 rounded w-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && !loading && (
              <div className="text-[14px] text-[#b91c1c]">{error}</div>
            )}

            {!loading && !error && (() => {
              const hasAnyCheckin = items.some((item) => item.checkin_id);
              if (!hasAnyCheckin) {
                return (
                  <div className="bg-white border border-[#D9E3E4] rounded-[12px] p-5">
                    <div className="text-[13px] text-[#b45309] bg-[#fff7ed] border border-[#fed7aa] rounded-[8px] px-3 py-3">
                      No check-in record exists for this sheet yet. Comments will be available after the employee submits a check-in.
                    </div>
                  </div>
                );
              }

              return items.map((item) => {
              const draftKey = getCheckinKey(item);
              const currentDraft = draftComments[draftKey];
              const currentComment = item.manager_comment || "";
              const canSave = item.checkin_id && currentDraft !== undefined && currentDraft !== currentComment;

              return (
              <div
                key={`${item.goal_id}-${item.cycle_phase}`}
                className="bg-white border border-[#D9E3E4] rounded-[12px] p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-[16px] font-semibold text-[#1B1D1F]">
                      {item.title}
                    </h3>
                    <p className="text-[13px] text-[#586270] mt-1">
                      Phase: {item.cycle_phase || "N/A"}
                    </p>
                  </div>
                  <div className="text-[13px] text-[#1B1D1F]">
                    Score: {item.progress_score ?? 0}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-[14px] text-[#667085]">
                    Target: {item.target_value ?? "N/A"}
                  </div>
                  <div className="text-[14px] text-[#667085]">
                    Actual: {item.actual_value ?? "N/A"}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-[13px] text-[#667085] mb-2">
                    Manager Comment
                  </label>
                  <textarea
                    rows="3"
                    value={currentDraft !== undefined ? currentDraft : currentComment}
                    onChange={(e) => handleTextareaChange(draftKey, e.target.value)}
                    className="w-full px-4 py-3 border border-[#D9E3E4] rounded-[8px] bg-white text-[14px] text-[#1B1D1F] focus:outline-none focus:border-[#006C63] focus:ring-1 focus:ring-[#006C63]"
                    placeholder="Add your feedback or comments..."
                  />
                  {canSave && (
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleComment(item.checkin_id, currentDraft)}
                        disabled={savingId === item.checkin_id}
                        className="px-4 py-1.5 rounded-[6px] bg-[#006C63] hover:bg-[#00564F] text-white text-[12px] font-semibold transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        {savingId === item.checkin_id ? (
                          <>
                            <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                            Saving...
                          </>
                        ) : 'Save Comment'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );});
            })()}
          </div>

          <div className="col-span-12 xl:col-span-4 space-y-4">
            <section className="bg-white border border-[#D9E3E4] rounded-[12px] p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[20px] text-[#1B1D1F]">
                  rate_review
                </span>
                <h3 className="text-[18px] font-semibold text-[#1B1D1F]">Notes</h3>
              </div>

              <p className="text-[14px] text-[#667085]">
                Manager comments are saved per goal above.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

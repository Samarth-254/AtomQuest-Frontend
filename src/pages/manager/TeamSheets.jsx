import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { listTeamSheets } from "../../api/managerApi";

const statusStyles = {
  APPROVED: "bg-[#dff4f1] text-[#0b6b63]",
  SUBMITTED: "bg-[#ece8ff] text-[#6b5ca5]",
  DRAFT: "bg-[#f3f4f5] text-[#3d4947]",
  RETURNED: "bg-[#fdecec] text-[#b23838]",
};

export default function TeamSheets() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sheets, setSheets] = useState([]);

  const loadTeamSheets = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await listTeamSheets();
      setSheets(res.data || []);
      setError("");
    } catch (err) {
      setError("Failed to load team sheets.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeamSheets(true);
  }, [loadTeamSheets]);

  useEffect(() => {
    const handleSocketEvent = (e) => {
      const { event } = e.detail;
      if (
        event === "goal_submitted" ||
        event === "goal_approved" ||
        event === "goal_returned" ||
        event === "sheet_reopened" ||
        event === "sheet_rejected"
      ) {
        
        loadTeamSheets(false); // Silent reload in background
      }
    };

    window.addEventListener("app_socket_event", handleSocketEvent);
    return () => {
      window.removeEventListener("app_socket_event", handleSocketEvent);
    };
  }, [loadTeamSheets]);

  const pendingCount = useMemo(
    () => sheets.filter((sheet) => sheet.status === "SUBMITTED").length,
    [sheets]
  );

  return (
    <div className="max-w-[1200px]">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-semibold leading-[32px] tracking-[-0.01em] text-[#191c1d]">
            Team Sheets
          </h1>
          <p className="text-[14px] text-[#3d4947] mt-0.5">
            Review submissions from your team.
          </p>
        </div>
        <div className="text-[13px] text-[#3d4947]">Pending: {pendingCount}</div>
      </div>

      <div className="bg-white border border-[#d9e3e4] rounded-[10px] overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_120px_120px] gap-4 px-6 py-4 border-b border-[#edeeef] bg-[#fafafa]">
          {["Employee", "Department", "Status", "Goals", "Actions"].map((title) => (
            <div
              key={title}
              className="text-[12px] uppercase tracking-[0.08em] font-semibold text-[#3d4947]"
            >
              {title}
            </div>
          ))}
        </div>

        {loading && (
          <div className="p-6 space-y-4 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-48"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="w-32 h-4 bg-gray-200 rounded shrink-0 hidden md:block"></div>
                <div className="w-24 h-6 bg-gray-200 rounded shrink-0 hidden sm:block"></div>
                <div className="w-16 h-4 bg-gray-200 rounded shrink-0"></div>
                <div className="w-20 h-9 bg-gray-200 rounded shrink-0"></div>
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="px-6 py-5 text-[14px] text-[#b91c1c]">{error}</div>
        )}

        {!loading && !error && sheets.map((sheet) => (
          <div
            key={sheet.id}
            className="grid grid-cols-[2fr_1fr_1fr_120px_120px] gap-4 px-6 py-4 border-b border-[#edeeef] items-center"
          >
            <div>
              <div className="text-[15px] font-medium text-[#191c1d]">
                {sheet.employee_name}
              </div>
              <div className="text-[12px] text-[#3d4947]">{sheet.employee_email}</div>
            </div>
            <div className="text-[14px] text-[#3d4947]">{sheet.department || "N/A"}</div>
            <div>
              <span
                className={`inline-flex px-2.5 py-1 rounded-[6px] text-[12px] font-medium ${statusStyles[sheet.status] || "bg-[#f3f4f5] text-[#3d4947]"}`}
              >
                {sheet.status}
              </span>
            </div>
            <div className="text-[14px] text-[#191c1d]">{sheet.goal_count || 0}</div>
            <button
              onClick={() => navigate(`/manager/review/${sheet.id}`)}
              className="h-9 px-3 rounded-[6px] bg-[#00685f] hover:bg-[#005049] text-white text-[13px] font-medium transition-colors"
            >
              Review
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

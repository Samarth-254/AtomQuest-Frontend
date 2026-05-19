import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCycle } from "../../api/adminApi";
import { getCycles } from "../../api/goalsApi";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString() : "N/A";

function StageMarker({ stage, position }) {
  // complete = solid green fill | active (but not complete) = green ring | else = grey ring
  const dotClass = stage.complete
    ? "bg-[#0C7A6E] border-[#0C7A6E]"
    : stage.active
    ? "bg-white border-[4px] border-[#0C7A6E]"
    : "bg-white border-[4px] border-[#E5E7EB]";

  return (
    <div className={`flex flex-col ${position === 'left' ? 'items-start text-left' : position === 'right' ? 'items-end text-right' : 'items-center text-center'} w-[90px] md:w-[120px] ${position === 'center' ? '-translate-x-1/2' : ''}`}>
      <div className={`w-5 h-5 rounded-full border-2 ${dotClass} z-10 ${position === 'center' ? 'mx-auto' : position === 'right' ? 'ml-auto' : ''}`} />
      <div className="mt-3">
        <div className="text-[12px] md:text-[13px] font-medium text-[#1B1D1F] break-words leading-tight">{stage.label}</div>
        <div className="text-[11px] md:text-[12px] text-[#6B7280] leading-tight mt-0.5">{stage.sublabel}</div>
      </div>
    </div>
  );
}

const phaseLabels = [
  { key: 'GOAL_SETTING', label: 'Goal Setting' },
  { key: 'Q1', label: 'Q1 Check-in' },
  { key: 'Q2', label: 'Q2 Check-in' },
  { key: 'Q3', label: 'Q3 Check-in' },
  { key: 'Q4', label: 'Q4 / Annual' },
];

const initialForm = {
  cycleName: "",
  isActive: true,
  windows: phaseLabels.reduce((acc, phase) => {
    acc[phase.key] = { windowOpen: "", windowClose: "" };
    return acc;
  }, {}),
};

export default function CycleManagement() {
  const navigate = useNavigate();
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const load = async () => {
    try {
      setLoading(true);
      const res = await getCycles();
      setCycles(res.data || []);
    } catch {
      setError("Failed to load cycles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const activeCycle = useMemo(() => cycles.find((c) => c.is_active) || null, [cycles]);
  const pastCycles = useMemo(() => cycles.filter((c) => !c.is_active), [cycles]);

  const stages = useMemo(() => {
    if (!activeCycle) return [];
    return (activeCycle.windows || []).map((w) => {
      const now = new Date();
      return {
        label: w.phase,
        sublabel: `${formatDate(w.window_open)} → ${formatDate(w.window_close)}`,
        active: now >= new Date(w.window_open),
        complete: now > new Date(w.window_close)
      };
    });
  }, [activeCycle]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError("");
    setSaving(true);
    try {
      const windows = Object.entries(form.windows).map(([phase, value]) => ({
        phase,
        windowOpen: value.windowOpen,
        windowClose: value.windowClose
      }));
      await createCycle({
        cycleName: form.cycleName,
        isActive: form.isActive,
        windows
      });
      setShowModal(false);
      setForm(initialForm);
      showToast(`Cycle "${form.cycleName}" created successfully!`);
      load();
    } catch (err) {
      setSaveError(err?.response?.data?.message || "Failed to create cycle.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full -m-6 bg-[#F5F7FA]">
      <div className="p-6 space-y-6">

        {toast && (
          <div className="fixed top-4 right-4 z-50 bg-[#101828] text-white text-[13px] font-medium px-4 py-3 rounded-[10px] shadow-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#12B76A]">check_circle</span>
            {toast}
          </div>
        )}

        {/* Header */}
        <section className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold text-[#101828]">Cycle Management</h1>
            <p className="text-[14px] text-[#667085] mt-0.5">Govern performance cycles, timelines, and escalation rules.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate("/admin/escalations")}
              className="h-10 px-4 rounded-[8px] border border-[#D0D5DD] bg-white hover:bg-[#F9FAFB] text-[#344054] text-[13px] font-medium transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">notifications_active</span>
              Escalation Rules
            </button>
            <button
              onClick={() => { setShowModal(true); setSaveError(""); setForm(initialForm); }}
              className="h-10 px-4 rounded-[8px] bg-[#006C63] hover:bg-[#00564F] text-white text-[13px] font-medium transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Start New Cycle
            </button>
          </div>
        </section>

        {loading && (
          <div className="space-y-6">
            <section className="rounded-[12px] border border-[#D9E3E4] bg-white p-6 animate-pulse">
              <div className="flex justify-between mb-8">
                <div>
                  <div className="h-6 bg-gray-200 rounded w-24 mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-64"></div>
                </div>
                <div className="h-10 bg-gray-200 rounded w-32 hidden sm:block"></div>
              </div>
              <div className="h-2 bg-gray-200 rounded w-full mb-8"></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-[#DCE5E5] pt-5">
                {[...Array(4)].map((_, i) => (
                  <div key={i}>
                    <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </div>
                ))}
              </div>
            </section>
            
            <section className="bg-white border border-[#E4E9ED] rounded-[12px] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E4E9ED]">
                <div className="h-5 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="p-5 space-y-4 animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <div className="w-32 md:w-48 h-4 bg-gray-200 rounded"></div>
                    <div className="w-12 md:w-16 h-4 bg-gray-200 rounded"></div>
                    <div className="w-32 md:w-48 h-4 bg-gray-200 rounded hidden md:block"></div>
                    <div className="w-16 md:w-20 h-5 bg-gray-200 rounded shrink-0"></div>
                    <div className="w-20 md:w-24 h-4 bg-gray-200 rounded hidden lg:block"></div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
        {error && !loading && (
          <div className="text-[13px] text-[#B42318] bg-[#FEF3F2] border border-[#FECDCA] rounded-[8px] px-4 py-3">{error}</div>
        )}

        {!loading && !error && (
          <>
            {/* Active Cycle Card */}
            <section className="rounded-[12px] border border-[#D9E3E4] bg-gradient-to-br from-white to-[#F2FBFA] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex px-2.5 py-1 rounded-[6px] bg-[#E7F4F2] text-[#295F59] text-[12px] font-semibold mb-3">
                    {activeCycle ? "Active Now" : "No Active Cycle"}
                  </div>
                  <h2 className="text-[20px] font-bold text-[#1B1D1F]">
                    {activeCycle?.cycle_name || "No active cycle"}
                  </h2>
                  <p className="text-[14px] text-[#667085] mt-1">
                    {activeCycle ? `Current phase: ${activeCycle.phase || 'N/A'}` : "Create a cycle to begin the performance review period."}
                  </p>
                </div>
                {!activeCycle && (
                  <button
                    onClick={() => { setShowModal(true); setSaveError(""); setForm(initialForm); }}
                    className="h-10 px-4 rounded-[8px] bg-[#006C63] hover:bg-[#00564F] text-white text-[13px] font-medium transition-colors flex items-center gap-2 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Create Cycle
                  </button>
                )}
              </div>

              {activeCycle && stages.length > 0 && (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stages.map((stage, idx) => (
                    <div key={idx} className="border border-[#DCE5E5] rounded-[10px] p-4 bg-white">
                      <div className="text-[12px] text-[#667085]">{stage.label}</div>
                      <div className="text-[14px] font-semibold text-[#1B1D1F] mt-1">{stage.sublabel}</div>
                    </div>
                  ))}
                </div>
              )}

              {activeCycle && (
                <div className="mt-8 pt-5 border-t border-[#DCE5E5] grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Cycle Name", value: activeCycle.cycle_name },
                    { label: "Current Phase", value: activeCycle.phase || 'N/A' },
                    { label: "Total Windows", value: (activeCycle.windows || []).length },
                    { label: "Status", value: activeCycle.is_active ? 'Active' : 'Locked' },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="text-[12px] text-[#667085] mb-1">{item.label}</div>
                      <div className="text-[14px] font-semibold text-[#1B1D1F]">{item.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Past Cycles */}
            <section className="bg-white border border-[#E4E9ED] rounded-[12px] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E4E9ED] flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-[#101828]">Past Cycles</h2>
                <span className="text-[12px] text-[#667085]">{pastCycles.length} cycles</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-[#F2F4F7] bg-[#F9FAFB]">
                      {["Cycle Name", "Phase", "Period", "Status", "Created"].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-[#667085]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F9FAFB]">
                    {pastCycles.length === 0 && (
                      <tr><td colSpan={5} className="px-5 py-8 text-center text-[13px] text-[#667085]">
                        No past cycles. All historical cycles will appear here once they're deactivated.
                      </td></tr>
                    )}
                    {pastCycles.map(cycle => {
                      const windows = cycle.windows || [];
                      const opens = windows.map((w) => new Date(w.window_open));
                      const closes = windows.map((w) => new Date(w.window_close));
                      const rangeOpen = opens.length ? new Date(Math.min(...opens)) : null;
                      const rangeClose = closes.length ? new Date(Math.max(...closes)) : null;
                      return (
                      <tr key={cycle.id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="px-5 py-3 text-[13px] font-medium text-[#101828]">{cycle.cycle_name}</td>
                        <td className="px-5 py-3 text-[13px] text-[#344054]">{cycle.phase || 'N/A'}</td>
                        <td className="px-5 py-3 text-[12px] text-[#667085]">{formatDate(rangeOpen)} → {formatDate(rangeClose)}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-[6px] bg-[#F2F4F7] text-[#344054]">
                            <span className="material-symbols-outlined text-[12px]">lock</span>
                            Locked
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[12px] text-[#667085]">{formatDate(cycle.created_at)}</td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>

      {/* Create Cycle Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[560px] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-[#F2F4F7] flex items-center justify-between">
              <div>
                <h2 className="text-[17px] font-bold text-[#101828]">Start New Cycle</h2>
                <p className="text-[13px] text-[#667085] mt-0.5">This will deactivate the current active cycle.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-[6px] hover:bg-[#F2F4F7] flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-[18px] text-[#667085]">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto">
              {saveError && (
                <div className="text-[13px] text-[#B42318] bg-[#FEF3F2] border border-[#FECDCA] rounded-[8px] px-3 py-2">{saveError}</div>
              )}
              <div>
                <label className="block text-[12px] font-semibold text-[#344054] mb-1.5">Cycle Name *</label>
                <input required value={form.cycleName} onChange={e => setForm(p => ({...p, cycleName: e.target.value}))}
                  className="w-full h-10 px-3 rounded-[8px] border border-[#D0D5DD] text-[13px] text-[#101828] focus:outline-none focus:border-[#006C63] focus:ring-1 focus:ring-[#006C63]"
                  placeholder="e.g. Q1 2026 Performance Review" />
              </div>
              <div className="space-y-3">
                {phaseLabels.map((phase) => (
                  <div key={phase.key} className="border border-[#F2F4F7] rounded-[10px] p-3">
                    <div className="text-[12px] font-semibold text-[#344054] mb-3">{phase.label}</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[12px] font-semibold text-[#344054] mb-1.5">Window Open *</label>
                        <input
                          required
                          type="date"
                          value={form.windows[phase.key].windowOpen}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              windows: {
                                ...p.windows,
                                [phase.key]: {
                                  ...p.windows[phase.key],
                                  windowOpen: e.target.value,
                                },
                              },
                            }))
                          }
                          className="w-full h-10 px-3 rounded-[8px] border border-[#D0D5DD] text-[13px] text-[#101828] focus:outline-none focus:border-[#006C63]"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-semibold text-[#344054] mb-1.5">Window Close *</label>
                        <input
                          required
                          type="date"
                          value={form.windows[phase.key].windowClose}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              windows: {
                                ...p.windows,
                                [phase.key]: {
                                  ...p.windows[phase.key],
                                  windowClose: e.target.value,
                                },
                              },
                            }))
                          }
                          className="w-full h-10 px-3 rounded-[8px] border border-[#D0D5DD] text-[13px] text-[#101828] focus:outline-none focus:border-[#006C63]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-2 text-[13px] text-[#344054] cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({...p, isActive: e.target.checked}))}
                  className="w-4 h-4 rounded accent-[#006C63]" />
                Set as active cycle (deactivates current)
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 h-10 rounded-[8px] border border-[#D0D5DD] bg-white text-[#344054] text-[13px] font-medium hover:bg-[#F9FAFB] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 h-10 rounded-[8px] bg-[#006C63] hover:bg-[#00564F] text-white text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                      Creating...
                    </>
                  ) : (
                    "Create Cycle"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

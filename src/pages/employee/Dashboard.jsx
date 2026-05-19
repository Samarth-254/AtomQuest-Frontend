import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyGoalSheet } from '../../api/goalsApi';
import { getMyProgress } from '../../api/checkinApi';
import GoalDetailsModal from '../../components/GoalDetailsModal';
import toast from 'react-hot-toast';

const statusStyles = {
  APPROVED: 'bg-[#00685f]/10 text-[#00685f]',
  SUBMITTED: 'bg-[#f59e0b]/10 text-[#b45309]',
  DRAFT: 'bg-[#6b7280]/10 text-[#4b5563]',
  RETURNED: 'bg-[#ef4444]/10 text-[#b91c1c]',
};

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cycle, setCycle] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [goals, setGoals] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [allCheckins, setAllCheckins] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // Close actions menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadDashboardData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [sheetRes, progressRes] = await Promise.all([
        getMyGoalSheet(),
        getMyProgress({ all: true }),
      ]);

      const sheetData = sheetRes.data;
      setCycle(sheetData.cycle || null);
      setSheet(sheetData.sheet || null);
      setGoals(sheetData.goals || []);

      const map = {};
      (progressRes.data || []).forEach((row) => {
        const existing = map[row.goal_id];
        if (!existing) {
          map[row.goal_id] = { score: row.progress_score ?? 0, checkedAt: row.checked_in_at };
          return;
        }
        const currentTime = row.checked_in_at ? new Date(row.checked_in_at).getTime() : 0;
        const existingTime = existing.checkedAt ? new Date(existing.checkedAt).getTime() : 0;
        if (currentTime >= existingTime) {
          map[row.goal_id] = { score: row.progress_score ?? 0, checkedAt: row.checked_in_at };
        }
      });
      const scoreMap = Object.fromEntries(
        Object.entries(map).map(([goalId, meta]) => [goalId, meta.score])
      );
      setProgressMap(scoreMap);
      setAllCheckins(progressRes.data || []);
      setError('');
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData(true);
  }, [loadDashboardData]);

  useEffect(() => {
    const handleSocketEvent = (e) => {
      const { event } = e.detail;
      if (
        event === 'goal_approved' ||
        event === 'goal_returned' ||
        event === 'sheet_reopened' ||
        event === 'sheet_rejected' ||
        event === 'shared_goal_updated'
      ) {
        
        loadDashboardData(false); // Silent reload in background
      }
    };

    window.addEventListener('app_socket_event', handleSocketEvent);
    return () => {
      window.removeEventListener('app_socket_event', handleSocketEvent);
    };
  }, [loadDashboardData]);

  const totalWeightage = useMemo(
    () => goals.reduce((sum, goal) => sum + Number(goal.weightage || 0), 0),
    [goals]
  );

  const approvedCount = useMemo(
    () => (sheet?.status === 'APPROVED' ? goals.length : 0),
    [sheet, goals]
  );

  return (
    <div className="max-w-[1200px]">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-semibold leading-[32px] tracking-[-0.01em] text-[#191c1d]">
            Dashboard
          </h1>
          <p className="text-[14px] text-[#3d4947] mt-0.5">
            Welcome back, {user?.name || 'Alex'}. Here is your current performance snapshot.
          </p>
        </div>

        <button
          onClick={() => navigate('/goal-builder')}
          className="flex items-center gap-2 bg-[#00685f] hover:bg-[#005049] text-white text-[13px] font-medium px-4 py-2.5 rounded-[6px] transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Create New Goal Sheet
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {/* Progress */}
        <div className="bg-white border border-[#e1e3e4] rounded-[8px] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold tracking-[0.06em] uppercase text-[#3d4947]">
              H1 2026 Progress
            </span>
            <span className="material-symbols-outlined text-[18px] text-[#3d4947]">
              timelapse
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-[32px] font-bold leading-none text-[#191c1d]">
              {cycle?.phase || 'N/A'}
            </span>
            <span className="text-[13px] text-[#3d4947]">Active Cycle</span>
          </div>
          <div className="w-full h-1.5 bg-[#f3f4f5] rounded-full mb-3">
            <div
              className="h-1.5 bg-[#00685f] rounded-full"
              style={{ width: cycle?.is_active ? '100%' : '0%' }}
            />
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-[#3d4947]">
            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
            {cycle?.cycle_name || 'No active cycle'}
          </div>
        </div>

        {/* Goal Approval */}
        <div className="bg-white border border-[#e1e3e4] rounded-[8px] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold tracking-[0.06em] uppercase text-[#3d4947]">
              Goal Approval
            </span>
            <span className="material-symbols-outlined text-[18px] text-[#00685f]">
              check_circle
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-[32px] font-bold leading-none text-[#191c1d]">
              {approvedCount}/{goals.length || 0}
            </span>
            <span className="text-[13px] text-[#3d4947]">Approved</span>
          </div>
          <div className="bg-[#f3f4f5] rounded-[6px] px-3 py-2 text-[12px] text-[#3d4947]">
            Sheet Status: {sheet?.status || 'N/A'}
          </div>
        </div>

        {/* Next Check-in */}
        <div className="bg-white border border-[#e1e3e4] rounded-[8px] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold tracking-[0.06em] uppercase text-[#3d4947]">
              Next Check-in
            </span>
            <span className="material-symbols-outlined text-[18px] text-[#3d4947]">
              event
            </span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-[#d9dff5] flex items-center justify-center text-[13px] font-semibold text-[#404758]">
              {user?.name?.[0] || 'U'}
            </div>
            <div>
              <div className="text-[14px] font-medium text-[#191c1d]">
                Total Weightage
              </div>
              <div className="text-[12px] text-[#3d4947]">{totalWeightage}%</div>
            </div>
          </div>
          <div className="border-t border-[#f3f4f5] pt-3 flex items-center gap-1.5 text-[12px] text-[#3d4947]">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            {goals.length ? `${goals.length} goals active` : 'No goals yet'}
          </div>
        </div>
      </div>

      {/* My Active Goals */}
      <div className="bg-white border border-[#e1e3e4] rounded-[8px]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f4f5]">
          <h2 className="text-[15px] font-semibold text-[#191c1d]">My Active Goals</h2>
          <button
            onClick={() => navigate('/my-goals')}
            className="text-[13px] font-medium text-[#00685f] hover:underline"
          >
            View All
          </button>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_90px_100px_80px_120px_80px] gap-4 px-5 py-2.5 border-b border-[#f3f4f5]">
          {['Goal Title', 'Thrust Area', 'Target', 'Target Date', 'Weight', 'Status', 'Actions'].map((h) => (
            <span key={h} className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#3d4947]">
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {loading && (
          <div className="p-5 space-y-5 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-48"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="w-20 h-4 bg-gray-200 rounded shrink-0 hidden md:block"></div>
                <div className="w-16 h-4 bg-gray-200 rounded shrink-0"></div>
                <div className="w-16 h-4 bg-gray-200 rounded shrink-0 hidden lg:block"></div>
                <div className="w-12 h-4 bg-gray-200 rounded shrink-0"></div>
                <div className="w-20 h-6 bg-gray-200 rounded shrink-0"></div>
                <div className="w-8 h-8 bg-gray-200 rounded shrink-0"></div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="px-5 py-6 text-[14px] text-[#b91c1c]">{error}</div>
        )}

        {!loading && !error && goals.slice(0, 4).map((goal, i) => (
          <div
            key={goal.id}
            onClick={() => setSelectedGoal(goal)}
            className={`grid grid-cols-[2fr_1fr_90px_100px_80px_120px_80px] gap-4 px-5 py-4 items-center cursor-pointer ${i !== Math.min(goals.length, 4) - 1 ? 'border-b border-[#f3f4f5]' : ''
              } hover:bg-[#f8f9fa] transition-colors`}
          >
            {/* Title */}
            <div>
              <div className="text-[13px] font-medium text-[#191c1d]">{goal.title}</div>
              <div className="text-[12px] text-[#3d4947] mt-0.5">{goal.description}</div>
            </div>

            {/* Thrust Area */}
            <div>
              {goal.thrust_area_name ? (
                <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-[4px] bg-[#f3f4f5] text-[#3d4947]">
                  {goal.thrust_area_name}
                </span>
              ) : goal.is_shared ? (
                <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-[4px] bg-[#EEF4FF] text-[#3538CD]">
                  Dept. KPI
                </span>
              ) : (
                <span className="text-[11px] text-[#98A2B3]">—</span>
              )}
            </div>

            {/* Target Value */}
            <div className="text-[13px] font-medium text-[#191c1d]">
              {goal.target_value ? Number(goal.target_value).toLocaleString('en-IN') : <span className="text-[#98A2B3]">—</span>}
            </div>

            {/* Target Date */}
            <div className="text-[12px] text-[#667085]">
              {goal.target_date
                ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(goal.target_date))
                : <span className="text-[#98A2B3]">—</span>}
            </div>

            {/* Progress bar hidden here — moved out of target column */}

            {/* Weight */}
            <div className="text-[13px] font-medium text-[#191c1d]">
              {goal.weightage}%
            </div>

            {/* Status */}
            <div>
              <span className={`inline-block text-[11px] font-medium px-2.5 py-1 rounded-[4px] ${statusStyles[sheet?.status] || 'bg-[#f3f4f5] text-[#3d4947]'}`}>
                {sheet?.status || 'N/A'}
              </span>
            </div>

            {/* Actions */}
            <div className="relative" ref={openMenuId === goal.id ? menuRef : null} onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setOpenMenuId(openMenuId === goal.id ? null : goal.id)}
                className="w-7 h-7 flex items-center justify-center rounded-[4px] hover:bg-[#f3f4f5] text-[#3d4947] transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">more_horiz</span>
              </button>
              {openMenuId === goal.id && (
                <div className="absolute right-0 top-8 z-20 w-[160px] bg-white border border-[#E4E9ED] rounded-[8px] shadow-lg py-1">
                  <button
                    onClick={() => { setOpenMenuId(null); navigate('/checkin'); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#344054] hover:bg-[#f9fafb] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">edit_note</span>
                    Add Check-in
                  </button>
                  <button
                    onClick={() => { setOpenMenuId(null); setSelectedGoal(goal); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#344054] hover:bg-[#f9fafb] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                    View Details
                  </button>
                  {goal.is_shared && (
                    <div className="mx-3 my-1 h-px bg-[#f3f4f5]" />
                  )}
                  {goal.is_shared && (
                    <div className="px-3 py-1.5 flex items-center gap-1.5 text-[11px] text-[#3538CD]">
                      <span className="material-symbols-outlined text-[13px]">lock</span>
                      Dept. KPI — Read Only
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {/* Goal Details Popup */}
        {selectedGoal && (
          <GoalDetailsModal
            goal={{
              ...selectedGoal,
              progress_score: progressMap[selectedGoal.id] || selectedGoal.progress_score || 0
            }}
            checkins={allCheckins.filter(c => c.goal_id === selectedGoal.id && c.cycle_phase)}
            onClose={() => setSelectedGoal(null)}
          />
        )}
      </div>
    </div>
  );
}
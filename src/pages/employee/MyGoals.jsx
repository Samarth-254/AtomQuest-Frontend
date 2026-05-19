import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyGoalSheet } from '../../api/goalsApi';
import { getMyProgress } from '../../api/checkinApi';
import GoalDetailsModal from '../../components/GoalDetailsModal';

const statusClasses = {
  APPROVED: 'bg-[#dff4f1] text-[#0b6b63] border border-[#b7e4dd]',
  SUBMITTED: 'bg-[#eceef3] text-[#6b7280] border border-[#d7dbe4]',
  DRAFT: 'bg-[#eeeeee] text-[#5f6368] border border-[#d9d9d9]',
  RETURNED: 'bg-[#fdecec] text-[#c43d3d] border border-[#f2caca]',
  MOD_REQUESTED: 'bg-[#fff9e6] text-[#b27b16] border border-[#fdebb8]',
  EDITABLE: 'bg-[#f0faf8] text-[#00685f] border border-[#ccf2ed]'
};

export default function MyGoals() {
  const navigate = useNavigate();

  // ── Data ──────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sheetStatus, setSheetStatus] = useState('');
  const [goals, setGoals] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [allCheckins, setAllCheckins] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(null);

  // ── Search ────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');

  // ── Filter panel ─────────────────────────────────────────────────
  const [showFilter, setShowFilter] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterArea, setFilterArea] = useState('ALL');
  const filterRef = useRef(null);

  // ── Sort panel ────────────────────────────────────────────────────────────────
  const [showSort, setShowSort] = useState(false);
  const [sortKey, setSortKey] = useState('default');
  const [sortDir, setSortDir] = useState('asc');
  const sortRef = useRef(null);

  // ── Pagination ────────────────────────────────────────────────────────────────
  const PAGE_SIZE = 5;
  const [page, setPage] = useState(1);

  // ── Load data ─────────────────────────────────────────────────────
  const loadGoalsData = useCallback(async () => {
    try {
      const [sheetRes, progressRes] = await Promise.all([
        getMyGoalSheet(),
        getMyProgress({ all: true }),
      ]);
      setSheetStatus(sheetRes.data.sheet?.status || '');
      setGoals(sheetRes.data.goals || []);
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
    } catch {
      setError('Failed to load goals.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoalsData();
  }, [loadGoalsData]);

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
        
        loadGoalsData();
      }
    };

    window.addEventListener('app_socket_event', handleSocketEvent);
    return () => {
      window.removeEventListener('app_socket_event', handleSocketEvent);
    };
  }, [loadGoalsData]);

  // ── Close panels on outside click ─────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false);
      if (sortRef.current && !sortRef.current.contains(e.target)) setShowSort(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Unique thrust areas for filter ────────────────────────────────
  const thrustAreas = useMemo(() => {
    const seen = new Set();
    return goals
      .map(g => g.thrust_area_name || 'N/A')
      .filter(a => { if (seen.has(a)) return false; seen.add(a); return true; });
  }, [goals]);

  // ── Filtered + Sorted goals ───────────────────────────────────────
  const displayedGoals = useMemo(() => {
    let list = goals.filter(g => {
      const matchSearch =
        g.title.toLowerCase().includes(search.toLowerCase()) ||
        (g.thrust_area_name || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        filterStatus === 'ALL' || sheetStatus === filterStatus;
      const matchArea =
        filterArea === 'ALL' || (g.thrust_area_name || 'N/A') === filterArea;
      return matchSearch && matchStatus && matchArea;
    });

    if (sortKey !== 'default') {
      list = [...list].sort((a, b) => {
        let va, vb;
        if (sortKey === 'weightage') { va = Number(a.weightage); vb = Number(b.weightage); }
        else if (sortKey === 'title') { va = a.title.toLowerCase(); vb = b.title.toLowerCase(); }
        else if (sortKey === 'progress') { va = progressMap[a.id] || 0; vb = progressMap[b.id] || 0; }
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [goals, search, filterStatus, filterArea, sortKey, sortDir, progressMap, sheetStatus]);

  const totalWeightage = goals.reduce((s, g) => s + Number(g.weightage || 0), 0);
  const approvedCount = sheetStatus === 'APPROVED' ? goals.length : 0;
  const pendingCount = sheetStatus === 'SUBMITTED' ? goals.length : 0;
  const draftCount = sheetStatus === 'DRAFT' ? goals.length : 0;

  const activeFilterCount = (filterStatus !== 'ALL' ? 1 : 0) + (filterArea !== 'ALL' ? 1 : 0);

  // Reset to page 1 whenever filters/search/sort change
  const totalPages = Math.max(1, Math.ceil(displayedGoals.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedGoals = displayedGoals.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="max-w-[1240px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[24px] leading-[32px] tracking-[-0.01em] font-semibold text-[#191c1d]">My Goals</h1>
          <p className="text-[14px] leading-[20px] text-[#3d4947] mt-1">
            Manage and track your objectives for the current performance cycle.
          </p>
        </div>
        <button
          onClick={() => navigate('/goal-builder')}
          className="h-11 px-5 rounded-[6px] bg-[#00685f] hover:bg-[#005049] text-white text-[14px] font-medium transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Goal
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-[#d9e3e4] rounded-[8px] p-6">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#3d4947] mb-6">
            <span className="material-symbols-outlined text-[18px]">scale</span>
            Total Weightage
          </div>
          <div className="flex items-end gap-2 mb-6">
            <span className={`text-[44px] leading-none font-semibold ${totalWeightage > 100 ? 'text-red-600' : 'text-[#191c1d]'}`}>
              {totalWeightage}
            </span>
            <span className="text-[24px] leading-none text-[#3d4947] mb-1">%</span>
          </div>
          <div className="w-full h-1.5 bg-[#edeeef] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${totalWeightage > 100 ? 'bg-red-500' : 'bg-[#00685f]'}`}
              style={{ width: `${Math.min(100, totalWeightage)}%` }}
            />
          </div>
          {totalWeightage !== 100 && (
            <p className={`text-[12px] mt-2 ${totalWeightage > 100 ? 'text-red-500' : 'text-[#3d4947]'}`}>
              {totalWeightage > 100 ? `${totalWeightage - 100}% over limit` : `${100 - totalWeightage}% remaining`}
            </p>
          )}
        </div>

        <div className="bg-white border border-[#d9e3e4] rounded-[8px] p-6">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#3d4947] mb-6">
            <span className="material-symbols-outlined text-[18px]">fact_check</span>
            Active Goals
          </div>
          <div className="flex items-end gap-2 mb-4">
            <span className="text-[44px] leading-none font-semibold text-[#191c1d]">{goals.length}</span>
            <span className="text-[16px] text-[#3d4947] mb-1">/ 8 max</span>
          </div>
          <p className="text-[14px] text-[#3d4947]">
            {approvedCount} Approved, {pendingCount} Pending, {draftCount} Draft
          </p>
        </div>

        <div className="bg-white border border-[#d9e3e4] rounded-[8px] p-6 relative overflow-hidden">
          <div className="absolute right-5 top-5 opacity-10">
            <span className="material-symbols-outlined text-[84px] text-[#3d4947]">trending_up</span>
          </div>
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#3d4947] mb-6 relative z-10">
            <span className="material-symbols-outlined text-[18px]">flag</span>
            Sheet Status
          </div>
          <div className={`inline-flex items-center px-3 py-1 rounded-[8px] text-[16px] font-semibold mb-2 ${statusClasses[sheetStatus] || 'bg-[#eeeeee] text-[#5f6368] border border-[#d9d9d9]'}`}>
            {sheetStatus || 'NO SHEET'}
          </div>
          <p className="text-[14px] text-[#3d4947] relative z-10">
            {goals.length ? 'Goals overview' : 'No goals yet'}
          </p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-[#d9e3e4] rounded-[8px] overflow-visible">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 py-4 border-b border-[#edeeef]">
          {/* Search */}
          <div className="relative w-full max-w-[320px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#3d4947] text-[18px]">search</span>
            <input
              type="text"
              placeholder="Search goals..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-3 border border-[#d9e3e4] rounded-[6px] bg-white text-[14px] text-[#191c1d] placeholder:text-[#3d4947]/50 focus:outline-none focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f] transition-colors"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Filter button */}
            <div ref={filterRef} className="relative">
              <button
                onClick={() => { setShowFilter(v => !v); setShowSort(false); }}
                className={`h-9 px-3 rounded-[6px] border text-[13px] font-medium flex items-center gap-2 transition-colors ${activeFilterCount > 0 ? 'border-[#00685f] text-[#00685f] bg-[#f0faf8]' : 'border-[#d9e3e4] text-[#3d4947] hover:bg-[#f8f9fa]'}`}
              >
                <span className="material-symbols-outlined text-[17px]">filter_list</span>
                Filter
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#00685f] text-white text-[10px] flex items-center justify-center">{activeFilterCount}</span>
                )}
              </button>

              {showFilter && (
                <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[220px] bg-white border border-[#d9e3e4] rounded-[10px] shadow-xl p-4 space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#3d4947] mb-2">Status</label>
                    <select
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value)}
                      className="w-full h-9 px-2 border border-[#d9e3e4] rounded-[6px] text-[13px]"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="APPROVED">Approved</option>
                      <option value="SUBMITTED">Submitted</option>
                      <option value="DRAFT">Draft</option>
                      <option value="RETURNED">Returned</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#3d4947] mb-2">Thrust Area</label>
                    <select
                      value={filterArea}
                      onChange={e => setFilterArea(e.target.value)}
                      className="w-full h-9 px-2 border border-[#d9e3e4] rounded-[6px] text-[13px]"
                    >
                      <option value="ALL">All Areas</option>
                      {thrustAreas.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <button
                    onClick={() => { setFilterStatus('ALL'); setFilterArea('ALL'); setShowFilter(false); }}
                    className="w-full h-8 text-[12px] text-red-500 hover:bg-red-50 rounded-[6px] transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>

            {/* Sort button */}
            <div ref={sortRef} className="relative">
              <button
                onClick={() => { setShowSort(v => !v); setShowFilter(false); }}
                className={`h-9 px-3 rounded-[6px] border text-[13px] font-medium flex items-center gap-2 transition-colors ${sortKey !== 'default' ? 'border-[#00685f] text-[#00685f] bg-[#f0faf8]' : 'border-[#d9e3e4] text-[#3d4947] hover:bg-[#f8f9fa]'}`}
              >
                <span className="material-symbols-outlined text-[17px]">sort</span>
                Sort
                {sortKey !== 'default' && <span className="text-[10px] font-bold">✓</span>}
              </button>

              {showSort && (
                <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[200px] bg-white border border-[#d9e3e4] rounded-[10px] shadow-xl py-2">
                  {[
                    { key: 'default', label: 'Default Order' },
                    { key: 'title', label: 'Title (A–Z)' },
                    { key: 'weightage', label: 'Weightage' },
                    { key: 'progress', label: 'Progress %' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        if (sortKey === opt.key && opt.key !== 'default') {
                          setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortKey(opt.key);
                          setSortDir('asc');
                        }
                        setShowSort(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-[13px] transition-colors ${sortKey === opt.key ? 'text-[#00685f] bg-[#f0faf8]' : 'text-[#344054] hover:bg-[#f9fafb]'}`}
                    >
                      {opt.label}
                      {sortKey === opt.key && opt.key !== 'default' && (
                        <span className="material-symbols-outlined text-[14px]">
                          {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#edeeef] bg-white">
                <th className="px-6 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.08em] text-[#3d4947]">Goal Title</th>
                <th className="px-6 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.08em] text-[#3d4947]">Thrust Area</th>
                <th className="px-6 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.08em] text-[#3d4947]">Target</th>
                <th className="px-6 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.08em] text-[#3d4947]">Target Date</th>
                <th className="px-6 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.08em] text-[#3d4947]">Weightage</th>
                <th className="px-6 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.08em] text-[#3d4947]">Status</th>
                <th className="px-6 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.08em] text-[#3d4947]">Progress</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-[#edeeef]">
                    <td className="px-6 py-5">
                      <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-200 rounded w-12"></div></td>
                    <td className="px-6 py-5"><div className="h-6 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-6 py-5"><div className="h-2 bg-gray-200 rounded w-full"></div></td>
                  </tr>
                ))
              )}
              {error && !loading && (
                <tr><td className="px-6 py-8 text-[14px] text-[#b91c1c]" colSpan={7}>{error}</td></tr>
              )}
              {!loading && !error && displayedGoals.length === 0 && (
                <tr><td className="px-6 py-10 text-center text-[14px] text-[#3d4947]" colSpan={7}>No goals match your filters.</td></tr>
              )}
              {!loading && !error && pagedGoals.map(goal => (
                <tr key={goal.id} onClick={() => setSelectedGoal(goal)} className="border-b border-[#edeeef] hover:bg-[#f8f9fa] cursor-pointer transition-colors">
                  <td className="px-6 py-5">
                    <div className="text-[15px] font-medium text-[#191c1d]">{goal.title}</div>
                    {goal.is_shared && (
                      <span className="text-[11px] font-medium text-[#3538CD] bg-[#EEF4FF] px-1.5 py-0.5 rounded mt-0.5 inline-block">Dept. KPI</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-[15px] text-[#3d4947]">
                    {goal.thrust_area_name || <span className="text-[#98A2B3]">—</span>}
                  </td>
                  <td className="px-6 py-5 text-[14px] font-medium text-[#191c1d]">
                    {goal.target_value ? Number(goal.target_value).toLocaleString('en-IN') : <span className="text-[#98A2B3]">—</span>}
                  </td>
                  <td className="px-6 py-5 text-[13px] text-[#667085]">
                    {goal.target_date
                      ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(goal.target_date))
                      : <span className="text-[#98A2B3]">—</span>}
                  </td>
                  <td className="px-6 py-5 text-[15px] text-[#191c1d] font-medium">{goal.weightage}%</td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center px-3 py-1 rounded-[8px] text-[12px] font-medium ${statusClasses[sheetStatus] || 'bg-[#eeeeee] text-[#5f6368] border border-[#d9d9d9]'}`}>
                      {sheetStatus || 'DRAFT'}
                    </span>
                  </td>
                  <td className="px-6 py-5 min-w-[180px]">
                    <div className="flex items-center gap-4">
                      <div className="w-[104px] h-2 bg-[#edeeef] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#00685f] rounded-full"
                          style={{ width: `${Math.min(100, progressMap[goal.id] || 0)}%` }}
                        />
                      </div>
                      <span className="text-[14px] text-[#3d4947] min-w-[36px]">
                        {Math.min(100, progressMap[goal.id] || 0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 text-[14px] text-[#3d4947] border-t border-[#edeeef]">
          <span>Showing {pagedGoals.length} of {displayedGoals.length} goals{activeFilterCount > 0 ? ' (filtered)' : ''}</span>

          {/* Pagination controls */}
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setFilterStatus('ALL'); setFilterArea('ALL'); setSortKey('default'); setSearch(''); setPage(1); }}
                className="text-[#00685f] hover:underline font-medium text-[12px] mr-2"
              >
                Clear filters
              </button>
            )}
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="h-8 w-8 rounded-[6px] border border-[#d9e3e4] flex items-center justify-center text-[#3d4947] hover:bg-[#f0faf8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
            <span className="text-[13px] font-medium min-w-[80px] text-center">
              Page {safePage} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="h-8 w-8 rounded-[6px] border border-[#d9e3e4] flex items-center justify-center text-[#3d4947] hover:bg-[#f0faf8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
        </div>
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
import { useEffect, useMemo, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { getGoalSheets, unlockGoalSheet } from '../../api/adminApi';

const statusStyles = {
  APPROVED: 'bg-[#ECFDF3] text-[#027A48]',
  SUBMITTED: 'bg-[#EEF4FF] text-[#3538CD]',
  DRAFT:     'bg-[#F2F4F7] text-[#344054]',
  RETURNED:  'bg-[#FEF3F2] text-[#B42318]',
};

const uomLabels = {
  MAX:      'Maximize ↑ (Higher is Better)',
  MIN:      'Minimize ↓ (Lower is Better)',
  TIMELINE: 'Timeline (Date-based)',
  ZERO:     'Zero-based (0 = Success)',
};

// ── Goal Detail + Edit Drawer ──────────────────────────────────────────────────
function GoalDrawer({ sheet: initialSheet, onClose, onActionDone }) {
  const [goals, setGoals]             = useState([]);
  const [sheet, setSheet]             = useState(initialSheet);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [savingGoalId, setSavingGoal] = useState(null);
  const [approving, setApproving]     = useState(false);
  const [returning, setReturning]     = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [showReturn, setShowReturn]   = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/manager/sheet/${initialSheet.id}`);
      setSheet(res.data.sheet || initialSheet);
      setGoals(
        (res.data.goals || []).map(g => ({
          ...g,
          _title:       g.title || '',
          _description: g.description || '',
          _uomType:     g.uom_type || 'MAX',
          _targetValue: g.target_value ?? '',
          _targetDate:  g.target_date ? g.target_date.split('T')[0] : '',
          _weightage:   g.weightage ?? 0,
          _dirty: false,
        }))
      );
    } catch {
      setError('Failed to load goals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [initialSheet.id]);

  const updateField = (id, field, value) => {
    setGoals(prev => prev.map(g =>
      g.id === id ? { ...g, [field]: value, _dirty: true } : g
    ));
  };

  const handleSaveGoal = async (goal) => {
    setSavingGoal(goal.id);
    try {
      await api.put(`/manager/goal/${goal.id}`, {
        title:       goal._title,
        description: goal._description,
        uomType:     goal._uomType,
        targetValue: goal._targetValue || null,
        targetDate:  goal._targetDate  || null,
        weightage:   goal._weightage,
      });
      toast.success(`Goal "${goal._title}" updated.`);
      // Mark as clean
      setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, _dirty: false } : g));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update goal.');
    } finally {
      setSavingGoal(null);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      await api.post(`/manager/approve/${initialSheet.id}`);
      toast.success('Goal sheet approved and locked!');
      onActionDone();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to approve sheet.');
    } finally {
      setApproving(false);
    }
  };

  const handleReturn = async () => {
    if (!returnReason.trim()) { toast.error('Return reason is required.'); return; }
    setReturning(true);
    try {
      await api.post(`/manager/return/${initialSheet.id}`, { reason: returnReason.trim() });
      toast.success('Sheet returned to employee for rework.');
      onActionDone();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to return sheet.');
    } finally {
      setReturning(false);
    }
  };

  const totalWeightage = useMemo(
    () => goals.reduce((s, g) => s + Number(g._weightage || 0), 0),
    [goals]
  );

  const canApprove = sheet.status === 'SUBMITTED' || sheet.status === 'RETURNED';

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-[700px] bg-white z-50 shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E4E9ED] shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[17px] font-bold text-[#101828]">{sheet.employee_name}'s Goal Sheet</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[12px] text-[#667085]">{sheet.employee_email}</span>
                <span className="text-[11px] text-[#667085]">·</span>
                <span className="text-[12px] text-[#667085]">{sheet.cycle_name}</span>
                <span className={`inline-flex px-2 py-0.5 rounded-[6px] text-[11px] font-semibold ${statusStyles[sheet.status] || 'bg-[#F2F4F7] text-[#344054]'}`}>
                  {sheet.status}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-[6px] hover:bg-[#F2F4F7] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px] text-[#667085]">close</span>
            </button>
          </div>

          {/* Action bar: Approve / Return (only when actionable) */}
          {canApprove && (
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleApprove}
                disabled={approving || returning}
                className="h-9 px-4 rounded-[6px] bg-[#006C63] hover:bg-[#00564F] text-white text-[13px] font-medium flex items-center gap-2 disabled:opacity-60 transition-colors disabled:cursor-not-allowed"
              >
                {approving ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    Approving…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Approve & Lock
                  </>
                )}
              </button>
              <button
                onClick={() => setShowReturn(v => !v)}
                disabled={approving || returning}
                className="h-9 px-4 rounded-[6px] border border-[#FDA29B] text-[#B42318] bg-white hover:bg-[#FEF3F2] text-[13px] font-medium flex items-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[16px]">undo</span>
                Return for Rework
              </button>
            </div>
          )}

          {/* Return reason box */}
          {showReturn && (
            <div className="mt-3 space-y-2">
              <textarea
                rows={2}
                value={returnReason}
                onChange={e => setReturnReason(e.target.value)}
                disabled={approving || returning}
                placeholder="Reason for returning this sheet (required)…"
                className="w-full px-3 py-2 border border-[#FDA29B] rounded-[6px] text-[13px] text-[#101828] focus:outline-none focus:ring-1 focus:ring-[#B42318] resize-none disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleReturn}
                disabled={approving || returning}
                className="h-8 px-4 rounded-[6px] bg-[#B42318] text-white text-[12px] font-medium disabled:opacity-60 transition-colors disabled:cursor-not-allowed"
              >
                {returning ? (
                  <span className="flex items-center gap-1.5 justify-center">
                    <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                    Returning…
                  </span>
                ) : 'Confirm Return'}
              </button>
            </div>
          )}
        </div>

        {/* Goals Table */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="text-center py-12 text-[14px] text-[#667085]">
              <span className="material-symbols-outlined text-[28px] block mb-2">progress_activity</span>Loading goals…
            </div>
          )}
          {error && !loading && (
            <div className="text-center py-8 text-[13px] text-[#B42318]">{error}</div>
          )}
          {!loading && !error && goals.length === 0 && (
            <div className="text-center py-12 text-[14px] text-[#667085]">No goals found for this sheet.</div>
          )}

          {!loading && !error && goals.length > 0 && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F2F4F7] bg-[#F9FAFB]">
                  {['#', 'Goal / Description', 'Target Value', 'Target Date', 'Weightage %', 'Save'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.08em] font-semibold text-[#667085] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9FAFB]">
                {goals.map((goal, i) => (
                  <tr key={goal.id} className={`${goal._dirty ? 'bg-[#FFFBEB]' : 'hover:bg-[#F9FAFB]'} transition-colors`}>
                    <td className="px-4 py-3 text-[12px] font-bold text-[#667085]">{i + 1}</td>
                    <td className="px-4 py-3 min-w-[240px]">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <input
                          type="text"
                          value={goal._title}
                          onChange={e => updateField(goal.id, '_title', e.target.value)}
                          className="w-full h-8 px-2 border border-[#D0D5DD] rounded-[6px] text-[13px] font-semibold text-[#101828] focus:outline-none focus:border-[#006C63] focus:ring-1 focus:ring-[#006C63]"
                          placeholder="Goal Title..."
                        />
                        {goal.is_shared && (
                          <span className="text-[9px] font-medium text-[#3538CD] bg-[#EEF4FF] px-1.5 py-0.5 rounded shrink-0">KPI</span>
                        )}
                      </div>
                      <textarea
                        rows={2}
                        value={goal._description}
                        onChange={e => updateField(goal.id, '_description', e.target.value)}
                        className="w-full px-2 py-1 border border-[#D0D5DD] rounded-[6px] text-[11px] text-[#475467] focus:outline-none focus:border-[#006C63] focus:ring-1 focus:ring-[#006C63] resize-none mb-1.5"
                        placeholder="Goal Description..."
                      />
                      <select
                        value={goal._uomType}
                        onChange={e => updateField(goal.id, '_uomType', e.target.value)}
                        className="w-full h-8 px-1.5 border border-[#D0D5DD] rounded-[6px] text-[11px] text-[#475467] focus:outline-none focus:border-[#006C63] focus:ring-1 focus:ring-[#006C63] bg-white"
                      >
                        <option value="MAX">Maximize ↑ (Higher is Better)</option>
                        <option value="MIN">Minimize ↓ (Lower is Better)</option>
                        <option value="TIMELINE">Timeline (Date-based)</option>
                        <option value="ZERO">Zero-based (0 = Success)</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={goal._targetValue}
                        onChange={e => updateField(goal.id, '_targetValue', e.target.value)}
                        className="h-9 w-[100px] px-2 border border-[#D0D5DD] rounded-[6px] text-[13px] text-[#101828] focus:outline-none focus:border-[#006C63] focus:ring-1 focus:ring-[#006C63]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        value={goal._targetDate}
                        onChange={e => updateField(goal.id, '_targetDate', e.target.value)}
                        className="h-9 px-2 border border-[#D0D5DD] rounded-[6px] text-[13px] text-[#101828] focus:outline-none focus:border-[#006C63] focus:ring-1 focus:ring-[#006C63]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={10}
                        max={100}
                        value={goal._weightage}
                        onChange={e => updateField(goal.id, '_weightage', Number(e.target.value))}
                        className="h-9 w-[72px] px-2 border border-[#D0D5DD] rounded-[6px] text-[13px] text-[#101828] focus:outline-none focus:border-[#006C63] focus:ring-1 focus:ring-[#006C63]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleSaveGoal(goal)}
                        disabled={savingGoalId === goal.id || !goal._dirty}
                        className="h-8 px-3 rounded-[6px] bg-[#006C63] hover:bg-[#00564F] text-white text-[11px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        {savingGoalId === goal.id ? (
                          <>
                            <span className="material-symbols-outlined text-[13px] animate-spin">progress_activity</span>
                            Saving...
                          </>
                        ) : 'Save'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer: weightage summary */}
        {!loading && !error && goals.length > 0 && (
          <div className="px-6 py-3 border-t border-[#E4E9ED] bg-[#F9FAFB] shrink-0 flex items-center justify-between">
            <span className="text-[13px] text-[#344054]">
              <strong>{goals.length}</strong> goals · Total weightage:{' '}
              <strong className={totalWeightage === 100 ? 'text-[#027A48]' : 'text-[#B42318]'}>
                {totalWeightage}%
              </strong>
              {totalWeightage !== 100 && (
                <span className="text-[11px] text-[#B42318] ml-1">(must be 100% to approve)</span>
              )}
            </span>
            <div className="flex items-center gap-1 text-[11px]">
              {sheet.is_locked
                ? <span className="text-[#B42318] flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">lock</span>Locked</span>
                : <span className="text-[#027A48] flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">lock_open</span>Editable</span>
              }
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function GoalSheetsAdmin() {
  const [sheets, setSheets]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('ALL');
  const [unlocking, setUnlocking] = useState(null);
  const [viewing, setViewing]     = useState(null);
  const [page, setPage]           = useState(1);
  const PAGE_SIZE = 5;

  const loadGoalSheets = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await getGoalSheets();
      setSheets(res.data || []);
      setError('');
    } catch {
      setError('Failed to load goal sheets.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => { loadGoalSheets(true); }, [loadGoalSheets]);

  useEffect(() => {
    const handleSocketEvent = (e) => {
      const { event } = e.detail;
      if (
        event === 'goal_submitted' ||
        event === 'goal_approved' ||
        event === 'goal_returned' ||
        event === 'sheet_reopened' ||
        event === 'sheet_rejected' ||
        event === 'shared_goal_updated' ||
        event === 'checkin_completed'
      ) {
        
        loadGoalSheets(false); // Silent reload in background
      }
    };

    window.addEventListener('app_socket_event', handleSocketEvent);
    return () => {
      window.removeEventListener('app_socket_event', handleSocketEvent);
    };
  }, [loadGoalSheets]);

  const filtered = useMemo(() =>
    sheets.filter(s => {
      const q = search.toLowerCase();
      const matchQ = !search ||
        (s.employee_name || '').toLowerCase().includes(q) ||
        (s.employee_email || '').toLowerCase().includes(q) ||
        (s.department || '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
      return matchQ && matchStatus;
    }), [sheets, search, statusFilter]);

  const handleUnlock = async (sheet) => {
    if (!window.confirm(`Unlock sheet for ${sheet.employee_name}? Status → RETURNED, employee can edit and re-submit.`)) return;
    setUnlocking(sheet.id);
    try {
      await unlockGoalSheet(sheet.id);
      toast.success(`Sheet for ${sheet.employee_name} unlocked.`);
      loadGoalSheets();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to unlock sheet.');
    } finally {
      setUnlocking(null);
    }
  };

  const counts = useMemo(() => {
    const c = { ALL: sheets.length, APPROVED: 0, SUBMITTED: 0, DRAFT: 0, RETURNED: 0 };
    sheets.forEach(s => { if (c[s.status] !== undefined) c[s.status]++; });
    return c;
  }, [sheets]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pagedSheets = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="h-full -m-6 bg-[#F5F7FA]">
      <div className="p-6 space-y-5">

        {/* Header */}
        <section className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold text-[#101828]">Goal Sheets Management</h1>
            <p className="text-[14px] text-[#667085] mt-0.5">
              View, edit targets, approve or return any employee's goal sheet.
            </p>
          </div>
          <button
            onClick={() => loadGoalSheets()}
            disabled={loading}
            className="h-10 px-4 rounded-[8px] border border-[#D0D5DD] bg-white hover:bg-[#F9FAFB] text-[#344054] text-[13px] font-medium flex items-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>
              {loading ? 'progress_activity' : 'refresh'}
            </span>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </section>

        {/* Status tabs */}
        <section className="flex flex-wrap gap-2">
          {['ALL', 'SUBMITTED', 'APPROVED', 'RETURNED', 'DRAFT'].map(s => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`h-9 px-4 rounded-[8px] text-[13px] font-medium transition-colors border ${statusFilter === s ? 'bg-[#006C63] text-white border-[#006C63]' : 'bg-white text-[#344054] border-[#D0D5DD] hover:bg-[#F9FAFB]'}`}
            >
              {s} <span className="ml-1 opacity-75">({counts[s] ?? 0})</span>
            </button>
          ))}
        </section>
        {/* Search */}
        <section>
          <div className="relative max-w-[380px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] text-[16px]">search</span>
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by employee, email, department..."
              className="w-full h-10 pl-9 pr-3 rounded-[8px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:border-[#006C63] focus:ring-1 focus:ring-[#006C63]"
            />
          </div>
        </section>

        {/* Table */}
        <section className="bg-white border border-[#E4E9ED] rounded-[12px] overflow-hidden">
          {loading && (
            <div className="p-5 space-y-5 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <div className="flex-1 space-y-1">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                  <div className="w-24 h-4 bg-gray-200 rounded hidden sm:block"></div>
                  <div className="w-24 h-4 bg-gray-200 rounded hidden md:block"></div>
                  <div className="w-16 h-5 bg-gray-200 rounded shrink-0"></div>
                  <div className="w-20 h-4 bg-gray-200 rounded hidden lg:block"></div>
                  <div className="w-16 h-4 bg-gray-200 rounded hidden xl:block"></div>
                  <div className="w-24 h-8 bg-gray-200 rounded shrink-0"></div>
                </div>
              ))}
            </div>
          )}
          {error && !loading && <div className="px-5 py-6 text-center text-[13px] text-[#B42318]">{error}</div>}
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="border-b border-[#F2F4F7] bg-[#F9FAFB]">
                    {['Employee', 'Department', 'Cycle', 'Status', 'Submitted', 'Locked', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-[#667085]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9FAFB]">
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-10 text-center text-[13px] text-[#667085]">No goal sheets found.</td></tr>
                  )}
                  {pagedSheets.map(sheet => (
                    <tr key={sheet.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-5 py-3">
                        <div className="text-[13px] font-medium text-[#101828]">{sheet.employee_name}</div>
                        <div className="text-[11px] text-[#667085]">{sheet.employee_email}</div>
                      </td>
                      <td className="px-5 py-3 text-[13px] text-[#344054]">{sheet.department || '—'}</td>
                      <td className="px-5 py-3 text-[13px] text-[#344054]">{sheet.cycle_name}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-[6px] text-[11px] font-semibold ${statusStyles[sheet.status] || 'bg-[#F2F4F7] text-[#344054]'}`}>
                          {sheet.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[12px] text-[#667085] whitespace-nowrap">
                        {sheet.submitted_at
                          ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(sheet.submitted_at))
                          : '—'}
                      </td>
                      <td className="px-5 py-3">
                        {sheet.is_locked
                          ? <span className="inline-flex items-center gap-1 text-[11px] text-[#B42318]"><span className="material-symbols-outlined text-[13px]">lock</span>Locked</span>
                          : <span className="inline-flex items-center gap-1 text-[11px] text-[#027A48]"><span className="material-symbols-outlined text-[13px]">lock_open</span>Open</span>
                        }
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {/* View + Edit (opens drawer with full edit capability) */}
                          <button
                            onClick={() => setViewing(sheet)}
                            className="h-8 px-3 rounded-[6px] bg-[#006C63] hover:bg-[#00564F] text-white text-[12px] font-medium flex items-center gap-1.5 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit_note</span>
                            View & Edit
                          </button>
                          {/* Unlock (for exception handling on locked sheets) */}
                          {sheet.is_locked && (
                            <button
                              onClick={() => handleUnlock(sheet)}
                              disabled={unlocking === sheet.id}
                              className="h-8 px-3 rounded-[6px] border border-[#D0D5DD] bg-white hover:bg-[#FEF3F2] hover:border-[#FDA29B] text-[#B42318] text-[12px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {unlocking === sheet.id ? (
                                <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                              ) : (
                                <span className="material-symbols-outlined text-[14px]">lock_open</span>
                              )}
                              {unlocking === sheet.id ? 'Unlocking…' : 'Unlock'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-5 py-3 border-t border-[#F2F4F7] flex items-center justify-between">
            <span className="text-[13px] text-[#667085]">Showing {pagedSheets.length} of {filtered.length} sheets</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="h-8 w-8 rounded-[6px] border border-[#D0D5DD] flex items-center justify-center text-[#344054] hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              <span className="text-[13px] font-medium min-w-[80px] text-center text-[#344054]">
                Page {safePage} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="h-8 w-8 rounded-[6px] border border-[#D0D5DD] flex items-center justify-center text-[#344054] hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        </section>

        <div className="text-[12px] text-[#667085] bg-[#F9FAFB] border border-[#E4E9ED] rounded-[8px] px-4 py-3 flex gap-2">
          <span className="material-symbols-outlined text-[15px] text-[#344054] shrink-0 mt-0.5">info</span>
          <span>
            <strong>Admin powers (BRD §3):</strong> As Admin/HR, you can edit target values, dates & weightages on any sheet, then Approve or Return it — same capabilities as a Manager, applied to any employee across all departments.
          </span>
        </div>
      </div>

      {viewing && (
        <GoalDrawer
          sheet={viewing}
          onClose={() => setViewing(null)}
          onActionDone={() => { loadGoalSheets(); }}
        />
      )}
    </div>
  );
}

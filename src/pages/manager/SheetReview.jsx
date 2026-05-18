import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  approveSheet,
  getSheetDetails,
  returnSheet,
  updateGoalAsManager,
  approveModification,
  rejectModification
} from '../../api/managerApi';

const statusStyles = {
  APPROVED: 'bg-[#ECFDF3] text-[#027A48] border border-[#D1FADF]',
  SUBMITTED: 'bg-[#EEF4FF] text-[#3538CD] border border-[#C7D7FE]',
  DRAFT: 'bg-[#F2F4F7] text-[#344054] border border-[#E4E7EC]',
  RETURNED: 'bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]',
  MOD_REQUESTED: 'bg-[#FFF9E6] text-[#B27B16] border border-[#FDEBB8]',
  EDITABLE: 'bg-[#F0FAF8] text-[#006C63] border border-[#CCF2ED]',
};

export default function SheetReview() {
  const { sheetId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState(null);
  const [goals, setGoals] = useState([]);
  const [returnReason, setReturnReason] = useState('');
  const [submitting, setSubmitting] = useState(null);

  // Track expanded cards
  const [expandedGoals, setExpandedGoals] = useState({});

  const loadSheetDetails = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await getSheetDetails(sheetId);
      setSheet(res.data.sheet);
      const goalsData = (res.data.goals || []).map((goal) => ({
        id: goal.id,
        title: goal.title,
        description: goal.description,
        uomType: goal.uom_type || 'MAX',
        targetValue: goal.target_value || '',
        targetDate: goal.target_date ? goal.target_date.split('T')[0] : '',
        weightage: goal.weightage || 0,
        isShared: goal.is_shared,
        progress: goal.progress_score || 0
      }));
      setGoals(goalsData);

      // Auto-expand all goals initially
      const expansions = {};
      goalsData.forEach(g => { expansions[g.id] = true; });
      setExpandedGoals(expansions);
      setError('');
    } catch (err) {
      setError('Failed to load sheet details.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [sheetId]);

  useEffect(() => {
    loadSheetDetails(true);
  }, [loadSheetDetails]);

  useEffect(() => {
    const handleSocketEvent = (e) => {
      const { event } = e.detail;
      if (event === 'goal_submitted') {
        
        loadSheetDetails(false); // Silent reload in background
      }
    };

    window.addEventListener('app_socket_event', handleSocketEvent);
    return () => {
      window.removeEventListener('app_socket_event', handleSocketEvent);
    };
  }, [loadSheetDetails]);

  const toggleExpand = (id) => {
    setExpandedGoals(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const updateGoalField = (id, field, value) => {
    setGoals((prev) =>
      prev.map((goal) => (goal.id === id ? { ...goal, [field]: value } : goal))
    );
  };

  const handleSaveGoal = async (goal) => {
    try {
      await updateGoalAsManager(goal.id, {
        targetValue: goal.targetValue,
        targetDate: goal.targetDate || null,
        weightage: goal.weightage,
      });
      toast.success(`Goal "${goal.title}" updated.`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update goal.');
    }
  };

  const handleApprove = async () => {
    if (submitting) return;
    setSubmitting('APPROVE');
    try {
      await approveSheet(sheetId);
      toast.success('Sheet approved and locked successfully.');
      navigate('/manager/team-members');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to approve sheet.');
    } finally {
      setSubmitting(null);
    }
  };

  const handleReturn = async () => {
    if (!returnReason.trim()) {
      toast.error('Return reason is required.');
      return;
    }
    if (submitting) return;
    setSubmitting('RETURN');
    try {
      await returnSheet(sheetId, { reason: returnReason.trim() });
      toast.success('Sheet returned to employee for rework.');
      navigate('/manager/team-members');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to return sheet.');
    } finally {
      setSubmitting(null);
    }
  };

  const handleApproveModification = async () => {
    if (submitting) return;
    setSubmitting('APPROVE_MOD');
    try {
      await approveModification(sheetId);
      toast.success('Modification request approved. Sheet is now unlocked and editable.');
      navigate('/manager/team-members');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to approve modification.');
    } finally {
      setSubmitting(null);
    }
  };

  const handleRejectModification = async () => {
    if (submitting) return;
    setSubmitting('REJECT_MOD');
    try {
      await rejectModification(sheetId, { reason: returnReason.trim() });
      toast.success('Modification request rejected. Sheet remains locked.');
      navigate('/manager/team-members');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to reject modification.');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="max-w-[1240px] space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-[13px] text-[#667085]">
        <span className="cursor-pointer hover:text-[#101828]" onClick={() => navigate('/manager/team-members')}>Team Members</span>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[#667085] truncate">{sheet?.employee_name || 'Review'}</span>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[#101828] font-medium">Sheet Review</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#101828]">Sheet Review</h1>
          <p className="text-[14px] text-[#667085] mt-0.5">
            Evaluate, edit targets/weights and lock the active goal sheet for <span className="font-semibold text-[#101828]">{sheet?.employee_name}</span>.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-3">
          {sheet?.status === 'MOD_REQUESTED' ? (
            <>
              <button
                onClick={handleRejectModification}
                disabled={!!submitting}
                className="h-10 px-4 rounded-[8px] border border-[#FDA29B] text-[#B42318] bg-white hover:bg-[#FEF3F2] text-[13.5px] font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting === 'REJECT_MOD' ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    Rejecting...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">block</span>
                    Reject Request
                  </>
                )}
              </button>
              <button
                onClick={handleApproveModification}
                disabled={!!submitting}
                className="h-10 px-4 rounded-[8px] bg-[#006C63] hover:bg-[#00564F] text-white text-[13.5px] font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting === 'APPROVE_MOD' ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    Unlocking...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">lock_open</span>
                    Approve Unlock
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleReturn}
                disabled={!!submitting}
                className="h-10 px-4 rounded-[8px] border border-[#FDA29B] text-[#B42318] bg-white hover:bg-[#FEF3F2] text-[13.5px] font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting === 'RETURN' ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    Returning...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">undo</span>
                    Return Sheet
                  </>
                )}
              </button>
              <button
                onClick={handleApprove}
                disabled={!!submitting}
                className="h-10 px-4 rounded-[8px] bg-[#006C63] hover:bg-[#00564F] text-white text-[13.5px] font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting === 'APPROVE' ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    Approving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    Approve & Lock
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status & Return Input */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[#E4E9ED] rounded-[12px] p-5 shadow-xs space-y-3">
          <label className="block text-[13px] font-bold uppercase tracking-wider text-[#667085]">
            Rework Feedback Notes
          </label>
          <textarea
            rows="2"
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            placeholder="Provide constructive feedback if you are returning this sheet for rework..."
            className="w-full px-4 py-3 border border-[#D0D5DD] rounded-[8px] bg-white text-[13.5px] text-[#101828] placeholder:text-[#667085]/60 focus:outline-none focus:border-[#006C63] focus:ring-1 focus:ring-[#006C63] transition-colors resize-none shadow-xs"
          />
        </div>

        <div className="bg-white border border-[#E4E9ED] rounded-[12px] p-5 shadow-xs space-y-3 flex flex-col justify-center">
          <span className="text-[12px] font-bold uppercase tracking-wider text-[#667085]">Sheet Parameters</span>
          <div className="space-y-1.5 text-[13.5px]">
            <div className="flex justify-between">
              <span className="text-[#667085]">Sheet Status:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusStyles[sheet?.status] || 'bg-[#F2F4F7] text-[#344054]'}`}>
                {sheet?.status || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667085]">Active Period:</span>
              <span className="font-bold text-[#101828]">{sheet?.cycle_name || 'Active Cycle'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Goals Accordion / Cards List */}
      <div className="space-y-4">
        <h3 className="text-[15px] font-bold text-[#101828]">Assigned Objectives & Targets ({goals.length})</h3>

        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-[#E4E9ED] rounded-[12px] p-6 animate-pulse space-y-4">
                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-10 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] px-4 py-3 rounded-[8px] text-[13.5px]">{error}</div>
        )}

        {!loading && !error && goals.length === 0 && (
          <div className="bg-white border border-[#E4E9ED] rounded-[12px] p-12 text-center">
            <span className="material-symbols-outlined text-[48px] text-[#D0D5DD]">assignment_late</span>
            <p className="text-[14px] text-[#667085] mt-2">All caught up 🎉 You have no pending goals to review.</p>
          </div>
        )}

        {!loading && !error && goals.map((goal, index) => {
          const isExpanded = expandedGoals[goal.id];
          return (
            <div
              key={goal.id}
              className={`bg-white border border-[#E4E9ED] rounded-[12px] shadow-xs overflow-hidden transition-all duration-200 ${
                isExpanded ? 'ring-1 ring-[#006C63]/15' : ''
              }`}
            >
              {/* Accordion Header */}
              <div
                onClick={() => toggleExpand(goal.id)}
                className="px-5 py-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#F9FAFB] transition-colors select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[#006C63]/10 text-[#006C63] font-bold text-[11px] flex items-center justify-center shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[14px] font-bold text-[#101828] truncate">{goal.title}</h4>
                    <p className="text-[12px] text-[#667085] truncate mt-0.5">{goal.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] font-bold bg-[#F2F4F7] text-[#344054] px-2 py-0.5 rounded-[4px] uppercase tracking-wider">
                    {goal.uomType}
                  </span>
                  <span className="text-[12px] font-bold text-[#101828] bg-[#E7F4F2] text-[#006C63] px-2.5 py-0.5 rounded-[6px]">
                    Weight: {goal.weightage}%
                  </span>
                  <span className={`material-symbols-outlined text-[20px] text-[#667085] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </div>
              </div>

              {/* Accordion Expandable Body */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-1 border-t border-[#F2F4F7] space-y-4">
                  {/* Progress Indicator */}
                  <div className="space-y-1 bg-[#F9FAFB] p-3 rounded-[8px] border border-[#E4E9ED]">
                    <div className="flex justify-between text-[11.5px] font-bold text-[#101828]">
                      <span className="text-[#667085] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">track_changes</span>
                        Current Progress Score
                      </span>
                      <span>{goal.progress}%</span>
                    </div>
                    <div className="w-full bg-[#E4E9ED] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#006C63] h-full rounded-full transition-all duration-300"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Inline Target Edit Form */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-[12px] font-bold text-[#667085] uppercase tracking-wider mb-2">Target Value</label>
                      <input
                        type="text"
                        value={goal.targetValue}
                        onChange={(e) => updateGoalField(goal.id, 'targetValue', e.target.value)}
                        disabled={goal.uomType === 'TIMELINE'}
                        placeholder="e.g. 100000"
                        className="w-full h-10 px-3 border border-[#D0D5DD] rounded-[8px] text-[13px] text-[#101828] focus:outline-none focus:border-[#006C63] focus:ring-1 focus:ring-[#006C63] disabled:bg-gray-100 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold text-[#667085] uppercase tracking-wider mb-2">Target Date</label>
                      <input
                        type="date"
                        value={goal.targetDate}
                        onChange={(e) => updateGoalField(goal.id, 'targetDate', e.target.value)}
                        className="w-full h-10 px-3 border border-[#D0D5DD] rounded-[8px] text-[13px] text-[#101828] focus:outline-none focus:border-[#006C63] focus:ring-1 focus:ring-[#006C63] shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold text-[#667085] uppercase tracking-wider mb-2">Weightage (%)</label>
                      <div className="flex gap-3">
                        <input
                          type="number"
                          value={goal.weightage}
                          onChange={(e) => updateGoalField(goal.id, 'weightage', Number(e.target.value))}
                          className="flex-1 h-10 px-3 border border-[#D0D5DD] rounded-[8px] text-[13px] text-[#101828] focus:outline-none focus:border-[#006C63] focus:ring-1 focus:ring-[#006C63] shadow-xs"
                        />
                        <button
                          onClick={() => handleSaveGoal(goal)}
                          className="h-10 px-4 rounded-[8px] bg-[#006C63] hover:bg-[#00564F] text-white text-[12.5px] font-semibold flex items-center gap-1 transition-colors shadow-xs shrink-0"
                        >
                          <span className="material-symbols-outlined text-[16px]">save</span>
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

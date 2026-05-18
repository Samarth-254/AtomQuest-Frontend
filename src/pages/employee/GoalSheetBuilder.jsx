import { useEffect, useMemo, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  addGoal,
  createGoalSheet,
  deleteGoal,
  getCycles,
  getMyGoalSheet,
  getThrustAreas,
  submitGoalSheet,
  updateGoal,
  requestModification
} from '../../api/goalsApi';

const measurementTypes = [
  { label: 'Maximize ↑ (Higher is Better)', value: 'MAX' },
  { label: 'Minimize ↓ (Lower is Better)', value: 'MIN' },
  { label: 'Timeline (Date-based)', value: 'TIMELINE' },
  { label: 'Zero-based (0 = Success)', value: 'ZERO' },
];

export default function GoalSheetBuilder() {
  const [goals, setGoals] = useState([]);
  const [thrustAreas, setThrustAreas] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [cycle, setCycle] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadGoalSheetData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [cycleRes, thrustRes, sheetRes] = await Promise.all([
        getCycles(),
        getThrustAreas(),
        getMyGoalSheet(),
      ]);

      const cycleList = cycleRes.data || [];
      const active = cycleList.find((item) => item.is_active) || cycleList[0] || null;
      setCycles(cycleList);
      setCycle(sheetRes.data.cycle || active);
      setThrustAreas(thrustRes.data || []);

      setSheet(sheetRes.data.sheet || null);
      setGoals(
        (sheetRes.data.goals || []).map((goal) => ({
          id: goal.id,
          title: goal.title || '',
          weightage: goal.weightage ?? '',
          description: goal.description || '',
          thrustAreaId: goal.thrust_area_id || '',
          uomType: goal.uom_type || 'TIMELINE',
          targetValue: goal.target_value || '',
          targetDate: goal.target_date ? goal.target_date.split('T')[0] : '',
          isShared: goal.is_shared || false,
        }))
      );
      setError('');
    } catch (err) {
      setError('Failed to load goal sheet data.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoalSheetData(true);
  }, [loadGoalSheetData]);

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
        
        loadGoalSheetData(false); // Silent reload in background
      }
    };

    window.addEventListener('app_socket_event', handleSocketEvent);
    return () => {
      window.removeEventListener('app_socket_event', handleSocketEvent);
    };
  }, [loadGoalSheetData]);

  const totalWeightage = useMemo(
    () => goals.reduce((sum, goal) => sum + Number(goal.weightage || 0), 0),
    [goals]
  );

  const remainingWeightage = Math.max(0, 100 - totalWeightage);
  const isValidWeightage = totalWeightage === 100;
  const canAddMore = goals.length < 8;

  const isLocked = sheet?.status === 'APPROVED' || sheet?.status === 'SUBMITTED' || sheet?.status === 'MOD_REQUESTED';

  const handleRequestModification = async () => {
    if (!sheet?.id) return;
    setSaving(true);
    try {
      await requestModification(sheet.id);
      toast.success('Modification request submitted successfully to your manager.');
      setSheet(prev => ({ ...prev, status: 'MOD_REQUESTED' }));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit modification request.');
    } finally {
      setSaving(false);
    }
  };

  const updateGoalField = (id, field, value) => {
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === id
          ? {
              ...goal,
              [field]: field === 'weightage'
                ? (value === '' ? '' : Number(value))
                : value
            }
          : goal
      )
    );
  };

  const addGoalRow = () => {
    if (!canAddMore) return;

    setGoals((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        title: '',
        weightage: '',
        description: '',
        thrustAreaId: '',
        uomType: 'TIMELINE',
        targetValue: '',
        targetDate: '',
      },
    ]);
  };

  const removeGoalRow = async (id) => {
    if (goals.length === 1) return;
    const target = goals.find((goal) => goal.id === id);
    setGoals((prev) => prev.filter((goal) => goal.id !== id));

    if (typeof target?.id === 'number') {
      try {
        await deleteGoal(target.id);
      } catch (err) {
        toast.error('Failed to delete goal.');
      }
    }
  };

  const ensureSheet = async () => {
    if (sheet?.id) return sheet;
    if (!cycle?.id) throw new Error('No active cycle found');
    const res = await createGoalSheet({ cycleId: cycle.id });
    setSheet(res.data);
    return res.data;
  };

  // Core save logic — saves all goals to DB, returns true on success
  const saveGoals = async () => {
    if (!goals.length) return true;
    const currentSheet = await ensureSheet();

    const operations = goals.map((goal) => {
      const payload = {
        goalSheetId: currentSheet.id,
        thrustAreaId: goal.thrustAreaId || null,
        title: goal.title,
        description: goal.description,
        uomType: goal.uomType,
        targetValue: goal.targetValue || null,
        targetDate: goal.targetDate || null,
        weightage: Number(goal.weightage || 0),
      };
      return typeof goal.id === 'number' ? updateGoal(goal.id, payload) : addGoal(payload);
    });

    const results = await Promise.all(operations);

    setGoals((prev) =>
      prev.map((goal, index) =>
        typeof goal.id === 'number' ? goal : { ...goal, id: results[index].data.id }
      )
    );
    return currentSheet;
  };


  const handleSubmit = async () => {
    if (!isValidWeightage) {
      toast.error(`Total weightage must equal 100% before submission. Currently ${totalWeightage}%.`);
      return;
    }

    setSaving(true);
    try {
      // Always persist latest weightages to DB first, then submit
      const currentSheet = await saveGoals();
      await submitGoalSheet(currentSheet.id);
      toast.success('Goal sheet submitted for approval!');
      setSheet(prev => ({ ...prev, status: 'SUBMITTED' }));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit goal sheet.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[1240px]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-[#3d4947] mb-6">
        <span>My Goals</span>
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        <span className="font-medium text-[#00685f]">Goal Sheet Builder</span>
      </div>

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-[24px] leading-[32px] tracking-[-0.01em] font-semibold text-[#191c1d]">
          {cycle?.cycle_name || 'Goal Sheet'}
        </h1>
        <p className="text-[14px] leading-[20px] text-[#3d4947] mt-1">
          Define clear, measurable goals for the upcoming quarter. Ensure weightage totals 100%.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left Content */}
        <div className="col-span-12 xl:col-span-9 space-y-6">
          {loading && (
            <div className="space-y-6 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-[8px] border border-[#d9e3e4] p-4">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-8 h-12 bg-gray-200 rounded"></div>
                    <div className="col-span-10 md:col-span-3 h-12 bg-gray-200 rounded"></div>
                    <div className="col-span-2 md:col-span-1 h-12 bg-gray-200 rounded"></div>
                    <div className="col-span-12 h-24 bg-gray-200 rounded"></div>
                    <div className="col-span-12 md:col-span-5 h-12 bg-gray-200 rounded"></div>
                    <div className="col-span-12 md:col-span-7 h-12 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && !loading && (
            <div className="text-[14px] text-[#b91c1c]">{error}</div>
          )}

          {!loading && !error && goals.map((goal, index) => {
            const isFocusedCard = index === 1;

            return (
              <div
                key={goal.id}
                className={`bg-white rounded-[8px] border p-4 ${
                  isFocusedCard
                    ? 'border-[#00685f] shadow-[0_0_0_2px_rgba(0,104,95,0.08)]'
                    : 'border-[#d9e3e4]'
                }`}
              >
                <div className="grid grid-cols-12 gap-4">
                  {/* Goal Title */}
                  <div className="col-span-12 md:col-span-8">
                    <label className="block text-[13px] font-medium text-[#3d4947] mb-2">
                      Goal Title
                    </label>
                    <input
                      type="text"
                      value={goal.title}
                      onChange={(e) => updateGoalField(goal.id, 'title', e.target.value)}
                      disabled={isLocked || goal.isShared}
                      placeholder="e.g., Increase Q3 Revenue"
                      className="w-full h-12 px-4 border border-[#bcc9c6] rounded-[6px] bg-white text-[14px] text-[#191c1d] placeholder:text-[#3d4947]/40 focus:outline-none focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Weightage */}
                  <div className="col-span-10 md:col-span-3">
                    <label className="block text-[13px] font-medium text-[#3d4947] mb-2">
                      Weightage (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={goal.weightage}
                      onChange={(e) => updateGoalField(goal.id, 'weightage', e.target.value)}
                      disabled={isLocked || goal.isShared}
                      className="w-full h-12 px-4 border border-[#bcc9c6] rounded-[6px] bg-white text-[14px] text-[#191c1d] focus:outline-none focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Delete */}
                  <div className="col-span-2 md:col-span-1 flex items-end">
                    <button
                      type="button"
                      disabled={goal.isShared || isLocked}
                      onClick={() => removeGoalRow(goal.id)}
                      className="w-10 h-12 flex items-center justify-center rounded-[6px] text-[#3d4947] hover:bg-[#f3f4f5] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title={goal.isShared ? "Cannot delete shared goal" : "Delete goal"}
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>

                  {/* Description */}
                  <div className="col-span-12">
                    <label className="block text-[13px] font-medium text-[#3d4947] mb-2">
                      Description / Key Results
                    </label>
                    <textarea
                      rows="3"
                      value={goal.description}
                      onChange={(e) => updateGoalField(goal.id, 'description', e.target.value)}
                      disabled={isLocked || goal.isShared}
                      placeholder="Describe the expected outcomes..."
                      className="w-full px-4 py-3 border border-[#bcc9c6] rounded-[6px] bg-white text-[14px] text-[#191c1d] placeholder:text-[#3d4947]/40 focus:outline-none focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f] transition-colors resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Thrust Area */}
                  <div className="col-span-12 md:col-span-5">
                    <label className="block text-[13px] font-medium text-[#3d4947] mb-2">
                      Thrust Area
                    </label>
                    <div className="relative">
                      <select
                         value={goal.thrustAreaId}
                         onChange={(e) => updateGoalField(goal.id, 'thrustAreaId', e.target.value)}
                         disabled={isLocked || goal.isShared}
                        className="w-full h-12 px-4 pr-10 border border-[#bcc9c6] rounded-[6px] bg-white text-[14px] text-[#191c1d] appearance-none focus:outline-none focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <option value="">Select an area</option>
                        {thrustAreas.map((area) => (
                          <option key={area.id} value={area.id}>
                            {area.name}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#3d4947] pointer-events-none">
                        arrow_drop_down
                      </span>
                    </div>
                  </div>

                  {/* Measurement Type */}
                  <div className="col-span-12 md:col-span-7">
                    <label className="block text-[13px] font-medium text-[#3d4947] mb-2">
                      Measurement Type
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-[#bcc9c6] rounded-[6px] overflow-hidden">
                      {measurementTypes.map((type) => {
                        const active = goal.uomType === type.value;

                        return (
                          <button
                            key={type.value}
                            type="button"
                            disabled={goal.isShared || isLocked}
                            onClick={() => updateGoalField(goal.id, 'uomType', type.value)}
                            className={`h-12 text-[14px] font-medium transition-colors border-r last:border-r-0 ${
                              active
                                ? 'bg-[#f3f4f5] text-[#191c1d]'
                                : 'bg-white text-[#3d4947] hover:bg-[#f8f9fa]'
                            } border-[#bcc9c6] disabled:opacity-60 disabled:cursor-not-allowed`}
                          >
                            {type.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-[13px] font-medium text-[#3d4947] mb-2">
                      Target Value
                    </label>
                    <input
                      type="text"
                      value={goal.targetValue}
                      onChange={(e) => updateGoalField(goal.id, 'targetValue', e.target.value)}
                      disabled={isLocked || goal.isShared}
                      className="w-full h-12 px-4 border border-[#bcc9c6] rounded-[6px] bg-white text-[14px] text-[#191c1d] focus:outline-none focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-[13px] font-medium text-[#3d4947] mb-2">
                      Target Date
                    </label>
                    <input
                      type="date"
                      value={goal.targetDate}
                      onChange={(e) => updateGoalField(goal.id, 'targetDate', e.target.value)}
                      disabled={isLocked || goal.isShared}
                      className="w-full h-12 px-4 border border-[#bcc9c6] rounded-[6px] bg-white text-[14px] text-[#191c1d] focus:outline-none focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add Another Goal */}
          <button
            type="button"
            onClick={addGoalRow}
            disabled={!canAddMore || isLocked}
            className="w-full h-[56px] border border-dashed border-[#d9e3e4] rounded-[8px] bg-white hover:bg-[#f8f9fa] transition-colors flex items-center justify-center gap-2 text-[14px] font-medium text-[#00685f] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            Add Another Goal
          </button>

          {!canAddMore && (
            <p className="text-[12px] text-[#ba1a1a]">
              Maximum 8 goals allowed per employee.
            </p>
          )}
        </div>

        {/* Right Summary Panel */}
        <div className="col-span-12 xl:col-span-3 space-y-4">
          <div className="bg-white border border-[#d9e3e4] rounded-[8px] p-5">
            <h2 className="text-[18px] leading-[24px] font-semibold text-[#191c1d] mb-5">
              Validation Summary
            </h2>

            <div className="border-t border-[#edeeef] pt-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[14px] text-[#3d4947]">Total Weightage</span>
                <span className="text-[14px] font-semibold text-[#191c1d]">
                  {totalWeightage}
                  <span className="font-normal text-[#3d4947]">/100%</span>
                </span>
              </div>

              <div className="w-full h-1.5 rounded-full bg-[#edeeef] overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full ${
                    totalWeightage > 100 ? 'bg-[#ba1a1a]' : 'bg-[#00685f]'
                  }`}
                  style={{ width: `${Math.min(totalWeightage, 100)}%` }}
                />
              </div>

              <div className="flex items-start gap-2 text-[13px] text-[#3d4947]">
                <span className="material-symbols-outlined text-[16px] mt-0.5">
                  info
                </span>
                <span>
                  {totalWeightage < 100 && `${remainingWeightage}% remaining to distribute.`}
                  {totalWeightage === 100 && 'Perfect. Weightage total is complete.'}
                  {totalWeightage > 100 && `${totalWeightage - 100}% over the allowed total.`}
                </span>
              </div>
            </div>

            <div className="border-t border-[#edeeef] mt-6 pt-5 flex items-center justify-between">
              <span className="text-[14px] text-[#3d4947]">Goal Count</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] bg-[#f3f4f5] text-[13px] text-[#191c1d]">
                {goals.length} Drafts
              </span>
            </div>
          </div>

          {sheet?.status === 'APPROVED' ? (
            <div className="space-y-3 w-full">
              <div className="text-[12.5px] text-[#0369a1] bg-[#f0f9ff] border border-[#bae6fd] rounded-[6px] px-3 py-2.5 flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#0284c7]">lock</span>
                <span>This sheet is Approved & Locked. Direct edits or draft saves are disabled.</span>
              </div>
              <button
                type="button"
                onClick={handleRequestModification}
                disabled={saving}
                className="w-full h-11 rounded-[6px] bg-[#0369a1] hover:bg-[#0284c7] text-white text-[14px] font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-75"
              >
                {saving ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    Submitting Request...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">edit_note</span>
                    Request Modification
                  </>
                )}
              </button>
            </div>
          ) : sheet?.status === 'MOD_REQUESTED' ? (
            <div className="space-y-3 w-full">
              <div className="text-[12.5px] text-[#b45309] bg-[#fffbeb] border border-[#fef3c7] rounded-[6px] px-3 py-2.5 flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#d97706] animate-pulse">pending</span>
                <span>Modification Requested. Awaiting manager approval to unlock.</span>
              </div>
              <button
                type="button"
                disabled={true}
                className="w-full h-11 rounded-[6px] bg-gray-100 border border-gray-200 text-gray-400 text-[14px] font-medium flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                Awaiting Manager Unlock
              </button>
            </div>
          ) : sheet?.status === 'SUBMITTED' ? (
            <div className="space-y-3 w-full">
              <div className="text-[12.5px] text-[#374151] bg-[#f9fafb] border border-[#e5e7eb] rounded-[6px] px-3 py-2.5 flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#4b5563]">schedule</span>
                <span>Submitted and locked. Awaiting manager approval.</span>
              </div>
              <button
                type="button"
                disabled={true}
                className="w-full h-11 rounded-[6px] bg-gray-100 border border-gray-200 text-gray-400 text-[14px] font-medium flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">task_alt</span>
                Awaiting Review
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="w-full h-11 rounded-[6px] bg-[#008378] hover:bg-[#00685f] text-white text-[14px] font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {saving ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit for Approval
                    <span className="material-symbols-outlined text-[18px]">send</span>
                  </>
                )}
              </button>
            </>
          )}

          <div className="text-[12px] text-[#3d4947] leading-[18px]">
            Rules: total weightage must equal 100%, minimum recommended weightage per goal is 10%, and maximum 8 goals are allowed.
          </div>
        </div>
      </div>
    </div>
  );
}
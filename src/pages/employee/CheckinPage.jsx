import { useEffect, useState } from 'react';
import { getMyProgress, upsertCheckin } from '../../api/checkinApi';
import { getCycles, getMyGoalSheet } from '../../api/goalsApi';
import toast from 'react-hot-toast';

const statusOptions = ['NOT_STARTED', 'ON_TRACK', 'COMPLETED'];

const calculateProgressClient = (uomType, target, actual, targetDate, actualDate) => {
  const t = parseFloat(target) || 0;
  const a = parseFloat(actual) || 0;

  if (uomType === 'MAX') {
    return t > 0 ? Math.min(Math.round((a / t) * 100), 150) : 0;
  }
  if (uomType === 'MIN') {
    return a > 0 ? Math.min(Math.round((t / a) * 100), 150) : 100;
  }
  if (uomType === 'TIMELINE') {
    if (!targetDate || !actualDate) return 0;
    return new Date(actualDate) <= new Date(targetDate) ? 100 : 0;
  }
  if (uomType === 'ZERO') {
    return a === 0 ? 100 : 0;
  }
  return 0;
};

export default function CheckinPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cyclePhase, setCyclePhase] = useState('');
  const [activeCyclePhase, setActiveCyclePhase] = useState('');
  const [activeCheckinPhase, setActiveCheckinPhase] = useState('');
  const [activeCycleName, setActiveCycleName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadCycles = async () => {
      try {
        const cycleRes = await getCycles();
        if (!isMounted) return;
        const cycleList = cycleRes.data || [];
        const active = cycleList.find((item) => item.is_active) || null;
        const phase = active?.phase || '';
        const isQuarterPhase = ['Q1', 'Q2', 'Q3', 'Q4'].includes(phase);
        const checkinPhase = isQuarterPhase ? phase : '';
        setActiveCyclePhase(phase);
        setActiveCheckinPhase(checkinPhase);
        setActiveCycleName(active?.cycle_name || '');
        setCyclePhase((prev) => prev || checkinPhase || 'Q1');
      } catch (err) {
        if (isMounted) {
          setActiveCyclePhase('');
          setActiveCheckinPhase('');
          setCyclePhase((prev) => prev || 'Q1');
        }
      }
    };

    loadCycles();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!cyclePhase) return;
      try {
        setLoading(true);
        const [progressRes, sheetRes] = await Promise.all([
          getMyProgress({ cyclePhase }),
          getMyGoalSheet(),
        ]);

        if (!isMounted) return;

        const rows = progressRes.data || [];
        setGoals(
          rows.map((row) => ({
            id: row.goal_id,
            title: row.title,
            target: row.target_value,
            uomType: row.uom_type,
            targetDate: row.target_date ? row.target_date.split('T')[0] : '',
            weight: row.weightage,
            status: row.status || 'NOT_STARTED',
            achievement: row.employee_note || '',
            progress: row.progress_score || 0,
            checkinId: row.checkin_id || null,
            actualValue: row.actual_value || '',
            actualDate: row.actual_date ? row.actual_date.split('T')[0] : '',
          }))
        );
        setError('');
      } catch (err) {
        if (isMounted) {
          setError('Failed to load check-ins.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [cyclePhase]);

  const updateGoal = (id, field, value) => {
    setGoals((prev) =>
      prev.map((goal) => {
        if (goal.id !== id) return goal;
        
        const updatedGoal = { ...goal, [field]: value };
        
        if (field === 'actualValue' || field === 'actualDate') {
          updatedGoal.progress = calculateProgressClient(
            updatedGoal.uomType, 
            updatedGoal.target, 
            updatedGoal.actualValue, 
            updatedGoal.targetDate, 
            updatedGoal.actualDate
          );
        }
        
        return updatedGoal;
      })
    );
  };

  const isCurrentPhase = !!activeCheckinPhase && cyclePhase === activeCheckinPhase;
  const isReadOnly = !isCurrentPhase;

  const handleSubmit = async () => {
    if (!isCurrentPhase) {
      toast.error('Check-ins are read-only for past phases.');
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      await Promise.all(
        goals.map((goal) =>
          upsertCheckin({
            goalId: goal.id,
            cyclePhase,
            actualValue: goal.actualValue || null,
            actualDate: goal.actualDate || null,
            status: goal.status,
            employeeNote: goal.achievement,
            progressScore: goal.progress,
          })
        )
      );
      toast.success('Check-in submitted successfully.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit check-ins.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1240px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#00685f] mb-2">
            Performance Cycle
          </div>
          <h1 className="text-[24px] leading-[32px] tracking-[-0.01em] font-semibold text-[#191c1d]">
            {cyclePhase} Check-in
          </h1>
          <p className="text-[14px] leading-[20px] text-[#3d4947] mt-2">
            Record your actual achievements against your quarterly objectives.
          </p>
          {activeCyclePhase && (
            <p className="text-[12px] leading-[18px] text-[#6b7280] mt-2">
              Current phase: {activeCyclePhase}{activeCycleName ? ` · ${activeCycleName}` : ''}
            </p>
          )}
        </div>

        <div className="shrink-0 border border-[#d9e3e4] bg-white rounded-[8px] px-5 py-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-[20px] text-[#191c1d]">
            info
          </span>
          <span className="text-[14px] text-[#191c1d]">Phase:</span>
          <select
            value={cyclePhase}
            onChange={(e) => setCyclePhase(e.target.value)}
            className="h-9 px-3 rounded-[6px] border border-[#d9e3e4] bg-white text-[14px] text-[#191c1d]"
          >
            {['Q1', 'Q2', 'Q3', 'Q4'].map((phase) => (
              <option key={phase} value={phase}>
                {phase}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isReadOnly && cyclePhase && (
        <div className="mb-6 px-4 py-3 rounded-[8px] border border-[#f1d0d0] bg-[#fff5f5] text-[13px] text-[#8b1e1e]">
          Viewing {cyclePhase} check-ins. Editing is disabled because this is not the current phase.
        </div>
      )}

      <div className="border-t border-[#edeeef] pt-8 space-y-6">
        {loading && (
          <div className="space-y-6 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-[#d9e3e4] rounded-[8px] p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-1/2">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded w-24 rounded-full"></div>
                </div>
                <div className="border-t border-[#edeeef] pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                  </div>
                  <div className="lg:col-span-8 space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
                    <div className="h-32 bg-gray-200 rounded w-full"></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-10 bg-gray-200 rounded w-full"></div>
                      <div className="h-10 bg-gray-200 rounded w-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="text-[14px] text-[#b91c1c]">{error}</div>
        )}

        {!loading && !error && goals.map((goal, idx) => (
          <div
            key={goal.id}
            className="bg-white border border-[#d9e3e4] rounded-[8px] p-6"
          >
            {/* Goal Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-[18px] leading-[24px] font-semibold text-[#191c1d] mb-2">
                  {idx + 1}. {goal.title}
                </h2>
                <p className="text-[14px] text-[#3d4947]">
                  <span className="font-medium text-[#191c1d]">Target:</span>{' '}
                  {goal.target ?? 'N/A'}
                </p>
              </div>

              <div className="shrink-0 inline-flex items-center px-4 py-2 rounded-full bg-[#e8eefb] text-[13px] font-medium text-[#4a5a7a] border border-[#d7dfef]">
                Weight: {goal.weight}%
              </div>
            </div>

            <div className="border-t border-[#edeeef] pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Current Status */}
              <div className="lg:col-span-4">
                <label className="block text-[14px] font-medium text-[#191c1d] mb-4">
                  Current Status
                </label>

                <div className="space-y-3">
                  {statusOptions.map((option) => {
                    const active = goal.status === option;

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => updateGoal(goal.id, 'status', option)}
                        disabled={isReadOnly}
                        className={`w-full h-10 rounded-[6px] border px-4 flex items-center gap-3 text-[14px] transition-colors ${
                          active
                            ? 'border-[#00685f] bg-[#e7f4f2] text-[#191c1d]'
                            : 'border-[#d9e3e4] bg-white text-[#191c1d] hover:bg-[#f8f9fa]'
                        } ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            active ? 'border-[#00685f]' : 'border-[#bcc9c6]'
                          }`}
                        >
                          {active && (
                            <span className="w-2.5 h-2.5 rounded-full bg-[#00685f]" />
                          )}
                        </span>
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actual Achievement */}
              <div className="lg:col-span-8">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-[14px] font-medium text-[#191c1d]">
                    Actual Achievement
                  </label>
                  <span className="text-[12px] text-[#3d4947]">Required</span>
                </div>

                <textarea
                  rows="5"
                  value={goal.achievement}
                  onChange={(e) =>
                    updateGoal(goal.id, 'achievement', e.target.value)
                  }
                  disabled={isReadOnly}
                  className="w-full px-4 py-3 border border-[#d9e3e4] rounded-[6px] bg-white text-[14px] leading-[22px] text-[#191c1d] placeholder:text-[#3d4947]/40 focus:outline-none focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f] transition-colors resize-none"
                />

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] text-[#3d4947] mb-2">
                      Actual Value
                    </label>
                    <input
                      type="text"
                      value={goal.actualValue}
                      onChange={(e) =>
                        updateGoal(goal.id, 'actualValue', e.target.value)
                      }
                      disabled={isReadOnly}
                      className="w-full h-10 px-3 border border-[#d9e3e4] rounded-[6px] bg-white text-[14px] text-[#191c1d] focus:outline-none focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] text-[#3d4947] mb-2">
                      Actual Date
                    </label>
                    <input
                      type="date"
                      value={goal.actualDate}
                      onChange={(e) =>
                        updateGoal(goal.id, 'actualDate', e.target.value)
                      }
                      disabled={isReadOnly}
                      className="w-full h-10 px-3 border border-[#d9e3e4] rounded-[6px] bg-white text-[14px] text-[#191c1d] focus:outline-none focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f] transition-colors"
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-[13px] mb-2">
                    <span className="text-[#3d4947]">
                      Progress to Target (Self-Assessed)
                    </span>
                    <span className="font-semibold text-[#00685f]">
                      {goal.progress}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={goal.progress > 100 ? 100 : goal.progress}
                    onChange={(e) =>
                      updateGoal(goal.id, 'progress', Number(e.target.value))
                    }
                    disabled={isReadOnly}
                    className={`w-full accent-[#00685f] ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-[#edeeef] mt-8 pt-6 flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || isReadOnly}
          className="h-11 px-6 rounded-[6px] bg-[#00685f] hover:bg-[#005049] text-white text-[14px] font-medium transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              Submitting...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">send</span>
              Submit Check-in
            </>
          )}
        </button>
      </div>
    </div>
  );
}
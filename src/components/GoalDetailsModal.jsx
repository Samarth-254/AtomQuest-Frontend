import React from 'react';

export default function GoalDetailsModal({ goal, onClose, checkins = [] }) {
  if (!goal) return null;

  // Format date nicely
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(dateStr));
  };

  // UOM type display label
  const getUomLabel = (type) => {
    switch (type) {
      case 'PERCENTAGE': return 'Percentage (%)';
      case 'CURRENCY': return 'Currency (INR)';
      case 'TIMELINE': return 'Timeline (Date)';
      case 'NUMERIC': return 'Numeric (Value)';
      default: return type || 'N/A';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#121415]/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content Wrapper */}
      <div className="bg-white rounded-[16px] shadow-2xl border border-[#e1e3e4] w-full max-w-[680px] overflow-hidden relative z-10 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#f3f4f5] flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-[4px] bg-[#f0faf8] text-[#006C63] border border-[#ccf2ed]">
                {goal.thrust_area_name || goal.thrust_area || 'General'}
              </span>
              {goal.is_shared && (
                <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-[4px] bg-[#EEF4FF] text-[#3538CD] border border-[#d7dbe4]">
                  Shared Dept. KPI
                </span>
              )}
            </div>
            <h3 className="text-[18px] font-bold text-[#191c1d] mt-1.5">{goal.title}</h3>
            <p className="text-[13px] text-[#586270] leading-relaxed">{goal.description}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f3f4f5] text-[#586270] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="px-6 py-5 max-h-[500px] overflow-y-auto space-y-6">
          
          {/* Grid of Key Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#f8f9fa] border border-[#e1e3e4] rounded-[10px] p-3.5 text-center">
              <div className="text-[11px] font-medium text-[#586270] uppercase tracking-wider">Weightage</div>
              <div className="text-[18px] font-bold text-[#191c1d] mt-1">{goal.weightage}%</div>
            </div>

            <div className="bg-[#f8f9fa] border border-[#e1e3e4] rounded-[10px] p-3.5 text-center">
              <div className="text-[11px] font-medium text-[#586270] uppercase tracking-wider">Target Value</div>
              <div className="text-[18px] font-bold text-[#191c1d] mt-1">
                {goal.target_value ? Number(goal.target_value).toLocaleString('en-IN') : 'N/A'}
              </div>
            </div>

            <div className="bg-[#f8f9fa] border border-[#e1e3e4] rounded-[10px] p-3.5 text-center">
              <div className="text-[11px] font-medium text-[#586270] uppercase tracking-wider">Target Date</div>
              <div className="text-[13px] font-bold text-[#191c1d] mt-2">
                {formatDate(goal.target_date)}
              </div>
            </div>

            <div className="bg-[#f8f9fa] border border-[#e1e3e4] rounded-[10px] p-3.5 text-center">
              <div className="text-[11px] font-medium text-[#586270] uppercase tracking-wider">Metric Type</div>
              <div className="text-[12px] font-bold text-[#191c1d] mt-2 truncate" title={getUomLabel(goal.uom_type)}>
                {getUomLabel(goal.uom_type)}
              </div>
            </div>
          </div>

          {/* Current Progress bar */}
          <div className="bg-[#f0faf8] border border-[#ccf2ed] rounded-[12px] p-4 flex items-center justify-between gap-6">
            <div className="space-y-1">
              <h4 className="text-[13px] font-semibold text-[#006C63]">Current Progress</h4>
              <p className="text-[12px] text-[#586270]">Latest checked-in progress achievement score.</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[24px] font-black text-[#006C63]">{goal.progress_score ?? 0}%</div>
              <div className="w-[100px] bg-gray-200 rounded-full h-1.5 mt-1 overflow-hidden">
                <div 
                  className="bg-[#006C63] h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(goal.progress_score ?? 0, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Check-ins timeline */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#f3f4f5] pb-2">
              <span className="material-symbols-outlined text-[18px] text-[#191c1d]">timeline</span>
              <h4 className="text-[14px] font-bold text-[#191c1d]">Check-in Performance History</h4>
            </div>

            {checkins.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-[#e1e3e4] rounded-[12px] bg-[#f8f9fa]">
                <span className="material-symbols-outlined text-[28px] text-gray-300">receipt_long</span>
                <p className="text-[12px] text-[#586270] mt-1.5">No check-in entries submitted yet for this goal.</p>
              </div>
            ) : (
              <div className="relative pl-6 border-l border-[#e1e3e4] ml-2 space-y-6">
                {checkins.map((c, idx) => (
                  <div key={idx} className="relative">
                    {/* Timeline Node Icon */}
                    <div className="absolute -left-[31px] top-0 w-[11px] h-[11px] rounded-full bg-[#006C63] border-2 border-white ring-4 ring-[#f0faf8]" />

                    {/* Timeline item body */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold text-[#191c1d]">Phase: {c.cycle_phase}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-[#ECFDF3] text-[#027A48]">
                            {c.status || 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Actual values */}
                      <div className="grid grid-cols-2 gap-4 bg-[#f8f9fa] border border-[#e1e3e4] rounded-[8px] p-3 text-[12px]">
                        <div>
                          <span className="text-[#586270] font-medium block">Checked-in Value</span>
                          <span className="font-bold text-[#191c1d] text-[13px] mt-0.5 block">{c.actual_value ?? '—'}</span>
                        </div>
                        <div>
                          <span className="text-[#586270] font-medium block">Achieved Score</span>
                          <span className="font-bold text-[#191c1d] text-[13px] mt-0.5 block">{c.progress_score ?? 0}%</span>
                        </div>
                      </div>

                      {/* Employee Notes */}
                      {c.employee_note && (
                        <div className="text-[12px] text-[#344054] pl-2 border-l-2 border-gray-300">
                          <span className="font-bold text-[#191c1d]">Employee Note:</span> "{c.employee_note}"
                        </div>
                      )}

                      {/* Manager Feedback */}
                      {c.manager_comment ? (
                        <div className="text-[12px] text-[#006C63] pl-2 border-l-2 border-[#006C63] bg-[#f0faf8]/50 py-1.5 pr-2 rounded-[4px]">
                          <span className="font-bold text-[#006C63]">Manager Feedback:</span> "{c.manager_comment}"
                        </div>
                      ) : (
                        <div className="text-[11px] text-gray-400 italic pl-2">
                          Awaiting Manager Feedback
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#f3f4f5] bg-[#f8f9fa] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[8px] bg-[#191c1d] hover:bg-[#191c1d]/90 text-white text-[13px] font-semibold transition-colors shadow-sm"
          >
            Close Details
          </button>
        </div>

      </div>
    </div>
  );
}

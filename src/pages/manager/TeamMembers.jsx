import { useEffect, useMemo, useState, useCallback } from 'react';
import { listTeamSheets, getSheetDetails, getTeamCheckins, addCheckinComment } from '../../api/managerApi';
import { getCycles } from '../../api/goalsApi';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const statusStyles = {
  APPROVED: 'bg-[#ECFDF3] text-[#027A48] border border-[#D1FADF]',
  SUBMITTED: 'bg-[#EEF4FF] text-[#3538CD] border border-[#C7D7FE]',
  DRAFT: 'bg-[#F2F4F7] text-[#344054] border border-[#E4E7EC]',
  RETURNED: 'bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]',
};

const depts = ['Engineering', 'Product', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations'];

export default function TeamMembers() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sheets, setSheets] = useState([]);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedGoalStatus, setSelectedGoalStatus] = useState('');

  // Selected Employee Detail Drawer
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerGoals, setDrawerGoals] = useState([]);
  const [drawerCheckins, setDrawerCheckins] = useState([]);
  const [activeTab, setActiveTab] = useState('goals');
  const [activeCyclePhase, setActiveCyclePhase] = useState('');
  const [activeCheckinPhase, setActiveCheckinPhase] = useState('');
  const [selectedCheckinPhase, setSelectedCheckinPhase] = useState('');

  // Inline Comment states
  const [commentingCheckinId, setCommentingCheckinId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [savingCommentId, setSavingCommentId] = useState(null);

  // Fetch Team Sheets
  const loadSheets = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await listTeamSheets();
      setSheets(res.data || []);
      setError('');
    } catch (err) {
      setError('Failed to load team members.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSheets(true);
  }, [loadSheets]);

  useEffect(() => {
    let isMounted = true;

    const loadCycles = async () => {
      try {
        const cycleRes = await getCycles();
        if (!isMounted) return;
        const cycleList = cycleRes.data || [];
        const active = cycleList.find((item) => item.is_active) || null;
        const cyclePhase = active?.phase || '';
        const isQuarterPhase = ['Q1', 'Q2', 'Q3', 'Q4'].includes(cyclePhase);
        setActiveCyclePhase(cyclePhase);
        setActiveCheckinPhase(isQuarterPhase ? cyclePhase : '');
      } catch (err) {
        if (isMounted) {
          setActiveCyclePhase('');
          setActiveCheckinPhase('');
        }
      }
    };

    loadCycles();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleSocketEvent = (e) => {
      const { event } = e.detail;
      if (
        event === 'goal_submitted' ||
        event === 'checkin_completed' ||
        event === 'goal_approved' ||
        event === 'goal_returned' ||
        event === 'sheet_reopened' ||
        event === 'sheet_rejected'
      ) {
        
        loadSheets(false); // Silent reload in background
      }
    };

    window.addEventListener('app_socket_event', handleSocketEvent);
    return () => {
      window.removeEventListener('app_socket_event', handleSocketEvent);
    };
  }, [loadSheets]);

  // Fetch Drawer Employee Details
  const handleOpenDrawer = async (sheet) => {
    setSelectedSheet(sheet);
    setActiveTab('goals');
    setSelectedCheckinPhase((prev) => prev || activeCheckinPhase || 'Q1');
    setCommentingCheckinId(null);
    setCommentDrafts({});
    if (!sheet.id) {
      setDrawerGoals([]);
      setDrawerCheckins([]);
      return;
    }
    setDrawerLoading(true);
    try {
      const [detailsRes, checkinsRes] = await Promise.all([
        getSheetDetails(sheet.id),
        getTeamCheckins(sheet.id)
      ]);
      setDrawerGoals(detailsRes.data.goals || []);
      setDrawerCheckins(checkinsRes.data || []);
    } catch (err) {
      toast.error('Failed to load employee profile details.');
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleSaveInlineComment = async (checkin) => {
    const draft = (commentDrafts[checkin.checkin_id] ?? '').trim();
    if (!draft) return;
    if (savingCommentId === (checkin.checkin_id || checkin.id)) return;
    setSavingCommentId(checkin.checkin_id || checkin.id);
    try {
      await addCheckinComment({
        checkinId: checkin.checkin_id || checkin.id,
        comment: draft
      });
      toast.success('Comment updated successfully.');
      // Refresh checkins
      const checkinsRes = await getTeamCheckins(selectedSheet.id);
      setDrawerCheckins(checkinsRes.data || []);
      setCommentingCheckinId(null);
      setCommentDrafts((prev) => {
        const next = { ...prev };
        delete next[checkin.checkin_id];
        return next;
      });
    } catch (err) {
      toast.error('Failed to submit comment.');
    } finally {
      setSavingCommentId(null);
    }
  };

  // Filter sheets
  const filteredSheets = useMemo(() => {
    return sheets.filter(sheet => {
      const matchesSearch = 
        sheet.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sheet.employee_email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDept = selectedDept ? sheet.department === selectedDept : true;
      const matchesStatus = selectedStatus ? sheet.status === selectedStatus : true;
      
      let matchesGoalStatus = true;
      if (selectedGoalStatus === 'COMPLETED') {
        matchesGoalStatus = parseInt(sheet.completed_goals) > 0;
      } else if (selectedGoalStatus === 'ON_TRACK') {
        matchesGoalStatus = parseInt(sheet.on_track_goals) > 0;
      } else if (selectedGoalStatus === 'NOT_STARTED') {
        matchesGoalStatus = parseInt(sheet.not_started_goals) > 0;
      }

      return matchesSearch && matchesDept && matchesStatus && matchesGoalStatus;
    });
  }, [sheets, searchQuery, selectedDept, selectedStatus, selectedGoalStatus]);

  const filteredCheckins = useMemo(() => {
    if (!selectedCheckinPhase || selectedCheckinPhase === 'ALL') {
      return drawerCheckins.filter((c) => c.cycle_phase);
    }
    return drawerCheckins.filter((c) => c.cycle_phase === selectedCheckinPhase);
  }, [drawerCheckins, selectedCheckinPhase]);

  const canComment = !!activeCheckinPhase && selectedCheckinPhase === activeCheckinPhase;

  return (
    <div className="max-w-[1240px] space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#101828]">Team Members</h1>
          <p className="text-[14px] text-[#667085] mt-0.5">Manage, track progress, review check-ins and shared KPIs for reporting employees.</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-[#E4E9ED] rounded-[12px] p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
        {/* Search */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#667085] text-[18px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search employee..."
            className="w-full h-10 pl-10 pr-4 border border-[#D0D5DD] rounded-[8px] text-[13px] focus:outline-none focus:border-[#006C63] focus:ring-1 focus:ring-[#006C63]"
          />
        </div>

        {/* Dept filter */}
        <select
          value={selectedDept}
          onChange={e => setSelectedDept(e.target.value)}
          className="h-10 px-3 border border-[#D0D5DD] rounded-[8px] text-[13px] focus:outline-none focus:border-[#006C63] focus:ring-1"
        >
          <option value="">All Departments</option>
          {depts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {/* Status filter */}
        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value)}
          className="h-10 px-3 border border-[#D0D5DD] rounded-[8px] text-[13px] focus:outline-none focus:border-[#006C63] focus:ring-1"
        >
          <option value="">All Sheet Statuses</option>
          <option value="DRAFT">DRAFT</option>
          <option value="SUBMITTED">SUBMITTED</option>
          <option value="APPROVED">APPROVED</option>
          <option value="RETURNED">RETURNED</option>
        </select>

        {/* Goal status filter */}
        <select
          value={selectedGoalStatus}
          onChange={e => setSelectedGoalStatus(e.target.value)}
          className="h-10 px-3 border border-[#D0D5DD] rounded-[8px] text-[13px] focus:outline-none focus:border-[#006C63] focus:ring-1"
        >
          <option value="">All Goal Statuses</option>
          <option value="COMPLETED">Has Completed Goals</option>
          <option value="ON_TRACK">Has On Track Goals</option>
          <option value="NOT_STARTED">Has Not Started Goals</option>
        </select>
      </div>

      {/* Table Layout */}
      <div className="bg-white border border-[#E4E9ED] rounded-[12px] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E4E9ED] text-[12px] font-bold text-[#667085] uppercase tracking-wider">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Dept</th>
                <th className="px-6 py-4">Goals</th>
                <th className="px-6 py-4">Progress</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Check-in</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E9ED]">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-36"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28"></div></td>
                    <td className="px-6 py-4 text-right"><div className="h-8 bg-gray-200 rounded w-20 ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredSheets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-[#667085]">
                    <span className="material-symbols-outlined text-[48px] text-[#D0D5DD]">group_off</span>
                    <h3 className="text-[15px] font-semibold text-[#101828] mt-4">All caught up 🎉</h3>
                    <p className="text-[13px] text-[#667085] mt-1">No employee sheets found matching your filters.</p>
                  </td>
                </tr>
              ) : (
                filteredSheets.map(sheet => (
                  <tr key={sheet.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#006C63]/10 text-[#006C63] font-bold text-[12px] flex items-center justify-center shrink-0">
                          {sheet.employee_name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-[13px] text-[#101828]">{sheet.employee_name}</div>
                          <div className="text-[11px] text-[#667085]">{sheet.employee_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-[#344054]">{sheet.department || 'N/A'}</td>
                    <td className="px-6 py-4 text-[13px] text-[#344054]">{sheet.goal_count || 0}</td>
                    <td className="px-6 py-4">
                      <div className="w-full max-w-[120px] space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-[#101828]">
                          <span>{sheet.average_progress || 0}%</span>
                        </div>
                        <div className="w-full bg-[#F2F4F7] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#006C63] h-full rounded-full transition-all duration-300"
                            style={{ width: `${sheet.average_progress || 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 text-[11px] font-bold rounded-full ${statusStyles[sheet.status] || 'bg-[#F2F4F7] text-[#667085] border border-[#D0D5DD]'}`}>
                        {sheet.status || 'NO SHEET'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[12px] text-[#667085]">
                      {!sheet.id ? (
                        <span className="text-[#667085]">N/A</span>
                      ) : sheet.pending_checkins > 0 ? (
                        <span className="text-[#B42318] font-medium">{sheet.pending_checkins} check-ins pending</span>
                      ) : (
                        <span className="text-[#027A48] font-medium">Completed</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenDrawer(sheet)}
                        className="h-8 px-3 rounded-[6px] border border-[#D0D5DD] hover:bg-[#F9FAFB] text-[#344054] text-[12px] font-semibold flex items-center gap-1.5 ml-auto transition-colors shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Details Sliding Drawer */}
      {selectedSheet && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-xs transition-opacity duration-300" onClick={() => setSelectedSheet(null)} />

          {/* Drawer */}
          <div className="fixed top-0 right-0 h-full w-full max-w-[800px] bg-white z-50 shadow-2xl flex flex-col overflow-hidden transition-transform duration-300 border-l border-[#E4E9ED]">
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#E4E9ED] bg-[#F9FAFB] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#006C63] text-white font-bold text-[14px] flex items-center justify-center shrink-0">
                  {selectedSheet.employee_name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h2 className="text-[17px] font-bold text-[#101828]">{selectedSheet.employee_name}</h2>
                  <p className="text-[12px] text-[#667085]">{selectedSheet.employee_email} · {selectedSheet.department || 'N/A'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSheet(null)}
                className="w-8 h-8 rounded-[8px] hover:bg-[#E4E9ED] flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[20px] text-[#667085]">close</span>
              </button>
            </div>

            {/* Custom Premium Tabs Navigation */}
            <div className="px-6 border-b border-[#E4E9ED] bg-[#F9FAFB] flex gap-6 shrink-0 overflow-x-auto scrollbar-none">
              {[
                { id: 'goals', label: 'Goals', icon: 'my_location' },
                { id: 'checkins', label: 'Check-ins', icon: 'fact_check' },
                { id: 'feedback', label: 'Feedback History', icon: 'rate_review' },
                { id: 'shared', label: 'Shared KPIs', icon: 'sync' },
                { id: 'activity', label: 'Activity Log', icon: 'history' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 flex items-center gap-2 text-[13px] font-semibold border-b-2 transition-all relative shrink-0 ${
                    activeTab === tab.id
                      ? 'border-[#006C63] text-[#006C63] font-bold'
                      : 'border-transparent text-[#667085] hover:text-[#101828]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              {drawerLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-[#667085]">
                  <span className="material-symbols-outlined text-[32px] animate-spin">progress_activity</span>
                  <p className="text-[13px] mt-2">Loading profile details...</p>
                </div>
              ) : (
                <>
                  {/* GOALS TAB */}
                  {activeTab === 'goals' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[14px] font-bold text-[#101828]">Employee Goals List</h3>
                        <span className={`inline-flex px-2 py-0.5 text-[11px] font-bold rounded-full ${statusStyles[selectedSheet.status] || 'bg-[#F2F4F7] text-[#667085] border border-[#D0D5DD]'}`}>
                          Sheet: {selectedSheet.status || 'NO SHEET'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {drawerGoals.map((g, idx) => (
                          <div key={idx} className="border border-[#E4E9ED] rounded-[10px] p-4 bg-white shadow-xs space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h4 className="text-[13.5px] font-bold text-[#101828]">{idx + 1}. {g.title}</h4>
                                <p className="text-[12px] text-[#667085] mt-1">{g.description || 'No description provided.'}</p>
                              </div>
                              <span className="text-[11px] font-semibold bg-[#E7F4F2] text-[#006C63] px-2 py-0.5 rounded-[4px] shrink-0 uppercase tracking-wider">
                                {g.uom_type}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-4 border-t border-[#F2F4F7] pt-3 text-[12px]">
                              <div>
                                <span className="text-[#667085] block">Target Value</span>
                                <span className="font-semibold text-[#344054]">{g.target_value || 'TIMELINE'}</span>
                              </div>
                              <div>
                                <span className="text-[#667085] block">Target Date</span>
                                <span className="font-semibold text-[#344054]">{g.target_date ? new Date(g.target_date).toLocaleDateString() : 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-[#667085] block">Weightage</span>
                                <span className="font-semibold text-[#344054]">{g.weightage}%</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {drawerGoals.length === 0 && (
                          <p className="text-[13px] text-center text-[#667085] py-8">No goals currently defined in this cycle.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CHECKINS TAB */}
                  {activeTab === 'checkins' && (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <h3 className="text-[14px] font-bold text-[#101828]">Timeline Check-ins Review</h3>
                          {activeCyclePhase && (
                            <p className="text-[12px] text-[#667085] mt-1">Current phase: {activeCyclePhase}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-[#667085]">Quarter</span>
                          <select
                            value={selectedCheckinPhase}
                            onChange={(e) => setSelectedCheckinPhase(e.target.value)}
                            className="h-8 px-2.5 rounded-[6px] border border-[#D0D5DD] text-[12px] text-[#101828]"
                          >
                            {['Q1', 'Q2', 'Q3', 'Q4', 'ALL'].map((phase) => (
                              <option key={phase} value={phase}>
                                {phase}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {!canComment && selectedCheckinPhase && (
                        <div className="px-3 py-2 rounded-[6px] border border-[#f1d0d0] bg-[#fff5f5] text-[12px] text-[#8b1e1e]">
                          Comments are enabled only for the current phase.
                        </div>
                      )}
                      <div className="relative border-l border-[#D0D5DD] ml-3 pl-6 space-y-6">
                        {filteredCheckins.map((c, idx) => (
                          <div key={idx} className="relative">
                            {/* Bullet indicator */}
                            <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white bg-[#006C63] flex items-center justify-center shadow-sm" />

                            <div className="border border-[#E4E9ED] rounded-[10px] p-4 bg-white shadow-xs space-y-3">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider bg-[#EEF4FF] text-[#3538CD] px-2 py-0.5 rounded-[4px]">
                                  {c.cycle_phase} Phase
                                </span>
                                <span className="text-[11px] font-bold text-[#006C63] bg-[#E7F4F2] px-2 py-0.5 rounded-[4px]">
                                  Progress: {c.progress_score || 0}%
                                </span>
                              </div>

                              <div>
                                <h4 className="text-[13px] font-bold text-[#101828]">{c.title}</h4>
                                <div className="text-[12px] text-[#667085] mt-1 space-y-1">
                                  <div>
                                    <span className="font-semibold text-[#344054]">Actual Value:</span> {c.actual_value || 'None'} 
                                    {c.actual_date && ` · Checked-in Date: ${new Date(c.actual_date).toLocaleDateString()}`}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-[#344054]">Status:</span> <span className="text-[#3538CD] uppercase font-bold">{c.status || 'DRAFT'}</span>
                                  </div>
                                </div>
                              </div>

                              {c.employee_note && (
                                <div className="bg-[#F9FAFB] rounded-[6px] p-2.5 border border-[#E4E9ED] text-[12px]">
                                  <span className="font-bold text-[#667085] block uppercase tracking-wider text-[10px]">Employee Note</span>
                                  <p className="text-[#344054] mt-0.5">{c.employee_note}</p>
                                </div>
                              )}

                              {/* Manager Comment Block */}
                              <div className="border-t border-[#F2F4F7] pt-2.5 space-y-2">
                                <span className="font-bold text-[#667085] block uppercase tracking-wider text-[10px]">Manager Feedback</span>
                                {c.manager_comment ? (
                                  <p className="text-[12.5px] italic text-[#101828] bg-[#E7F4F2]/30 p-2.5 rounded-[6px] border border-[#006C63]/10">
                                    "{c.manager_comment}"
                                  </p>
                                ) : (
                                  <span className="text-[11.5px] text-[#667085] block">No comment added yet.</span>
                                )}

                                {commentingCheckinId === c.checkin_id ? (
                                  <div className="mt-2 space-y-2">
                                    <textarea
                                      rows={2}
                                      value={commentDrafts[c.checkin_id] ?? c.manager_comment ?? ''}
                                      onChange={(e) =>
                                        setCommentDrafts((prev) => ({
                                          ...prev,
                                          [c.checkin_id]: e.target.value,
                                        }))
                                      }
                                      placeholder="Write your review or comment..."
                                      className="w-full px-3 py-2 border border-[#D0D5DD] rounded-[6px] text-[12.5px] focus:outline-none focus:border-[#006C63]"
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        onClick={() => setCommentingCheckinId(null)}
                                        className="h-7 px-3 border border-[#D0D5DD] rounded-[4px] text-[11px] font-semibold text-[#344054]"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => handleSaveInlineComment(c)}
                                        disabled={savingCommentId === c.checkin_id || !canComment}
                                        className="h-7 px-3 bg-[#006C63] text-white rounded-[4px] text-[11px] font-semibold disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-1.5"
                                      >
                                        {savingCommentId === c.checkin_id ? (
                                          <>
                                            <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                                            Saving...
                                          </>
                                        ) : 'Save Comment'}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      if (!canComment) return;
                                      setCommentingCheckinId(c.checkin_id);
                                      setCommentDrafts((prev) => ({
                                        ...prev,
                                        [c.checkin_id]: c.manager_comment || ''
                                      }));
                                    }}
                                    disabled={!canComment}
                                    className={`h-7 px-2.5 rounded-[6px] border border-[#D0D5DD] bg-white text-[11px] font-semibold text-[#344054] flex items-center gap-1 transition-colors ${
                                      canComment ? 'hover:bg-[#F9FAFB]' : 'opacity-60 cursor-not-allowed'
                                    }`}
                                  >
                                    <span className="material-symbols-outlined text-[14px]">edit</span>
                                    {c.manager_comment ? 'Edit Comment' : 'Add Comment'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {filteredCheckins.length === 0 && (
                          <div className="text-center py-10 pl-0 -ml-6">
                            <span className="material-symbols-outlined text-[36px] text-[#D0D5DD]">checklist</span>
                            <p className="text-[13px] text-[#667085] mt-2">No check-ins submitted for this sheet yet.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* FEEDBACK HISTORY TAB */}
                  {activeTab === 'feedback' && (
                    <div className="space-y-4">
                      <h3 className="text-[14px] font-bold text-[#101828]">Goal Sheet Rework & Review Feedback</h3>
                      <div className="space-y-4">
                        {selectedSheet.reason ? (
                          <div className="border border-[#FECDCA] bg-[#FEF3F2] rounded-[10px] p-4 text-[12.5px] text-[#B42318] space-y-1">
                            <span className="font-bold uppercase tracking-wider text-[10px] block">Returned Rework Reason</span>
                            <p className="font-medium">"{selectedSheet.reason}"</p>
                          </div>
                        ) : null}

                        {drawerCheckins.filter(c => c.manager_comment).map((c, idx) => (
                          <div key={idx} className="border border-[#E4E9ED] rounded-[10px] p-4 bg-white space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] font-bold uppercase tracking-wider bg-[#F2F4F7] text-[#344054] px-1.5 py-0.5 rounded">
                                {c.cycle_phase} Check-in Feedback
                              </span>
                              <span className="text-[11px] text-[#667085] font-semibold">{c.title}</span>
                            </div>
                            <p className="text-[12.5px] text-[#344054] italic">
                              "{c.manager_comment}"
                            </p>
                          </div>
                        ))}

                        {!selectedSheet.reason && drawerCheckins.filter(c => c.manager_comment).length === 0 && (
                          <div className="text-center py-12 text-[#667085]">
                            <span className="material-symbols-outlined text-[36px] text-[#D0D5DD]">forum</span>
                            <p className="text-[13px] mt-2">No historical rework feedback or manager remarks logged yet.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SHARED KPIS TAB */}
                  {activeTab === 'shared' && (
                    <div className="space-y-4">
                      <h3 className="text-[14px] font-bold text-[#101828]">Broadcasted Shared KPIs Status</h3>
                      <div className="grid grid-cols-1 gap-4">
                        {drawerGoals.filter(g => g.is_shared).map((g, idx) => (
                          <div key={idx} className="border border-[#D1FADF] bg-[#ECFDF3]/20 rounded-[10px] p-4 space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <h4 className="text-[13px] font-bold text-[#101828]">{g.title}</h4>
                              <span className="h-6 px-2.5 rounded-full bg-[#ECFDF3] text-[#027A48] text-[10px] font-bold border border-[#D1FADF] flex items-center gap-1 uppercase">
                                <span className="material-symbols-outlined text-[12px]">sync</span>
                                Synced
                              </span>
                            </div>
                            <p className="text-[12px] text-[#344054]">{g.description || 'Broadcasted departmental goal.'}</p>
                            <div className="flex gap-4 text-[11px] font-semibold text-[#667085] mt-1">
                              <span>Target: {g.target_value || 'Timeline'}</span>
                              <span>·</span>
                              <span>Weight: {g.weightage}%</span>
                            </div>
                          </div>
                        ))}
                        {drawerGoals.filter(g => g.is_shared).length === 0 && (
                          <div className="text-center py-12 text-[#667085]">
                            <span className="material-symbols-outlined text-[36px] text-[#D0D5DD]">sync_disabled</span>
                            <p className="text-[13px] mt-2">No broadcasted shared goals synchronized in this employee's active sheet.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ACTIVITY LOG TAB */}
                  {activeTab === 'activity' && (
                    <div className="space-y-4">
                      <h3 className="text-[14px] font-bold text-[#101828]">Activity Log & Audit Trail</h3>
                      <div className="space-y-3">
                        <div className="border border-[#E4E9ED] rounded-[10px] p-4 bg-[#F9FAFB] space-y-2.5">
                          <div className="flex justify-between items-center text-[12px]">
                            <span className="font-semibold text-[#101828]">Goal Sheet Status</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusStyles[selectedSheet.status] || 'bg-[#F2F4F7] text-[#667085] border border-[#D0D5DD]'}`}>
                              {selectedSheet.status || 'NO SHEET'}
                            </span>
                          </div>
                          <div className="text-[12px] text-[#667085] space-y-1">
                            <div>
                              <span className="font-semibold text-[#344054]">Cycle:</span> {selectedSheet.cycle_name || 'Active Performance Period'}
                            </div>
                            <div>
                              <span className="font-semibold text-[#344054]">Total weightage:</span> {selectedSheet.total_weightage || 0}% / 100%
                            </div>
                            {selectedSheet.reason && (
                              <div className="text-[#B42318]">
                                <span className="font-semibold text-[#B42318]">Last Action:</span> Returned for Rework
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-[12px] text-[#667085] italic p-3 bg-gray-50 border border-dashed rounded-[8px] text-center">
                          System actions, goal locks, approvals, and check-in submissions are automatically tracked in the system audit logs.
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

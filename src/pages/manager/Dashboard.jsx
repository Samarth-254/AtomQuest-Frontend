import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTeamSheets, pushGoalToTeam, getSharedGoals } from '../../api/managerApi';
import toast from 'react-hot-toast';

const statusStyles = {
  APPROVED: 'bg-[#ECFDF3] text-[#027A48]',
  SUBMITTED: 'bg-[#EEF4FF] text-[#3538CD]',
  DRAFT: 'bg-[#F2F4F7] text-[#344054]',
  RETURNED: 'bg-[#FEF3F2] text-[#B42318]',
  MOD_REQUESTED: 'bg-[#FFF9E6] text-[#B27B16]',
  EDITABLE: 'bg-[#F0FAF8] text-[#006C63]',
};

function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div className="bg-white border border-[#E4E9ED] rounded-[12px] p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-[10px] flex items-center justify-center shrink-0 ${accent}`}>
        <span className="material-symbols-outlined text-[20px] text-white">{icon}</span>
      </div>
      <div>
        <div className="text-[28px] font-bold text-[#101828] leading-none">{value}</div>
        <div className="text-[13px] font-medium text-[#344054] mt-1">{label}</div>
        {sub && <div className="text-[12px] text-[#667085] mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sheets, setSheets] = useState([]);
  const [sharedGoals, setSharedGoals] = useState([]);
  
  const [showPushModal, setShowPushModal] = useState(false);
  const [kpiForm, setKpiForm] = useState({ title: '', uomType: 'TIMELINE', targetValue: '', targetDate: '' });
  const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);
  const [pushing, setPushing] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      const [sheetsRes, sharedRes] = await Promise.all([
        listTeamSheets(),
        getSharedGoals()
      ]);
      setSheets(sheetsRes.data || []);
      setSharedGoals(sharedRes.data || []);
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    const handleSocketEvent = (e) => {
      const { event } = e.detail;
      if (event === 'goal_submitted' || event === 'checkin_completed') {
        
        loadDashboardData();
      }
    };

    window.addEventListener('app_socket_event', handleSocketEvent);
    return () => {
      window.removeEventListener('app_socket_event', handleSocketEvent);
    };
  }, [loadDashboardData]);

  const submitted = sheets.filter(s => s.status === 'SUBMITTED' || s.status === 'MOD_REQUESTED').length;
  const approved = sheets.filter(s => s.status === 'APPROVED').length;
  const returned = sheets.filter(s => s.status === 'RETURNED').length;
  const draft = sheets.filter(s => s.status === 'DRAFT').length;
  const pendingSheets = sheets.filter(s => s.status === 'SUBMITTED' || s.status === 'MOD_REQUESTED');

  const totalGoals = sheets.reduce((acc, s) => acc + (parseInt(s.goal_count) || 0), 0);
  const totalCompleted = sheets.reduce((acc, s) => acc + (parseInt(s.completed_goals) || 0), 0);
  const totalOnTrack = sheets.reduce((acc, s) => acc + (parseInt(s.on_track_goals) || 0), 0);
  const totalNotStarted = sheets.reduce((acc, s) => acc + (parseInt(s.not_started_goals) || 0), 0);
  const totalPendingCheckins = sheets.reduce((acc, s) => acc + (parseInt(s.pending_checkins) || 0), 0);

  const avgTeamProgress = sheets.length 
    ? Math.round(sheets.reduce((acc, s) => acc + (parseFloat(s.average_progress) || 0), 0) / sheets.length)
    : 0;

  const handlePushKpi = async () => {
    if (!kpiForm.title || selectedTeamMembers.length === 0) return;
    try {
      setPushing(true);
      await pushGoalToTeam({ ...kpiForm, employeeIds: selectedTeamMembers });
      toast.success('KPI broadcasted to selected team members!');
      setShowPushModal(false);
      setKpiForm({ title: '', uomType: 'TIMELINE', targetValue: '', targetDate: '' });
      setSelectedTeamMembers([]);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to push KPI');
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="h-full -m-6 bg-[#F5F7FA]">
      <div className="p-6 space-y-6">
        <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold text-[#101828]">Manager Dashboard</h1>
            <p className="text-[14px] text-[#667085] mt-0.5">Your team goal sheet submissions overview.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowPushModal(true)} className="h-10 px-4 rounded-[8px] border border-[#006C63] text-[#006C63] hover:bg-[#E7F4F2] text-[13px] font-medium transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">campaign</span>
              Broadcast KPI
            </button>
            <button onClick={() => navigate('/manager/team')} className="h-10 px-4 rounded-[8px] bg-[#006C63] hover:bg-[#00564F] text-white text-[13px] font-medium transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">group</span>
              View All Team Sheets
            </button>
          </div>
        </section>

        {loading && (
          <div className="space-y-6">
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white border border-[#E4E9ED] rounded-[12px] p-5 h-[106px]"></div>
              ))}
            </section>
            <section className="bg-white border border-[#E4E9ED] rounded-[12px] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E4E9ED]">
                <div className="h-5 bg-gray-200 rounded w-48 mb-1"></div>
                <div className="h-4 bg-gray-200 rounded w-64"></div>
              </div>
              <div className="p-5 space-y-4 animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-4 items-center border-b border-[#F9FAFB] pb-4 last:border-0 last:pb-0">
                    <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-48"></div>
                      <div className="h-3 bg-gray-200 rounded w-32"></div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <div className="w-16 h-8 bg-gray-200 rounded"></div>
                      <div className="w-20 h-8 bg-gray-200 rounded hidden sm:block"></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
        {error && !loading && (
          <div className="text-[14px] text-[#B42318] bg-[#FEF3F2] border border-[#FECDCA] rounded-[8px] px-4 py-3">{error}</div>
        )}

        {!loading && !error && (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon="pending_actions" label="Pending Review" value={submitted} sub="awaiting action" accent="bg-[#3538CD]" />
              <StatCard icon="assignment_turned_in" label="Approved" value={approved} sub="sheets locked" accent="bg-[#027A48]" />
              <StatCard icon="assignment_return" label="Returned" value={returned} sub="for rework" accent="bg-[#B42318]" />
              <StatCard icon="edit_note" label="In Draft" value={draft} sub="not submitted yet" accent="bg-[#667085]" />
            </section>

            {/* Team Progress Insights */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-white border border-[#E4E9ED] rounded-[12px] p-5 flex flex-col justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold text-[#101828]">Overall Team Progress</h2>
                  <p className="text-[12px] text-[#667085] mt-0.5">Average achievement score of direct reports</p>
                </div>
                <div className="my-6 flex items-center justify-center">
                  <div className="relative w-36 h-36 flex items-center justify-center bg-[#F9FAFB] rounded-full border border-[#E4E9ED]">
                    <div className="text-center">
                      <div className="text-[36px] font-extrabold text-[#006C63] leading-none">{avgTeamProgress}%</div>
                      <div className="text-[11px] text-[#667085] font-medium mt-1">Direct Reports</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[13px] text-[#344054]">
                    <span>Pending Check-ins</span>
                    <span className="font-semibold text-[#B42318]">{totalPendingCheckins} goals</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-[#B42318] h-full rounded-full" style={{ width: `${Math.min(100, (totalPendingCheckins / (totalGoals || 1)) * 100)}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white border border-[#E4E9ED] rounded-[12px] p-5 flex flex-col justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold text-[#101828]">Direct Reports Goal Status</h2>
                  <p className="text-[12px] text-[#667085] mt-0.5">Current distribution of goals and status</p>
                </div>

                <div className="grid grid-cols-3 gap-4 my-5">
                  <div className="bg-[#ECFDF3] rounded-[8px] p-4 text-center border border-[#D1FADF]">
                    <div className="text-[24px] font-bold text-[#027A48]">{totalCompleted}</div>
                    <div className="text-[12px] font-semibold text-[#027A48] mt-1">Completed</div>
                  </div>
                  <div className="bg-[#EFF8FF] rounded-[8px] p-4 text-center border border-[#D1E9FF]">
                    <div className="text-[24px] font-bold text-[#175CD3]">{totalOnTrack}</div>
                    <div className="text-[12px] font-semibold text-[#175CD3] mt-1">On Track</div>
                  </div>
                  <div className="bg-[#F2F4F7] rounded-[8px] p-4 text-center border border-[#E4E9ED]">
                    <div className="text-[24px] font-bold text-[#344054]">{totalNotStarted}</div>
                    <div className="text-[12px] font-semibold text-[#344054] mt-1">Not Started</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[13px] font-semibold text-[#344054]">Top Progressing Members</h3>
                  <div className="space-y-2">
                    {sheets.slice(0, 3).map(s => (
                      <div key={s.id} className="flex items-center justify-between text-[12px]">
                        <span className="text-[#344054] font-medium">{s.employee_name}</span>
                        <div className="flex items-center gap-3 w-1/2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-[#006C63] h-full rounded-full" style={{ width: `${s.average_progress || 0}%` }}></div>
                          </div>
                          <span className="font-bold text-[#101828] text-right w-8">{s.average_progress || 0}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white border border-[#E4E9ED] rounded-[12px] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E4E9ED] flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold text-[#101828]">Pending Reviews</h2>
                  <p className="text-[12px] text-[#667085] mt-0.5">Submitted sheets awaiting your review</p>
                </div>
                {submitted > 0 && (
                  <span className="h-6 px-2.5 rounded-full bg-[#EEF4FF] text-[#3538CD] text-[12px] font-semibold flex items-center">{submitted} pending</span>
                )}
              </div>
              {pendingSheets.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <span className="material-symbols-outlined text-[40px] text-[#D0D5DD]">task_alt</span>
                  <p className="text-[14px] text-[#667085] mt-2">No pending submissions — all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-[#F9FAFB]">
                  {pendingSheets.map(sheet => (
                    <div key={sheet.id} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-[#F9FAFB] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#006C63]/10 flex items-center justify-center shrink-0 text-[#006C63] text-[13px] font-bold">
                          {sheet.employee_name?.[0]?.toUpperCase() || 'E'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-[14px] font-medium text-[#101828] truncate">{sheet.employee_name}</div>
                            {sheet.status === 'MOD_REQUESTED' && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#FFF9E6] text-[#B27B16] border border-[#FDEBB8] rounded-[4px] animate-pulse flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[10px]">lock_open</span>
                                Unlock Requested
                              </span>
                            )}
                          </div>
                          <div className="text-[12px] text-[#667085] truncate">{sheet.department || 'No department'} · {sheet.goal_count || 0} goals</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => navigate(`/manager/review/${sheet.id}`)} className="h-8 px-3 rounded-[6px] bg-[#006C63] hover:bg-[#00564F] text-white text-[12px] font-medium transition-colors">Review</button>
                        <button onClick={() => navigate(`/manager/checkin/${sheet.id}`)} className="h-8 px-3 rounded-[6px] border border-[#D0D5DD] bg-white hover:bg-[#F9FAFB] text-[#344054] text-[12px] font-medium transition-colors">Check-ins</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-white border border-[#E4E9ED] rounded-[12px] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E4E9ED]">
                <h2 className="text-[15px] font-semibold text-[#101828]">All Team Submissions</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px]">
                  <thead>
                    <tr className="border-b border-[#F2F4F7] bg-[#F9FAFB]">
                      {['Employee', 'Department', 'Goals', 'Progress', 'Goal Distribution', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-[#667085]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F9FAFB]">
                    {sheets.length === 0 && (
                      <tr><td colSpan={7} className="px-5 py-8 text-center text-[13px] text-[#667085]">No goal sheets found for the current cycle.</td></tr>
                    )}
                    {sheets.map(sheet => (
                      <tr key={sheet.id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="px-5 py-3">
                          <div className="text-[14px] font-medium text-[#101828]">{sheet.employee_name}</div>
                          <div className="text-[12px] text-[#667085]">{sheet.employee_email}</div>
                        </td>
                        <td className="px-5 py-3 text-[13px] text-[#344054]">{sheet.department || '—'}</td>
                        <td className="px-5 py-3 text-[13px] text-[#344054]">
                          <div>{sheet.goal_count || 0} goals</div>
                          <div className="text-[11px] text-[#667085]">{sheet.total_weightage || 0}% weight</div>
                        </td>
                        <td className="px-5 py-3 text-[13px] text-[#344054]">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{sheet.average_progress || 0}%</span>
                            <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden hidden sm:block">
                              <div className="bg-[#006C63] h-full rounded-full" style={{ width: `${Math.min(100, sheet.average_progress || 0)}%` }}></div>
                            </div>
                          </div>
                          {parseInt(sheet.pending_checkins) > 0 && (
                            <div className="text-[11px] text-[#B42318] flex items-center gap-0.5 mt-0.5">
                              <span className="material-symbols-outlined text-[12px]">warning</span>
                              {sheet.pending_checkins} pending check-in{sheet.pending_checkins > 1 ? 's' : ''}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1">
                            {parseInt(sheet.completed_goals) > 0 && (
                              <span className="text-[10px] font-semibold bg-[#ECFDF3] text-[#027A48] px-1.5 py-0.5 rounded-[4px]">
                                {sheet.completed_goals} Completed
                              </span>
                            )}
                            {parseInt(sheet.on_track_goals) > 0 && (
                              <span className="text-[10px] font-semibold bg-[#EFF8FF] text-[#175CD3] px-1.5 py-0.5 rounded-[4px]">
                                {sheet.on_track_goals} On Track
                              </span>
                            )}
                            {parseInt(sheet.not_started_goals) > 0 && (
                              <span className="text-[10px] font-semibold bg-[#F2F4F7] text-[#344054] px-1.5 py-0.5 rounded-[4px]">
                                {sheet.not_started_goals} Not Started
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-[11px] font-semibold px-2 py-1 rounded-[6px] ${statusStyles[sheet.status] || 'bg-[#F2F4F7] text-[#344054]'}`}>{sheet.status}</span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => navigate(`/manager/review/${sheet.id}`)} className="h-7 px-2.5 rounded-[6px] bg-[#006C63] hover:bg-[#00564F] text-white text-[11px] font-medium transition-colors">Review</button>
                            <button onClick={() => navigate(`/manager/checkin/${sheet.id}`)} className="h-7 px-2.5 rounded-[6px] border border-[#D0D5DD] bg-white hover:bg-[#F9FAFB] text-[#344054] text-[11px] font-medium transition-colors">Check-ins</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>

      {/* Broadcast KPI Modal */}
      {showPushModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[12px] w-full max-w-lg shadow-xl p-6">
            <h2 className="text-[18px] font-bold text-[#101828] mb-4">Broadcast Departmental KPI</h2>
            <p className="text-[13px] text-[#667085] mb-6">Create a read-only KPI and instantly distribute it to your team members' active sheets.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#344054] mb-2">KPI Title</label>
                <input
                  type="text"
                  value={kpiForm.title}
                  onChange={e => setKpiForm({...kpiForm, title: e.target.value})}
                  placeholder="e.g., Increase Q3 Sales Revenue"
                  className="w-full h-10 px-3 border border-[#D0D5DD] rounded-[8px] text-[13px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#344054] mb-2">Measurement Type</label>
                  <select
                    value={kpiForm.uomType}
                    onChange={e => setKpiForm({...kpiForm, uomType: e.target.value})}
                    className="w-full h-10 px-3 border border-[#D0D5DD] rounded-[8px] text-[13px]"
                  >
                    <option value="TIMELINE">Timeline / Project</option>
                    <option value="MAX">Maximize (Higher is better)</option>
                    <option value="MIN">Minimize (Lower is better)</option>
                    <option value="ZERO">Zero Tolerance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#344054] mb-2">Target Value</label>
                  <input
                    type="text"
                    value={kpiForm.targetValue}
                    onChange={e => setKpiForm({...kpiForm, targetValue: e.target.value})}
                    placeholder="e.g., 100000"
                    disabled={kpiForm.uomType === 'TIMELINE'}
                    className="w-full h-10 px-3 border border-[#D0D5DD] rounded-[8px] text-[13px] disabled:bg-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#344054] mb-2">Select Team Members</label>
                <div className="max-h-[150px] overflow-y-auto border border-[#D0D5DD] rounded-[8px] p-3 space-y-2">
                  {sheets.map(sheet => (
                    <label key={sheet.employee_id} className="flex items-center gap-2 text-[13px]">
                      <input
                        type="checkbox"
                        checked={selectedTeamMembers.includes(sheet.employee_id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedTeamMembers([...selectedTeamMembers, sheet.employee_id]);
                          else setSelectedTeamMembers(selectedTeamMembers.filter(id => id !== sheet.employee_id));
                        }}
                      />
                      {sheet.employee_name} ({sheet.employee_email})
                    </label>
                  ))}
                  {sheets.length === 0 && <span className="text-[12px] text-[#667085]">No team members found in the current cycle.</span>}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setShowPushModal(false)}
                className="h-9 px-4 rounded-[6px] border border-[#D0D5DD] text-[#344054] text-[13px] font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handlePushKpi}
                disabled={pushing || !kpiForm.title || selectedTeamMembers.length === 0}
                className="h-9 px-4 rounded-[6px] bg-[#006C63] hover:bg-[#00564F] disabled:opacity-50 text-white text-[13px] font-medium flex items-center gap-1.5"
              >
                {pushing ? (
                  <>
                    <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                    Broadcasting...
                  </>
                ) : 'Broadcast KPI'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

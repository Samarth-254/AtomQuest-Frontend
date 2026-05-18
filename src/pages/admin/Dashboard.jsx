import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuditLogs, getGoalSheets, listUsers } from '../../api/adminApi';
import { getCycles } from '../../api/goalsApi';
import { getManagerEffectiveness } from '../../api/analyticsApi';

function StatCard({ icon, label, value, sub, accent, bg }) {
  return (
    <div className={`rounded-[12px] border border-[#E4E9ED] p-5 flex items-start gap-4 ${bg || 'bg-white'}`}>
      <div className={`w-11 h-11 rounded-[10px] flex items-center justify-center shrink-0 ${accent}`}>
        <span className="material-symbols-outlined text-[20px] text-white">{icon}</span>
      </div>
      <div>
        <div className="text-[26px] font-bold text-[#101828] leading-none">{value}</div>
        <div className="text-[13px] font-medium text-[#344054] mt-1">{label}</div>
        {sub && <div className="text-[12px] text-[#667085] mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

const statusStyles = {
  APPROVED: 'bg-[#ECFDF3] text-[#027A48]',
  SUBMITTED: 'bg-[#EEF4FF] text-[#3538CD]',
  DRAFT: 'bg-[#F2F4F7] text-[#344054]',
  RETURNED: 'bg-[#FEF3F2] text-[#B42318]',
};

const actionLabels = {
  UPDATE: 'Updated',
  CREATE: 'Created',
  LOCK: 'Locked',
  UNLOCK: 'Unlocked',
  DELETE: 'Deleted',
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [sheets, setSheets] = useState([]);
  const [audits, setAudits] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [managers, setManagers] = useState([]);

  const loadAdminData = useCallback(async () => {
    try {
      const [usersRes, sheetsRes, auditsRes, cyclesRes, mgrsRes] = await Promise.all([
        listUsers(),
        getGoalSheets(),
        getAuditLogs(),
        getCycles(),
        getManagerEffectiveness(),
      ]);
      setUsers(usersRes.data || []);
      setSheets(sheetsRes.data || []);
      setAudits(auditsRes.data || []);
      setCycles(cyclesRes.data || []);
      setManagers(mgrsRes.data || []);
    } catch {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  useEffect(() => {
    const handleSocketEvent = (e) => {
      const { event } = e.detail;
      if (
        event === 'goal_submitted' ||
        event === 'goal_approved' ||
        event === 'goal_returned' ||
        event === 'checkin_completed'
      ) {
        
        loadAdminData();
      }
    };

    window.addEventListener('app_socket_event', handleSocketEvent);
    return () => {
      window.removeEventListener('app_socket_event', handleSocketEvent);
    };
  }, [loadAdminData]);

  const approvedSheets = sheets.filter(s => s.status === 'APPROVED').length;
  const submittedSheets = sheets.filter(s => s.status === 'SUBMITTED').length;
  const returnedSheets = sheets.filter(s => s.status === 'RETURNED').length;
  const activeCycle = cycles.find(c => c.is_active);
  const employeeCount = users.filter(u => u.role === 'EMPLOYEE').length;
  const managerCount = users.filter(u => u.role === 'MANAGER').length;
  const recentAudits = audits.slice(0, 4);
  const recentSheets = sheets.slice(0, 4);

  const todayStr = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  const todaysAuditsCount = audits.filter(log => {
    if (!log.changed_at) return false;
    const logDateStr = new Date(log.changed_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    return logDateStr === todayStr;
  }).length;

  return (
    <div className="h-full -m-6 bg-[#F5F7FA]">
      <div className="p-6 space-y-6">

        {/* Header */}
        <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold text-[#101828]">Admin Dashboard</h1>
            <p className="text-[14px] text-[#667085] mt-0.5">
              {activeCycle ? `Active cycle: ${activeCycle.cycle_name} · Phase ${activeCycle.phase}` : 'No active cycle — create one in Cycle Management'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/admin/cycles')}
              className="h-10 px-4 rounded-[8px] border border-[#D0D5DD] bg-white text-[#344054] text-[13px] font-medium hover:bg-[#F9FAFB] transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">event_repeat</span>
              Manage Cycles
            </button>
            <button
              onClick={() => navigate('/admin/users')}
              className="h-10 px-4 rounded-[8px] bg-[#006C63] hover:bg-[#00564F] text-white text-[13px] font-medium transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              Add User
            </button>
          </div>
        </section>

        {loading && (
          <div className="space-y-6">
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white border border-[#E4E9ED] rounded-[12px] p-5 h-[104px]"></div>
              ))}
            </section>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white border border-[#E4E9ED] rounded-[10px] p-4 h-[106px]"></div>
              ))}
            </section>
            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-pulse">
              <div className="bg-white border border-[#E4E9ED] rounded-[12px] h-[300px]"></div>
              <div className="bg-white border border-[#E4E9ED] rounded-[12px] h-[300px]"></div>
            </section>
          </div>
        )}
        {error && !loading && (
          <div className="text-[14px] text-[#B42318] bg-[#FEF3F2] border border-[#FECDCA] rounded-[8px] px-4 py-3">{error}</div>
        )}

        {!loading && !error && (
          <>
            {/* Stat Cards */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon="group" label="Total Users" value={users.length} sub={`${employeeCount} emp · ${managerCount} mgr`} accent="bg-[#006C63]" />
              <StatCard icon="pending_actions" label="Pending Review" value={submittedSheets} sub="submitted sheets" accent="bg-[#3538CD]" />
              <StatCard icon="assignment_return" label="Returned" value={returnedSheets} sub="for rework" accent="bg-[#B42318]" />
              <StatCard icon="policy" label="Today's Audit Events" value={todaysAuditsCount} sub="logged today" accent="bg-[#6941C6]" />
            </section>

            {/* Quick Actions */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'User Management', icon: 'manage_accounts', path: '/admin/users', desc: 'Add & manage users' },
                { label: 'Cycle Management', icon: 'event_repeat', path: '/admin/cycles', desc: 'Manage review cycles' },
                { label: 'Audit Logs', icon: 'policy', path: '/admin/audit', desc: 'View all activity' },
                { label: 'Analytics', icon: 'query_stats', path: '/admin/analytics', desc: 'Performance insights' },
              ].map(item => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="bg-white border border-[#E4E9ED] rounded-[10px] p-4 text-left hover:border-[#006C63] hover:shadow-sm transition-all group"
                >
                  <span className="material-symbols-outlined text-[22px] text-[#006C63] group-hover:text-[#00564F]">{item.icon}</span>
                  <div className="text-[13px] font-semibold text-[#101828] mt-2">{item.label}</div>
                  <div className="text-[12px] text-[#667085]">{item.desc}</div>
                </button>
              ))}
            </section>

            {/* Bottom two-column layout */}
            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              {/* Recent Goal Sheets */}
              <div className="bg-white border border-[#E4E9ED] rounded-[12px] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E4E9ED] flex items-center justify-between">
                  <h2 className="text-[15px] font-semibold text-[#101828]">Recent Goal Sheets</h2>
                  <button onClick={() => navigate('/admin/reports')} className="text-[12px] text-[#006C63] hover:underline font-medium">View Reports →</button>
                </div>
                <div className="divide-y divide-[#F2F4F7]">
                  {recentSheets.length === 0 && (
                    <div className="px-5 py-6 text-[13px] text-[#667085]">No goal sheets found.</div>
                  )}
                  {recentSheets.map(sheet => (
                    <div key={sheet.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-[#101828] truncate">{sheet.employee_name}</div>
                        <div className="text-[11px] text-[#667085] truncate">{sheet.department} · {sheet.cycle_name}</div>
                      </div>
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded-[6px] shrink-0 ${statusStyles[sheet.status] || 'bg-[#F2F4F7] text-[#344054]'}`}>
                        {sheet.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Audit Activity */}
              <div className="bg-white border border-[#E4E9ED] rounded-[12px] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E4E9ED] flex items-center justify-between">
                  <h2 className="text-[15px] font-semibold text-[#101828]">Recent Audit Activity</h2>
                  <button onClick={() => navigate('/admin/audit')} className="text-[12px] text-[#006C63] hover:underline font-medium">View All →</button>
                </div>
                <div className="divide-y divide-[#F2F4F7]">
                  {recentAudits.length === 0 && (
                    <div className="px-5 py-6 text-[13px] text-[#667085]">No audit activity yet. Actions like approvals & user creation will appear here.</div>
                  )}
                  {recentAudits.map(log => (
                    <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#F4F3FF] flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[14px] text-[#6941C6]">history</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] text-[#101828]">
                          <span className="font-medium">{log.changed_by_name || 'System'}</span>
                          {' '}{actionLabels[log.action] || log.action}{' '}
                          <span className="text-[#6941C6]">{log.table_name}</span> #{log.record_id}
                        </div>
                        <div className="text-[11px] text-[#667085] mt-0.5">
                          {log.changed_by_role || 'SYSTEM'} · {new Date(log.changed_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

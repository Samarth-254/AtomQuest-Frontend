import { useEffect, useMemo, useState } from 'react';
import { getAuditLogs } from '../../api/adminApi';

function RoleBadge({ role }) {
  const map = {
    ADMIN: 'bg-[#F4F3FF] text-[#6941C6]',
    MANAGER: 'bg-[#EEF4FF] text-[#3538CD]',
    EMPLOYEE: 'bg-[#ECFDF3] text-[#027A48]',
    SYSTEM: 'bg-[#F2F4F7] text-[#667085]',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-[4px] text-[11px] font-medium ${map[role] || 'bg-[#F2F4F7] text-[#667085]'}`}>
      {role || 'SYSTEM'}
    </span>
  );
}

const ACTION_COLORS = {
  CREATE: 'bg-[#ECFDF3] text-[#027A48]',
  UPDATE: 'bg-[#EEF4FF] text-[#3538CD]',
  LOCK: 'bg-[#FFF6ED] text-[#B54708]',
  UNLOCK: 'bg-[#FFF6ED] text-[#B54708]',
  DELETE: 'bg-[#FEF3F2] text-[#B42318]',
};

const formatIST = (ts) => {
  if (!ts) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date(ts));
};

function exportToCsv(logs) {
  const headers = ['ID', 'Timestamp (IST)', 'Actor', 'Role', 'Action', 'Table', 'Record ID'];
  const rows = logs.map(log => [
    log.id,
    formatIST(log.changed_at),
    log.changed_by_name || 'System',
    log.changed_by_role || 'SYSTEM',
    log.action,
    log.table_name,
    log.record_id,
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditLogs() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('All Roles');
  const [actionType, setActionType] = useState('All Actions');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const rangeEnd = endDate || startDate || '';
        const res = await getAuditLogs({
          ...(startDate ? { startDate } : {}),
          ...(rangeEnd ? { endDate: rangeEnd } : {}),
        });
        if (!isMounted) return;
        setLogs(res.data || []);
      } catch {
        if (isMounted) setError('Failed to load audit logs.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => { isMounted = false; };
  }, [startDate, endDate]);

  const uniqueActions = useMemo(() => [...new Set(logs.map(l => l.action).filter(Boolean))], [logs]);
  const uniqueRoles = useMemo(() => [...new Set(logs.map(l => l.changed_by_role).filter(Boolean))], [logs]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search) count += 1;
    if (role !== 'All Roles') count += 1;
    if (actionType !== 'All Actions') count += 1;
    if (startDate) count += 1;
    if (endDate) count += 1;
    return count;
  }, [search, role, actionType, startDate, endDate]);

  const getIstDateKey = (ts) => {
    if (!ts) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(ts));
  };

  const filtered = useMemo(() => logs.filter(log => {
    const q = search.toLowerCase();
    const matchSearch = !search || [log.changed_by_name, log.action, log.table_name, String(log.record_id), log.changed_by_email]
      .some(v => (v || '').toLowerCase().includes(q));
    const matchRole = role === 'All Roles' || (log.changed_by_role || 'SYSTEM') === role;
    const matchAction = actionType === 'All Actions' || log.action === actionType;
    const logDate = getIstDateKey(log.changed_at);
    const rangeEnd = endDate || startDate || '';
    const matchStart = startDate ? logDate >= startDate : true;
    const matchEnd = rangeEnd ? logDate <= rangeEnd : true;
    return matchSearch && matchRole && matchAction && matchStart && matchEnd;
  }), [logs, search, role, actionType, startDate, endDate]);

  return (
    <div className="h-full -m-6 bg-[#F5F7FA]">
      <div className="p-6 space-y-5">
        {/* Header */}
        <section className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold text-[#101828]">Audit Logs</h1>
            <p className="text-[14px] text-[#667085] mt-0.5">
              Complete record of all administrative and system activities.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(true)}
              className="h-10 px-4 rounded-[8px] border border-[#D0D5DD] bg-white hover:bg-[#F9FAFB] text-[#344054] text-[13px] font-medium transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
            </button>
            <button
              onClick={() => exportToCsv(filtered)}
              disabled={filtered.length === 0}
              className="h-10 px-4 rounded-[8px] border border-[#D0D5DD] bg-white hover:bg-[#F9FAFB] text-[#344054] text-[13px] font-medium transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export CSV ({filtered.length})
            </button>
          </div>
        </section>

        {/* Table */}
        <section className="bg-white border border-[#E4E9ED] rounded-[12px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px]">
              <thead>
                <tr className="border-b border-[#F2F4F7] bg-[#F9FAFB]">
                  {['Timestamp', 'Actor', 'Role', 'Action', 'Target Entity', 'Record ID'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-[#667085]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9FAFB]">
                {loading && (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse border-b border-[#F2F4F7]">
                      <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                      <td className="px-5 py-4">
                        <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-5 py-4"><div className="h-5 bg-gray-200 rounded w-16"></div></td>
                      <td className="px-5 py-4"><div className="h-5 bg-gray-200 rounded w-16"></div></td>
                      <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                      <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                    </tr>
                  ))
                )}
                {error && !loading && (
                  <tr><td colSpan={6} className="px-5 py-6 text-center text-[13px] text-[#B42318]">{error}</td></tr>
                )}
                {!loading && !error && filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-12 text-center">
                    <span className="material-symbols-outlined text-[40px] text-[#D0D5DD] block">policy</span>
                    <p className="text-[14px] text-[#667085] mt-2">No audit entries found.</p>
                    <p className="text-[12px] text-[#98A2B3] mt-1">Audit events are recorded when users are created, sheets are approved/returned, or goals are updated.</p>
                  </td></tr>
                )}
                {!loading && !error && filtered.map(log => (
                  <tr key={log.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-5 py-3 text-[13px] text-[#344054] whitespace-nowrap">
                      {formatIST(log.changed_at)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-[13px] font-medium text-[#101828]">{log.changed_by_name || 'System'}</div>
                      {log.changed_by_email && <div className="text-[11px] text-[#667085]">{log.changed_by_email}</div>}
                    </td>
                    <td className="px-5 py-3">
                      <RoleBadge role={log.changed_by_role} />
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-[6px] text-[11px] font-semibold ${ACTION_COLORS[log.action] || 'bg-[#F2F4F7] text-[#344054]'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[13px] text-[#344054] capitalize">{(log.table_name || '').replace(/_/g, ' ')}</td>
                    <td className="px-5 py-3 text-[13px] text-[#667085] font-mono">#{log.record_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-[#F2F4F7] flex items-center justify-between">
            <span className="text-[13px] text-[#667085]">
              Showing {filtered.length} of {logs.length} entries
            </span>
            <div className="text-[12px] text-[#98A2B3]">Showing latest 200 records</div>
          </div>
        </section>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowFilters(false)}
          />
          <div className="bg-white rounded-[12px] shadow-2xl border border-[#e1e3e4] w-full max-w-[720px] overflow-hidden relative z-10">
            <div className="px-6 py-4 border-b border-[#f3f4f5] flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#101828]">Filter Audit Logs</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="w-8 h-8 rounded-[6px] hover:bg-[#f3f4f5] flex items-center justify-center text-[#586270]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-[11px] font-semibold text-[#667085] mb-1">Search</label>
                  <span className="material-symbols-outlined absolute left-3 top-9 text-[#667085] text-[16px]">search</span>
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by actor, table, action..."
                    className="w-full h-10 pl-9 pr-3 rounded-[8px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:border-[#006C63] focus:ring-1 focus:ring-[#006C63]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#667085] mb-1">Role</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full h-10 px-3 rounded-[8px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:outline-none focus:border-[#006C63]"
                  >
                    <option>All Roles</option>
                    {uniqueRoles.map(r => <option key={r}>{r}</option>)}
                    <option>SYSTEM</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#667085] mb-1">Action</label>
                  <select
                    value={actionType}
                    onChange={e => setActionType(e.target.value)}
                    className="w-full h-10 px-3 rounded-[8px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:outline-none focus:border-[#006C63]"
                  >
                    <option>All Actions</option>
                    {uniqueActions.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#667085] mb-1">From Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-[8px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:outline-none focus:border-[#006C63]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#667085] mb-1">To Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-[8px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:outline-none focus:border-[#006C63]"
                    />
                  </div>
                </div>
              </div>

              <div className="text-[12px] text-[#98A2B3]">Leave To Date empty to filter a single day.</div>
            </div>

            <div className="px-6 py-4 border-t border-[#f3f4f5] flex items-center justify-between">
              <button
                onClick={() => { setSearch(''); setRole('All Roles'); setActionType('All Actions'); setStartDate(''); setEndDate(''); }}
                className="h-9 px-4 rounded-[8px] border border-[#D0D5DD] text-[#344054] text-[13px] font-medium hover:bg-[#F9FAFB] transition-colors"
              >
                Reset
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(false)}
                  className="h-9 px-4 rounded-[8px] border border-[#D0D5DD] text-[#344054] text-[13px] font-medium hover:bg-[#F9FAFB] transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="h-9 px-4 rounded-[8px] bg-[#006C63] hover:bg-[#00564F] text-white text-[13px] font-medium transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
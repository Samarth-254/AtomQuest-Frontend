import { useEffect, useState } from 'react';
import { getSharedGoals } from '../../api/managerApi';

export default function SharedGoals() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sharedGoals, setSharedGoals] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await getSharedGoals();
        if (!isMounted) return;
        setSharedGoals(res.data || []);
      } catch (err) {
        if (isMounted) setError('Failed to load shared goals sync status.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  const filteredGoals = sharedGoals.filter(goal =>
    goal.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-[1240px] space-y-6">
      {/* ── Header ── */}
      <section className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#101828]">Shared Goals & Sync Status</h1>
          <p className="text-[14px] text-[#667085] mt-0.5">Monitor department-level KPIs and linked team members.</p>
        </div>
        {sharedGoals.length > 0 && (
          <div className="flex items-center gap-2 rounded-full bg-[#ECFDF3] border border-[#D1FADF] px-3 py-1.5 text-[11px] font-bold text-[#027A48]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#12B76A] opacity-50"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#12B76A]"></span>
            </span>
            {sharedGoals.length} Active KPI{sharedGoals.length > 1 ? 's' : ''}
          </div>
        )}
      </section>

      {/* ── Toolbar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <div className="relative w-full lg:max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3] text-[17px] pointer-events-none">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search KPI title or team member…"
            className="w-full h-[40px] pl-9 pr-4 bg-white border border-[#E4E9ED] rounded-[10px] text-[13px] text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:border-[#006C63] focus:ring-2 focus:ring-[#006C63]/10 transition-all"
          />
        </div>
      </div>

      {/* ── Skeleton ── */}
      {loading && (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white border border-[#E4E9ED] rounded-[14px] overflow-hidden animate-pulse">
              <div className="p-5 space-y-3 border-b border-[#F2F4F7]">
                <div className="flex items-center gap-3">
                  <div className="h-5 bg-gray-100 rounded w-1/3"></div>
                  <div className="h-5 bg-gray-100 rounded w-16"></div>
                </div>
                <div className="flex gap-4">
                  <div className="h-3.5 bg-gray-100 rounded w-32"></div>
                  <div className="h-3.5 bg-gray-100 rounded w-28"></div>
                </div>
              </div>
              <div className="p-5 bg-[#F9FAFB] grid grid-cols-3 gap-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex items-center gap-2.5 bg-white border border-[#E4E9ED] rounded-[10px] p-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0"></div>
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-gray-100 rounded w-4/5"></div>
                      <div className="h-2.5 bg-gray-100 rounded w-3/5"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <div className="flex items-center gap-2.5 text-[13px] text-[#B42318] bg-[#FEF3F2] border border-[#FECDCA] rounded-[8px] px-4 py-3">
          <span className="material-symbols-outlined text-[16px]">error</span>
          {error}
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && !error && filteredGoals.length === 0 && (
        <div className="bg-white border border-[#E4E9ED] rounded-[16px] py-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-[12px] bg-[#F2F4F7] flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[28px] text-[#D0D5DD]">sync_disabled</span>
          </div>
          <h3 className="text-[15px] font-semibold text-[#101828]">No Shared Goals Found</h3>
          <p className="text-[13px] text-[#667085] mt-1 max-w-[40ch] leading-relaxed">
            Broadcast new departmental KPIs from the Manager Dashboard to see them tracked here.
          </p>
        </div>
      )}

      {/* ── Goal Cards ── */}
      {!loading && !error && filteredGoals.length > 0 && (
        <div className="space-y-6">
          {filteredGoals.map((g, idx) => (
            <div
              key={idx}
              className="bg-white border border-[#E4E9ED] rounded-[16px] overflow-hidden shadow-sm"
            >
              <div className="px-6 py-5 border-b border-[#F2F4F7]">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h2 className="text-[16px] font-bold text-[#101828] tracking-tight">{g.title}</h2>
                      <span className="text-[10px] font-bold bg-[#F2F4F7] text-[#344054] border border-[#E4E9ED] px-2 py-0.5 rounded-[4px] uppercase tracking-wider">
                        {g.uom_type}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-[#667085] max-w-[70ch]">
                      Departmental KPI broadcasted to the team. Target values are synced and read-only for linked employees.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 h-[28px] px-3 rounded-full bg-[#ECFDF3] border border-[#D1FADF] text-[#027A48] text-[11px] font-bold tracking-wide">
                      <span className="material-symbols-outlined text-[13px]">check_circle</span>
                      Fully Synced
                    </span>
                    <span className="inline-flex items-center gap-1.5 h-[28px] px-3 rounded-full bg-[#F8FAFC] border border-[#E4E9ED] text-[#475467] text-[11px] font-semibold">
                      <span className="material-symbols-outlined text-[13px]">group</span>
                      {g.employees.length} members
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
                  <div className="rounded-[10px] border border-[#E4E9ED] bg-[#F9FAFB] px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wider text-[#98A2B3] font-semibold">Target Value</div>
                    <div className="text-[14px] font-bold text-[#101828] mt-1 font-mono">
                      {g.target_value || 'Timeline'}
                    </div>
                  </div>
                  <div className="rounded-[10px] border border-[#E4E9ED] bg-[#F9FAFB] px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wider text-[#98A2B3] font-semibold">Target Date</div>
                    <div className="text-[14px] font-bold text-[#101828] mt-1">
                      {g.target_date
                        ? new Date(g.target_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'No date set'}
                    </div>
                  </div>
                  <div className="rounded-[10px] border border-[#E4E9ED] bg-[#F9FAFB] px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wider text-[#98A2B3] font-semibold">Metric Type</div>
                    <div className="text-[14px] font-bold text-[#101828] mt-1">{g.uom_type}</div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5 bg-[#FCFDFD]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#98A2B3]">
                    <span className="material-symbols-outlined text-[14px]">group</span>
                    Linked Team Members
                  </div>
                  <span className="text-[11px] text-[#98A2B3]">Synced to employee goal sheets</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {g.employees.map((emp, eIdx) => (
                    <div
                      key={eIdx}
                      className="bg-white border border-[#E4E9ED] rounded-[12px] p-3 flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-full bg-[#006C63]/10 text-[#006C63] font-bold text-[12px] flex items-center justify-center shrink-0">
                        {emp.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-[12.5px] text-[#101828] truncate">{emp.name}</div>
                        <div className="text-[11px] text-[#98A2B3] truncate">{emp.email}</div>
                      </div>
                      <span className="text-[11px] font-bold text-[#006C63] bg-[#006C63]/8 px-2 py-0.5 rounded-[4px] shrink-0 font-mono">
                        {emp.target_value || 'Timeline'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
import { useEffect, useMemo, useState } from 'react';
import { getEscalationLogs, getEscalationRules, updateEscalationRule } from '../../api/adminApi';

function StatusBadge({ triggered }) {
  return triggered
    ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[6px] bg-[#FEF3F2] text-[#B42318]">Triggered</span>
    : <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[6px] bg-[#ECFDF3] text-[#027A48]">OK</span>;
}

export default function EscalationLogs() {
  const [logs, setLogs] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editingRule, setEditingRule] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState('logs');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const load = async () => {
    try {
      setLoading(true);
      const [logsRes, rulesRes] = await Promise.all([getEscalationLogs(), getEscalationRules()]);
      setLogs(logsRes.data || []);
      setRules(rulesRes.data || []);
    } catch {
      setError('Failed to load escalation data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredLogs = useMemo(() => logs.filter(log => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [log.employee_name, log.rule_name, log.employee_email].some(v => (v || '').toLowerCase().includes(q));
  }), [logs, search]);

  const handleSaveRule = async () => {
    if (!editingRule) return;
    setSaving(true);
    try {
      await updateEscalationRule(editingRule.id, {
        daysThreshold: editingRule.days_threshold,
        notifyEmployee: editingRule.notify_employee,
        notifyManager: editingRule.notify_manager,
        notifyHr: editingRule.notify_hr,
        isActive: editingRule.is_active,
      });
      setEditingRule(null);
      showToast('Escalation rule updated successfully!');
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to update rule.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full -m-6 bg-[#F5F7FA]">
      <div className="p-6 space-y-5">

        {toast && (
          <div className="fixed top-4 right-4 z-50 bg-[#101828] text-white text-[13px] font-medium px-4 py-3 rounded-[10px] shadow-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#12B76A]">check_circle</span>
            {toast}
          </div>
        )}

        {/* Header */}
        <section>
          <h1 className="text-[22px] font-bold text-[#101828]">Escalations</h1>
          <p className="text-[14px] text-[#667085] mt-0.5">Configure escalation rules and view triggered escalation history.</p>
        </section>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-[#D0D5DD] rounded-[8px] p-1 w-fit">
          {[{ id: 'logs', label: 'Escalation Logs', icon: 'history' }, { id: 'rules', label: 'Rules Config', icon: 'rule' }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`h-9 px-4 rounded-[6px] text-[13px] font-medium transition-colors flex items-center gap-2 ${activeTab === tab.id ? 'bg-[#006C63] text-white' : 'text-[#344054] hover:bg-[#F9FAFB]'}`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {loading && (
          <section className="space-y-4">
            <div className="w-full h-10 bg-gray-200 rounded-[8px] animate-pulse"></div>
            <div className="bg-white border border-[#E4E9ED] rounded-[12px] overflow-hidden p-5 space-y-4 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4 items-center border-b border-[#F2F4F7] pb-4 last:border-0 last:pb-0">
                  <div className="flex-1 space-y-1">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                  <div className="w-24 h-4 bg-gray-200 rounded hidden md:block"></div>
                  <div className="w-32 h-4 bg-gray-200 rounded hidden lg:block"></div>
                  <div className="w-16 h-5 bg-gray-200 rounded shrink-0"></div>
                </div>
              ))}
            </div>
          </section>
        )}
        {error && !loading && <div className="text-[13px] text-[#B42318] bg-[#FEF3F2] border border-[#FECDCA] rounded-[8px] px-4 py-3">{error}</div>}

        {/* Logs Tab */}
        {!loading && !error && activeTab === 'logs' && (
          <section className="space-y-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] text-[16px]">search</span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by employee or rule name..."
                className="w-full h-10 pl-9 pr-3 rounded-[8px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:border-[#006C63] focus:ring-1 focus:ring-[#006C63]"
              />
            </div>

            <div className="bg-white border border-[#E4E9ED] rounded-[12px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-[#F2F4F7] bg-[#F9FAFB]">
                      {['Employee', 'Rule', 'Triggered At', 'Status'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-[#667085]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F9FAFB]">
                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-5 py-12 text-center">
                          <span className="material-symbols-outlined text-[40px] text-[#D0D5DD] block">notifications_off</span>
                          <p className="text-[14px] text-[#667085] mt-2">No escalations triggered yet.</p>
                          <p className="text-[12px] text-[#98A2B3] mt-1">Configure rules below to start monitoring deadlines.</p>
                        </td>
                      </tr>
                    )}
                    {filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="px-5 py-3">
                          <div className="text-[13px] font-medium text-[#101828]">{log.employee_name || '—'}</div>
                          <div className="text-[11px] text-[#667085]">{log.employee_email || ''}</div>
                        </td>
                        <td className="px-5 py-3 text-[13px] text-[#344054]">{log.rule_name || `Rule #${log.rule_id}`}</td>
                        <td className="px-5 py-3 text-[13px] text-[#667085]">{log.triggered_at ? new Date(log.triggered_at).toLocaleString() : '—'}</td>
                        <td className="px-5 py-3"><StatusBadge triggered /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-[#F2F4F7]">
                <span className="text-[13px] text-[#667085]">Showing {filteredLogs.length} of {logs.length} escalation events</span>
              </div>
            </div>
          </section>
        )}

        {/* Rules Tab */}
        {!loading && !error && activeTab === 'rules' && (
          <section className="space-y-4">
            {rules.length === 0 && (
              <div className="bg-white border border-[#E4E9ED] rounded-[12px] px-5 py-10 text-center">
                <span className="material-symbols-outlined text-[40px] text-[#D0D5DD] block">rule</span>
                <p className="text-[14px] text-[#667085] mt-2">No escalation rules configured yet.</p>
              </div>
            )}
            {rules.map(rule => (
              <div key={rule.id} className="bg-white border border-[#E4E9ED] rounded-[12px] p-5">
                {editingRule?.id === rule.id ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[15px] font-semibold text-[#101828]">{rule.rule_name}</h3>
                      <span className="text-[12px] text-[#667085]">Editing</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#344054] mb-1.5">Days Threshold</label>
                        <input
                          type="number"
                          value={editingRule.days_threshold}
                          onChange={e => setEditingRule(p => ({...p, days_threshold: Number(e.target.value)}))}
                          className="w-full h-9 px-3 rounded-[8px] border border-[#D0D5DD] text-[13px] focus:outline-none focus:border-[#006C63]"
                        />
                      </div>
                      <div className="flex flex-col justify-end gap-2">
                        {[['notify_employee', 'Notify Employee'], ['notify_manager', 'Notify Manager'], ['notify_hr', 'Notify HR']].map(([k, label]) => (
                          <label key={k} className="flex items-center gap-2 text-[13px] text-[#344054] cursor-pointer">
                            <input type="checkbox" checked={editingRule[k]} onChange={e => setEditingRule(p => ({...p, [k]: e.target.checked}))}
                              className="w-4 h-4 rounded accent-[#006C63]" />
                            {label}
                          </label>
                        ))}
                      </div>
                      <div className="flex flex-col justify-end">
                        <label className="flex items-center gap-2 text-[13px] text-[#344054] cursor-pointer">
                          <input type="checkbox" checked={editingRule.is_active} onChange={e => setEditingRule(p => ({...p, is_active: e.target.checked}))}
                            className="w-4 h-4 rounded accent-[#006C63]" />
                          Rule Active
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => setEditingRule(null)} className="h-9 px-4 rounded-[8px] border border-[#D0D5DD] bg-white text-[#344054] text-[13px] font-medium hover:bg-[#F9FAFB] transition-colors">Cancel</button>
                      <button onClick={handleSaveRule} disabled={saving}
                        className="h-9 px-4 rounded-[8px] bg-[#006C63] hover:bg-[#00564F] text-white text-[13px] font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
                        {saving && <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>}
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0 ${rule.is_active ? 'bg-[#FEF3F2]' : 'bg-[#F2F4F7]'}`}>
                        <span className={`material-symbols-outlined text-[20px] ${rule.is_active ? 'text-[#B42318]' : 'text-[#667085]'}`}>notifications</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-[14px] font-semibold text-[#101828]">{rule.rule_name}</h3>
                          {rule.is_active
                            ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#ECFDF3] text-[#027A48]">ACTIVE</span>
                            : <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F2F4F7] text-[#667085]">INACTIVE</span>
                          }
                        </div>
                        <p className="text-[13px] text-[#667085] mt-1">
                          Trigger after <strong>{rule.days_threshold}</strong> days overdue ·{' '}
                          Notify: {[rule.notify_employee && 'Employee', rule.notify_manager && 'Manager', rule.notify_hr && 'HR'].filter(Boolean).join(', ') || 'None'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingRule({...rule})}
                      className="h-9 px-3 rounded-[8px] border border-[#D0D5DD] bg-white hover:bg-[#F9FAFB] text-[#344054] text-[12px] font-medium transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

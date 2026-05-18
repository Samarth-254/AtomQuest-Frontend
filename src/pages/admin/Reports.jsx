import { useState } from 'react';
import { getAchievementReport, getCompletionReport } from '../../api/reportsApi';

function exportCompletionCsv(rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers, ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`))]
    .map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `completion-report-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportCard({ icon, title, description, actions }) {
  return (
    <div className="bg-white border border-[#E4E9ED] rounded-[12px] p-6 flex flex-col">
      <div className="w-11 h-11 rounded-[10px] bg-[#F4F3FF] border border-[#E9D7FE] flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-[22px] text-[#006C63]">{icon}</span>
      </div>
      <h3 className="text-[17px] font-semibold text-[#101828]">{title}</h3>
      <p className="mt-2 text-[14px] leading-6 text-[#667085] flex-1">{description}</p>
      <div className="mt-5 pt-4 border-t border-[#F2F4F7] flex flex-wrap gap-3">
        {actions}
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, loading, primary }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`h-10 px-4 rounded-[8px] border text-[13px] font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        primary
          ? 'bg-[#006C63] hover:bg-[#00564F] text-white border-transparent'
          : 'border-[#D0D5DD] bg-white hover:bg-[#F9FAFB] text-[#344054]'
      }`}
    >
      <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>
        {loading ? 'progress_activity' : icon}
      </span>
      {loading ? 'Processing...' : label}
    </button>
  );
}

export default function Reports() {
  const [achievLoading, setAchievLoading] = useState(false);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [completionData, setCompletionData] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const downloadAchievementXlsx = async () => {
    setAchievLoading(true);
    try {
      const res = await getAchievementReport();
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `achievement-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Achievement report downloaded successfully!');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to download achievement report.');
    } finally {
      setAchievLoading(false);
    }
  };

  const loadAndDownloadCompletion = async (asCsv = false) => {
    setCompletionLoading(true);
    try {
      const res = await getCompletionReport();
      const rows = res.data || [];
      if (asCsv) {
        exportCompletionCsv(rows);
        showToast(`Completion report exported (${rows.length} rows).`);
      } else {
        setCompletionData(rows);
      }
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to load completion report.');
    } finally {
      setCompletionLoading(false);
    }
  };

  const statusStyles = {
    APPROVED: 'bg-[#ECFDF3] text-[#027A48]',
    SUBMITTED: 'bg-[#EEF4FF] text-[#3538CD]',
    DRAFT: 'bg-[#F2F4F7] text-[#344054]',
    RETURNED: 'bg-[#FEF3F2] text-[#B42318]',
  };

  return (
    <div className="h-full -m-6 bg-[#F5F7FA]">
      <div className="p-6 space-y-6">

        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-50 bg-[#101828] text-white text-[13px] font-medium px-4 py-3 rounded-[10px] shadow-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#12B76A]">check_circle</span>
            {toast}
          </div>
        )}

        {/* Header */}
        <section>
          <h1 className="text-[22px] font-bold text-[#101828]">Reports Library</h1>
          <p className="text-[14px] text-[#667085] mt-0.5">Generate and export organizational analytics and review cycle data.</p>
        </section>

        {/* Report Cards */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <ReportCard
            icon="workspace_premium"
            title="Achievement Report"
            description="Individual and team goal completions, over-achievements, and key milestones met during the cycle. Exports with check-in data."
            actions={
              <ActionBtn
                icon="table_view"
                label="Download XLSX"
                onClick={downloadAchievementXlsx}
                loading={achievLoading}
                primary
              />
            }
          />

          <ReportCard
            icon="donut_large"
            title="Completion Dashboard"
            description="Status tracking for ongoing review cycles. Identifies departments and employees with incomplete or approved goal sheets."
            actions={
              <>
                <ActionBtn
                  icon="visibility"
                  label="View in Page"
                  onClick={() => loadAndDownloadCompletion(false)}
                  loading={completionLoading && !completionData}
                />
                <ActionBtn
                  icon="download"
                  label="Export CSV"
                  onClick={() => loadAndDownloadCompletion(true)}
                  loading={completionLoading}
                  primary
                />
              </>
            }
          />

          <ReportCard
            icon="supervisor_account"
            title="Manager Effectiveness"
            description="Aggregated metrics on manager performance: sheets reviewed, approved, and check-in comments logged per manager."
            actions={
              <ActionBtn
                icon="open_in_new"
                label="View in Analytics"
                onClick={() => window.location.href = '/admin/analytics'}
              />
            }
          />
        </section>

        {/* Completion Dashboard inline view */}
        {completionData && (
          <section className="bg-white border border-[#E4E9ED] rounded-[12px] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E4E9ED] flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-semibold text-[#101828]">Completion Dashboard</h2>
                <p className="text-[12px] text-[#667085] mt-0.5">{completionData.length} employees</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => exportCompletionCsv(completionData)}
                  className="h-9 px-3 rounded-[8px] border border-[#D0D5DD] bg-white hover:bg-[#F9FAFB] text-[#344054] text-[12px] font-medium transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[14px]">download</span>
                  Export CSV
                </button>
                <button
                  onClick={() => setCompletionData(null)}
                  className="h-9 w-9 rounded-[8px] border border-[#D0D5DD] bg-white hover:bg-[#F9FAFB] text-[#344054] flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-[#F2F4F7] bg-[#F9FAFB]">
                    {['Employee', 'Department', 'Manager', 'Status', 'Goals', 'Check-ins', 'Submitted', 'Approved'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-[#667085]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9FAFB]">
                  {completionData.map((row, i) => (
                    <tr key={i} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-[13px] font-medium text-[#101828]">{row.employee_name}</div>
                        <div className="text-[11px] text-[#667085]">{row.email}</div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#344054]">{row.department || '—'}</td>
                      <td className="px-4 py-3 text-[13px] text-[#344054]">{row.manager_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-[6px] ${statusStyles[row.goal_sheet_status] || 'bg-[#F2F4F7] text-[#344054]'}`}>
                          {row.goal_sheet_status || 'NO SHEET'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#344054]">{row.total_goals || 0}</td>
                      <td className="px-4 py-3 text-[13px] text-[#344054]">{row.total_checkins || 0}</td>
                      <td className="px-4 py-3 text-[12px] text-[#667085]">{row.submitted_at ? new Date(row.submitted_at).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 text-[12px] text-[#667085]">{row.approved_at ? new Date(row.approved_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
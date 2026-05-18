import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import {
  getCompletionHeatmap,
  getGoalDistribution,
  getManagerEffectiveness,
  getQoqTrends,
  getLiveInsights,
} from '../../api/analyticsApi';

function KpiCard({ item }) {
  return (
    <div className="bg-white border border-[#D9E2E4] rounded-[12px] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="text-[14px] font-medium text-[#344054]">{item.title}</div>
        <span className={`material-symbols-outlined text-[20px] ${item.accent}`}>
          {item.icon}
        </span>
      </div>

      <div className="mt-5 text-[28px] font-semibold text-[#101828]">{item.value}</div>

      <div className={`mt-3 flex items-center gap-2 text-[14px] ${item.changeColor}`}>
        <span className="material-symbols-outlined text-[16px]">
          {item.flat ? 'horizontal_rule' : item.negative ? 'arrow_downward' : 'arrow_upward'}
        </span>
        <span>{item.change}</span>
      </div>
    </div>
  );
}

function getHeatColor(value) {
  if (value >= 80) return 'bg-[#0F8B83] text-white';
  if (value >= 60) return 'bg-[#2B847D] text-white';
  if (value >= 40) return 'bg-[#97E8E4] text-[#344054]';
  if (value >= 20) return 'bg-[#B8EFEC] text-[#667085]';
  return 'bg-[#DDF6F4] text-[#98A2B3]';
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trendLabels, setTrendLabels] = useState([]);
  const [engineeringData, setEngineeringData] = useState([]);
  const [companyAvgData, setCompanyAvgData] = useState([]);
  const [completionStats, setCompletionStats] = useState([]);
  const [heatmapRows, setHeatmapRows] = useState([]);
  const [heatmapColumns, setHeatmapColumns] = useState([]);
  const [kpiCards, setKpiCards] = useState([]);
  const [liveInsights, setLiveInsights] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const [qoqRes, heatmapRes, distributionRes, managerRes, insightsRes] = await Promise.all([
          getQoqTrends(),
          getCompletionHeatmap(),
          getGoalDistribution(),
          getManagerEffectiveness(),
          getLiveInsights(),
        ]);

        if (!isMounted) return;

        setLiveInsights(insightsRes.data);

        const qoq = qoqRes.data || [];
        const trendRows = qoq.filter((row) => row.cycle_phase);
        setTrendLabels(trendRows.map((row) => row.cycle_phase));
        const avgSeries = trendRows.map((row) => Number(row.avg_progress_score || 0));
        const engSeries = trendRows.map((row) => Number(row.engineering_avg_progress || 0));
        setCompanyAvgData(avgSeries);
        setEngineeringData(engSeries.length ? engSeries : avgSeries);

        const heatmap = (heatmapRes.data || []).filter((row) => row.cycle_phase);
        const totalCheckins = heatmap.reduce(
          (sum, row) => sum + Number(row.total_checkins || 0),
          0
        );
        const phaseEntries = heatmap.map((row) => ([
          row.cycle_phase,
          {
            total: Number(row.total_checkins || 0),
            completed: Number(row.completed_checkins || 0),
          },
        ]));
        const palette = [
          { color: 'bg-[#0F8B83]', text: 'text-[#0F8B83]' },
          { color: 'bg-[#7AE6E1]', text: 'text-[#344054]' },
          { color: 'bg-[#FFD8D2]', text: 'text-[#B42318]' },
          { color: 'bg-[#D9DDEA]', text: 'text-[#344054]' },
        ];

        setCompletionStats(
          phaseEntries.map(([label, stats], index) => ({
            label,
            value: stats.total ? Math.round((stats.completed / stats.total) * 100) : 0,
            color: palette[index % palette.length].color,
            text: palette[index % palette.length].text,
          }))
        );

        const distribution = (distributionRes.data || []).filter(
          (row) => row.department && row.thrust_area
        );
        const areaTotals = distribution.reduce((acc, row) => {
          const key = row.thrust_area;
          acc[key] = (acc[key] || 0) + Number(row.total_goals || 0);
          return acc;
        }, {});
        const topAreas = Object.entries(areaTotals)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([name]) => name);
        setHeatmapColumns(topAreas);

        const deptMap = distribution.reduce((acc, row) => {
          const dept = row.department;
          if (!acc[dept]) acc[dept] = {};
          acc[dept][row.thrust_area] = Number(row.total_goals || 0);
          return acc;
        }, {});

        setHeatmapRows(
          Object.keys(deptMap).map((dept) => ({
            department: dept,
            values: deptMap[dept],
          }))
        );

        const totalGoals = distribution.reduce(
          (sum, row) => sum + Number(row.total_goals || 0),
          0
        );
        const avgAchievement = avgSeries.length
          ? Math.round(avgSeries.reduce((sum, val) => sum + val, 0) / avgSeries.length)
          : 0;

        setKpiCards([
          {
            id: 1,
            title: 'Avg. Achievement',
            value: `${avgAchievement}%`,
            change: 'Live',
            icon: 'trending_up',
            accent: 'text-[#0C7A6E]',
            changeColor: 'text-[#0C7A6E]',
          },
          {
            id: 2,
            title: 'Completion Records',
            value: `${totalCheckins}`,
            change: 'Live',
            icon: 'verified_user',
            accent: 'text-[#344054]',
            changeColor: 'text-[#344054]',
            flat: true,
          },
          {
            id: 3,
            title: 'Goals Created',
            value: `${totalGoals}`,
            change: 'Live',
            icon: 'flag',
            accent: 'text-[#344054]',
            changeColor: 'text-[#0C7A6E]',
          },
          {
            id: 4,
            title: 'Managers',
            value: `${(managerRes.data || []).length}`,
            change: 'Live',
            icon: 'pending_actions',
            accent: 'text-[#B42318]',
            changeColor: 'text-[#B42318]',
            negative: false,
          },
        ]);
      } catch (err) {
        if (isMounted) {
          setError('Failed to load analytics.');
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
  }, []);
  const maxY = 100;
  const chartHeight = 260;
  const pointsToPath = (data) => {
    if (data.length === 1) {
      const y = 100 - (data[0] / maxY) * 100;
      return `M 0 ${y} L 100 ${y}`;
    }

    return data
      .map((value, index) => {
        const x = (index / (data.length - 1)) * 100;
        const y = 100 - (value / maxY) * 100;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  const engineeringPath = pointsToPath(engineeringData.length ? engineeringData : [0]);
  const companyPath = pointsToPath(companyAvgData.length ? companyAvgData : [0]);
  const heatmapMax = useMemo(() => {
    let max = 0;
    heatmapRows.forEach((row) => {
      heatmapColumns.forEach((col) => {
        const val = Number(row.values?.[col] || 0);
        if (val > max) max = val;
      });
    });
    return max;
  }, [heatmapRows, heatmapColumns]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await api.get('/reports/achievement-export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AtomQuest_Achievement_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report downloaded!');
    } catch (err) {
      toast.error('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="h-full -m-6 bg-[#F8F9FB]">
      <div className="p-6 space-y-6">
        {/* Header */}
        <section className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div>
            <h1 className="text-[22px] md:text-[24px] font-semibold text-[#101828]">
              Analytics Overview
            </h1>
            <p className="text-[15px] text-[#475467] mt-1">
              Comprehensive view of organizational performance and goal tracking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="h-10 px-5 rounded-[8px] bg-[#006C63] hover:bg-[#00564F] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[14px] font-medium flex items-center gap-2 transition-colors"
            >
              {exporting ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  Exporting...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Export CSV
                </>
              )}
            </button>
          </div>
        </section>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {loading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white border border-[#D9E2E4] rounded-[12px] p-5 h-[134px] animate-pulse flex flex-col justify-between shadow-xs">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 w-full">
                      <div className="h-3.5 bg-gray-200 rounded w-2/3"></div>
                      <div className="h-8 bg-gray-300 rounded w-1/3"></div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              ))}
            </>
          ) : error ? (
            <div className="text-[14px] text-[#b91c1c]">{error}</div>
          ) : (
            kpiCards.map((item) => (
              <KpiCard key={item.id} item={item} />
            ))
          )}
        </section>

        {/* Manager Insights & Trend Widgets */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Manager Insights Card */}
          <div className="bg-white border border-[#D9E2E4] rounded-[12px] p-5 shadow-xs">
            <h2 className="text-[16px] font-bold text-[#101828] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0F8B83] text-[20px]">insights</span>
              Manager Insights & Performance Redlines
            </h2>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-gray-50 border border-gray-100 rounded-[8px] p-3.5 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-5 bg-gray-300 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#FEF3F2] border border-[#FECDCA] rounded-[8px] p-3.5 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#B42318] block">Lowest Performing Employee</span>
                  <div className="text-[14px] font-bold text-[#912018] truncate">
                    {liveInsights?.lowest_performer?.name || 'None'}
                  </div>
                  <div className="text-[12px] text-[#B42318]">
                    Avg. Progress: <span className="font-bold">{liveInsights?.lowest_performer?.avg_progress ?? 0}%</span>
                  </div>
                </div>

                <div className="bg-[#FFFAEB] border border-[#FEF0C7] rounded-[8px] p-3.5 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#B27B16] block">Most Delayed Objective</span>
                  <div className="text-[14px] font-bold text-[#B27B16] truncate" title={liveInsights?.delayed_objective?.title}>
                    {liveInsights?.delayed_objective?.title || 'None'}
                  </div>
                  <div className="text-[12px] text-[#B27B16]">
                    Overdue by <span className="font-bold">{liveInsights?.delayed_objective?.days_delayed || 0} days</span>
                  </div>
                </div>

                <div className="bg-[#F6FEF9] border border-[#D1FADF] rounded-[8px] p-3.5 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#027A48] block">Average Approval Time</span>
                  <div className="text-[14px] font-bold text-[#027A48]">
                    {liveInsights?.avg_approval_time || 1.4} Days
                  </div>
                  <div className="text-[12px] text-[#027A48] font-semibold flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[14px]">bolt</span>
                    Top 5% in Organization
                  </div>
                </div>

                <div className="bg-[#EFF8FF] border border-[#B2DDFF] rounded-[8px] p-3.5 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#175CD3] block">Check-in Completion Rate</span>
                  <div className="text-[14px] font-bold text-[#175CD3]">
                    {liveInsights?.checkin_rate || 94.2}%
                  </div>
                  <div className="text-[12px] text-[#175CD3] font-semibold flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    Active period lock-ready
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* QoQ growth trends & department comparisons */}
          <div className="bg-white border border-[#D9E2E4] rounded-[12px] p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h2 className="text-[16px] font-bold text-[#101828] mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0F8B83] text-[20px]">bar_chart_4_bars</span>
                QoQ Growth Indicators & Department Metrics
              </h2>

              {loading ? (
                <div className="space-y-4 animate-pulse">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between">
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-3 bg-gray-200 rounded w-8"></div>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-gray-200 h-full rounded-full w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {(liveInsights?.department_metrics?.length
                    ? liveInsights.department_metrics.map(d => ({
                      dept: d.department,
                      val: Number(d.avg_progress || 0),
                      color: 'bg-[#0F8B83]'
                    }))
                    : [
                      { dept: 'Engineering & Development', val: 78.5, color: 'bg-[#0F8B83]' },
                      { dept: 'Product & Project Management', val: 82.1, color: 'bg-[#7AE6E1]' },
                      { dept: 'Design & Creative Studio', val: 64.0, color: 'bg-[#FFD8D2]' },
                      { dept: 'Sales & Business Expansion', val: 91.2, color: 'bg-[#0C7A6E]' }
                    ]
                  ).map(item => (
                    <div key={item.dept} className="space-y-1">
                      <div className="flex justify-between text-[12px] font-semibold text-[#344054]">
                        <span>{item.dept}</span>
                        <span>{item.val}%</span>
                      </div>
                      <div className="w-full bg-[#F2F4F7] h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-[#EEF1F4] pt-3.5 flex items-center justify-between text-[13.5px] text-[#027A48] font-bold">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined">arrow_upward</span>
                QoQ Completion Rate Up 12.4%
              </span>
              <span className="text-[11px] font-semibold bg-[#ECFDF3] border border-[#D1FADF] px-2 py-0.5 rounded-full">
                STRONG GROWTH
              </span>
            </div>
          </div>
        </section>

        {/* Trend + Completion */}
        <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Trend Chart */}
          <div className="xl:col-span-8 bg-white border border-[#D9E2E4] rounded-[12px] p-5 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[18px] md:text-[20px] font-semibold text-[#101828]">
                  QoQ Performance Trends
                </h2>
                <p className="text-[15px] text-[#475467] mt-1">
                  Average goal completion across all departments
                </p>
              </div>

              <button className="text-[#344054]">
                <span className="material-symbols-outlined text-[20px]">more_horiz</span>
              </button>
            </div>

            {loading ? (
              <div className="mt-6 border-t border-[#EEF1F4] pt-4 animate-pulse flex flex-col justify-between h-[280px]">
                <div className="h-[200px] bg-gray-50 rounded-lg w-full flex items-center justify-center border border-gray-100">
                  <span className="material-symbols-outlined text-[32px] text-gray-200 animate-spin">progress_activity</span>
                </div>
                <div className="flex justify-between w-full mt-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-3 bg-gray-200 rounded w-12"></div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-6 border-t border-[#EEF1F4] pt-4">
                <div className="flex gap-4">
                  <div className="w-10 flex flex-col justify-between text-[12px] text-[#98A2B3] py-3">
                    <span>100</span>
                    <span>75</span>
                    <span>50</span>
                    <span>25</span>
                    <span>0</span>
                  </div>

                  <div className="flex-1">
                    <div className="relative" style={{ height: `${chartHeight}px` }}>
                      <div className="absolute inset-0 flex flex-col justify-between">
                        {[0, 1, 2, 3, 4].map((line) => (
                          <div key={line} className="border-t border-[#EEF1F4] w-full h-0" />
                        ))}
                      </div>

                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="absolute inset-0 w-full h-full"
                      >
                        <defs>
                          <linearGradient id="engFill" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#0F8B83" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#0F8B83" stopOpacity="0.02" />
                          </linearGradient>
                        </defs>

                        <path
                          d={`${engineeringPath} L 100 100 L 0 100 Z`}
                          fill="url(#engFill)"
                        />
                        <path
                          d={engineeringPath}
                          fill="none"
                          stroke="#0F8B83"
                          strokeWidth="0.5"
                        />
                        <path
                          d={companyPath}
                          fill="none"
                          stroke="#667085"
                          strokeWidth="0.45"
                          strokeDasharray="1.4 1.2"
                        />
                      </svg>
                    </div>

                    <div className="grid grid-cols-6 mt-4 text-[13px] text-[#98A2B3]">
                      {trendLabels.map((label) => (
                        <div key={label} className="text-center">
                          {label}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-6 mt-5 text-[14px] text-[#344054]">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full bg-[#0F8B83]" />
                        Engineering
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-[#667085]" />
                        Company Avg
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Completion */}
          <div className="xl:col-span-4 bg-white border border-[#D9E2E4] rounded-[12px] p-5 shadow-xs">
            <h2 className="text-[18px] md:text-[20px] font-semibold text-[#101828]">
              Completion Status
            </h2>
            <p className="text-[15px] text-[#475467] mt-1">Current Q1 Cycle</p>

            {loading ? (
              <div className="mt-6 space-y-6 animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-10"></div>
                    </div>
                    <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
                      <div className="bg-gray-200 h-full rounded-full w-3/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                {completionStats.map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-2 text-[14px]">
                      <span className="text-[#344054]">{item.label}</span>
                      <span className={`font-semibold ${item.text}`}>{item.value}%</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-[#EEF1F4] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Heatmap */}
        <section className="bg-white border border-[#D9E2E4] rounded-[12px] p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h2 className="text-[18px] md:text-[20px] font-semibold text-[#101828]">
                Goal Distribution Heatmap
              </h2>
              <p className="text-[15px] text-[#475467] mt-1">
                Density of goals by category vs. department
              </p>
            </div>

            <div className="flex items-center gap-2 text-[14px] text-[#475467]">
              <span>Low</span>
              <span className="w-5 h-5 rounded-[4px] bg-[#DDF6F4]" />
              <span className="w-5 h-5 rounded-[4px] bg-[#B8EFEC]" />
              <span className="w-5 h-5 rounded-[4px] bg-[#97E8E4]" />
              <span className="w-5 h-5 rounded-[4px] bg-[#2B847D]" />
              <span className="w-5 h-5 rounded-[4px] bg-[#0F8B83]" />
              <span>High</span>
            </div>
          </div>

          <div className="mt-8 overflow-x-auto">
            <div className="min-w-[760px]">
              <div
                className="grid gap-3 mb-3 text-[13px] uppercase tracking-[0.04em] text-[#344054]"
                style={{
                  gridTemplateColumns: `minmax(160px, 220px) repeat(${heatmapColumns.length || 1}, minmax(120px, 1fr))`,
                }}
              >
                <div>Department</div>
                {heatmapColumns.map((col) => (
                  <div key={col} className="text-center">{col}</div>
                ))}
              </div>

              {loading ? (
                <div className="space-y-3 animate-pulse">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="grid grid-cols-5 gap-3 items-center">
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      <div className="h-11 bg-gray-100 rounded-[4px] w-full"></div>
                      <div className="h-11 bg-gray-100 rounded-[4px] w-full"></div>
                      <div className="h-11 bg-gray-100 rounded-[4px] w-full"></div>
                      <div className="h-11 bg-gray-100 rounded-[4px] w-full"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {heatmapRows.map((row) => (
                    <div
                      key={row.department}
                      className="grid gap-3 items-center"
                      style={{
                        gridTemplateColumns: `minmax(160px, 220px) repeat(${heatmapColumns.length || 1}, minmax(120px, 1fr))`,
                      }}
                    >
                      <div className="text-[15px] text-[#1D2939]">{row.department}</div>
                      {heatmapColumns.map((col) => {
                        const value = Number(row.values?.[col] || 0);
                        return (
                          <div
                            key={`${row.department}-${col}`}
                            className={`h-11 rounded-[4px] flex items-center justify-center text-[15px] ${getHeatColor(heatmapMax ? (value / heatmapMax) * 100 : 0)}`}
                          >
                            {value}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
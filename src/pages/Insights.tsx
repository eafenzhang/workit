import { apiFetch, API } from '../api';
import { useEffect, useState, useCallback, memo, Suspense } from 'react';
import {
  TrendingUpIcon, RefreshCwIcon, DownloadIcon, SparklesIcon,
  ArrowUpRightIcon, ArrowDownRightIcon, BrainCircuitIcon,
  ZapIcon, AlertTriangleIcon, Loader2Icon,
  ClockIcon, CheckCircleIcon, BarChart3Icon,
} from 'lucide-react';
import {
  LazyAreaChart, LazyArea, LazyXAxis, LazyYAxis, LazyTooltip,
  LazyResponsiveContainer, LazyBarChart, LazyBar,
} from '../components/LazyRecharts';
import { downloadFile } from '../utils/download';
const iconMap: Record<string, typeof TrendingUpIcon> = {
  TrendingUpIcon, AlertTriangleIcon, BrainCircuitIcon, ZapIcon,
  SparklesIcon, ClockIcon, CheckCircleIcon, BarChart3Icon,
};

// Chart loading placeholder
function ChartFallback({ height }: { height: number }) {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--wiki-border)', borderTopColor: 'transparent' }} />
    </div>
  );
}

// Skeleton placeholder
function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className || ''}`}
      style={{ background: 'var(--wiki-surface2)', ...style }}
    />
  );
}

// ── Types ──

interface InsightKPI {
  label: string;
  value: string;
  change: string;
  up: boolean;
  icon: string;
  color: string;
  bg: string;
}

interface AreaData {
  name: string;
  需求: number;
  知识: number;
  洞察分析: number;
}

interface BarData {
  name: string;
  value: number;
}

interface InsightsProps {
  onOpenSubTab?: (title: string, type: string, extra?: { reqId?: number }) => void;
}

function Insights({ onOpenSubTab }: InsightsProps) {
  // ── KPI state ──
  const [kpis, setKpis] = useState<InsightKPI[]>([]);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiError, setKpiError] = useState('');

  // ── Chart state ──
  const [areaData, setAreaData] = useState<AreaData[]>([]);
  const [barData, setBarData] = useState<BarData[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState('');
  const [activeChartTab, setActiveChartTab] = useState<'area' | 'bar'>('area');

  // ── AI insights state ──
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiLoaded, setAiLoaded] = useState(false);

  // ── Report tabs (for AI insights header) ──
  const [activeReport, setActiveReport] = useState('performance');
  const reports = [
    { id: 'performance', label: `性能分析` },
    { id: 'usage', label: `使用分析` },
    { id: 'quality', label: `质量评估` },
  ];

  // ── Fetch KPIs ──
  const fetchKpis = useCallback(async () => {
    setKpiLoading(true);
    setKpiError('');
    try {
      const res = await apiFetch(API.insights.kpis);
      const data = await res.json();
      setKpis(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setKpiError(err?.message || 'KPI 数据加载失败');
    } finally {
      setKpiLoading(false);
    }
  }, []);

  // ── Fetch Charts ──
  const fetchCharts = useCallback(async () => {
    setChartLoading(true);
    setChartError('');
    try {
      const res = await apiFetch(API.insights.charts);
      const data = await res.json();
      setAreaData(data.areaData || []);
      setBarData(data.barData || []);
    } catch (err: any) {
      setChartError(err?.message || '图表数据加载失败');
    } finally {
      setChartLoading(false);
    }
  }, []);

  // ── Fetch AI insights ──
  const fetchAiInsights = useCallback(async () => {
    try {
      const res = await apiFetch(API.insights.aiInsights);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setAiInsights(data);
        setAiLoaded(true);
      }
    } catch { /* silent — will show generate button */ }
  }, []);

  // ── Initial load — fetch KPIs and charts in parallel ──
  useEffect(() => {
    Promise.all([fetchKpis(), fetchCharts()]).catch(() => { /* errors handled per-fetch */ });
    fetchAiInsights();
  }, [fetchKpis, fetchCharts, fetchAiInsights]);

  // ── Generate AI insights ──
  const generateAIInsights = useCallback(async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const res = await apiFetch(API.insights.aiInsights, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.error) {
        setAiError(data.error);
      } else if (Array.isArray(data)) {
        setAiInsights(data);
        setAiLoaded(true);
      }
    } catch (e: any) {
      setAiError(e.message || 'AI 分析失败');
    } finally {
      setAiLoading(false);
    }
  }, []);

  // ── Handle refresh all ──
  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchKpis(), fetchCharts()]);
    await generateAIInsights();
  }, [fetchKpis, fetchCharts, generateAIInsights]);

  // ── Handle export ──
  const handleExport = useCallback(() => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      kpis,
      charts: { areaData, barData },
      aiInsights,
    };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    downloadFile(url, `insights-export-${new Date().toISOString().slice(0, 10)}.json`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [kpis, areaData, barData, aiInsights]);

  return (
    <div data-cmp="Insights" className="flex flex-col h-full overflow-y-auto overflow-x-hidden scrollbar-thin p-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--wiki-text)' }}>洞察分析</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--wiki-text2)' }}>智能体运行数据与知识质量深度分析</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
            {reports.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveReport(r.id)}
                className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: activeReport === r.id ? 'var(--wiki-text)' : 'transparent',
                  color: activeReport === r.id ? 'var(--wiki-bg)' : 'var(--wiki-text2)',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={handleRefresh} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)', border: '1px solid var(--wiki-border)' }}>
            <RefreshCwIcon size={12} />
            <span>刷新</span>
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium" style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}>
            <DownloadIcon size={12} />
            <span>导出报告</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* Section 1: KPI Cards Row (4 cards) */}
      {/* ═══════════════════════════════════════════ */}
      <div className="mb-6 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3Icon size={14} style={{ color: 'var(--wiki-text)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--wiki-text)' }}>核心指标</h3>
        </div>

        {kpiLoading && (
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 p-4 rounded-lg" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
                <Skeleton style={{ width: 60, height: 12, marginBottom: 8 }} />
                <Skeleton style={{ width: 80, height: 24, marginBottom: 4 }} />
                <Skeleton style={{ width: 100, height: 12 }} />
              </div>
            ))}
          </div>
        )}

        {kpiError && !kpiLoading && (
          <div className="p-4 rounded-lg flex items-center justify-between" style={{ background: 'var(--wiki-danger-bg)', border: '1px solid var(--wiki-danger)' }}>
            <div className="flex items-center gap-2">
              <AlertTriangleIcon size={14} style={{ color: 'var(--wiki-danger)' }} />
              <span className="text-xs" style={{ color: 'var(--wiki-danger)' }}>{kpiError}</span>
            </div>
            <button onClick={fetchKpis} className="text-xs font-medium px-3 py-1.5 rounded" style={{ background: 'var(--wiki-danger)', color: '#fff' }}>重试</button>
          </div>
        )}

        {!kpiLoading && !kpiError && (
          <div className="flex gap-4">
            {kpis.map((kpi) => {
              const Icon = iconMap[kpi.icon] || TrendingUpIcon;
              return (
                <div
                  key={kpi.label}
                  className="flex-1 p-4 rounded-lg"
                  style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: kpi.bg }}>
                      <Icon size={13} style={{ color: kpi.color }} />
                    </div>
                    <span className="text-xs" style={{ color: 'var(--wiki-text3)' }}>{kpi.label}</span>
                  </div>
                  <div className="text-xl font-bold mb-1" style={{ color: 'var(--wiki-text)' }}>{kpi.value}</div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: kpi.up ? '#10b981' : '#ef4444' }}>
                    {kpi.up ? <ArrowUpRightIcon size={12} /> : <ArrowDownRightIcon size={12} />}
                    <span>{kpi.change} 环比上月</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* Section 2: Charts Tab Area */}
      {/* ═══════════════════════════════════════════ */}
      <div className="mb-6 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUpIcon size={14} style={{ color: 'var(--wiki-text)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--wiki-text)' }}>数据趋势</h3>
          {/* Tab switcher */}
          <div className="flex items-center gap-1 ml-4 p-0.5 rounded-lg" style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)' }}>
            <button
              onClick={() => setActiveChartTab('area')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: activeChartTab === 'area' ? 'var(--wiki-text)' : 'transparent',
                color: activeChartTab === 'area' ? 'var(--wiki-bg)' : 'var(--wiki-text3)',
              }}
            >
              面积图
            </button>
            <button
              onClick={() => setActiveChartTab('bar')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: activeChartTab === 'bar' ? 'var(--wiki-text)' : 'transparent',
                color: activeChartTab === 'bar' ? 'var(--wiki-bg)' : 'var(--wiki-text3)',
              }}
            >
              柱状图
            </button>
          </div>
        </div>

        {chartLoading && (
          <div className="p-6 rounded-lg" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
            <Skeleton style={{ width: '100%', height: 220 }} />
          </div>
        )}

        {chartError && !chartLoading && (
          <div className="p-4 rounded-lg flex items-center justify-between" style={{ background: 'var(--wiki-danger-bg)', border: '1px solid var(--wiki-danger)' }}>
            <div className="flex items-center gap-2">
              <AlertTriangleIcon size={14} style={{ color: 'var(--wiki-danger)' }} />
              <span className="text-xs" style={{ color: 'var(--wiki-danger)' }}>{chartError}</span>
            </div>
            <button onClick={fetchCharts} className="text-xs font-medium px-3 py-1.5 rounded" style={{ background: 'var(--wiki-danger)', color: '#fff' }}>重试</button>
          </div>
        )}

        {!chartLoading && !chartError && (
          <div className="p-6 rounded-lg" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
            <div className="transition-opacity duration-300 ease-in-out" key={activeChartTab}>
            {activeChartTab === 'area' ? (
              /* Area Chart */
              <Suspense fallback={<ChartFallback height={220} />}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--wiki-text)' }}>活动趋势</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--wiki-text3)' }}>近7个月数据概览</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--wiki-text3)' }}>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: 'var(--wiki-info)' }} /><span>需求</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: '#06b6d4' }} /><span>知识</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: 'var(--wiki-success)' }} /><span>洞察分析</span></div>
                  </div>
                </div>
                <LazyResponsiveContainer width="100%" height={220}>
                  <LazyAreaChart data={areaData}>
                    <defs>
                      <linearGradient id="ga1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--wiki-info)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--wiki-info)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ga2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ga3" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--wiki-success)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--wiki-success)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <LazyXAxis dataKey="name" tick={{ fill: 'var(--wiki-text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <LazyYAxis tick={{ fill: 'var(--wiki-text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <LazyTooltip contentStyle={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)', color: 'var(--wiki-text)', fontSize: 12 }} />
                    <LazyArea type="monotone" dataKey="需求" stroke="var(--wiki-info)" strokeWidth={2} fill="url(#ga1)" activeDot={{ r: 5, fill: 'var(--wiki-info)' }} />
                    <LazyArea type="monotone" dataKey="知识" stroke="#06b6d4" strokeWidth={2} fill="url(#ga2)" activeDot={{ r: 5, fill: '#06b6d4' }} />
                    <LazyArea type="monotone" dataKey="洞察分析" stroke="var(--wiki-success)" strokeWidth={2} fill="url(#ga3)" activeDot={{ r: 5, fill: 'var(--wiki-success)' }} />
                  </LazyAreaChart>
                </LazyResponsiveContainer>
              </Suspense>
            ) : (
              /* Bar Chart */
              <Suspense fallback={<ChartFallback height={220} />}>
                <div className="mb-4">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--wiki-text)' }}>需求分类分布</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--wiki-text3)' }}>按业务分类统计</p>
                </div>
                <LazyResponsiveContainer width="100%" height={220}>
                  <LazyBarChart data={barData}>
                    <LazyXAxis dataKey="name" tick={{ fill: 'var(--wiki-text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <LazyYAxis tick={{ fill: 'var(--wiki-text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <LazyTooltip contentStyle={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)', color: 'var(--wiki-text)', fontSize: 12 }} />
                    <LazyBar dataKey="value" fill="var(--wiki-info)" radius={[4, 4, 0, 0]} activeBar={{ fill: 'var(--wiki-info)' }} />
                  </LazyBarChart>
                </LazyResponsiveContainer>
              </Suspense>
            )}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* Section 3: Full-width rows — AI Insights + Activity Timeline */}
      {/* ═══════════════════════════════════════════ */}
      <div className="flex flex-col gap-6">
        {/* ── Row 1: AI Insights (full-width) ── */}
        <div className="w-full">
          <div className="flex items-center gap-2 mb-3">
            <SparklesIcon size={14} style={{ color: 'var(--wiki-text)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--wiki-text)' }}>AI 智能洞察</h3>
            {aiInsights.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text)' }}>
                {aiInsights.length} 条洞察
              </span>
            )}
          </div>

          {/* Generate button — when no insights */}
          {!aiLoaded && !aiLoading && !aiError && (
            <div className="p-8 rounded-lg text-center" style={{ background: 'var(--wiki-surface)', border: '1px dashed var(--wiki-border)' }}>
              <BrainCircuitIcon size={32} className="mx-auto mb-3" style={{ color: 'var(--wiki-text3)' }} />
              <p className="text-sm mb-4" style={{ color: 'var(--wiki-text2)' }}>暂无 AI 洞察分析</p>
              <button
                onClick={generateAIInsights}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}
              >
                <SparklesIcon size={14} />
                <span>生成 AI 分析</span>
              </button>
            </div>
          )}

          {/* Loading */}
          {aiLoading && (
            <div className="p-8 rounded-lg text-center" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
              <Loader2Icon size={32} className="mx-auto mb-3 animate-spin" style={{ color: 'var(--wiki-text2)' }} />
              <p className="text-sm" style={{ color: 'var(--wiki-text3)' }}>AI 正在分析项目数据...</p>
            </div>
          )}

          {/* Error */}
          {aiError && (
            <div className="p-4 rounded-lg mb-4 flex items-center justify-between" style={{ background: 'var(--wiki-danger-bg)', border: '1px solid var(--wiki-danger)' }}>
              <div className="flex items-center gap-2">
                <AlertTriangleIcon size={14} style={{ color: 'var(--wiki-danger)' }} />
                <span className="text-xs" style={{ color: 'var(--wiki-danger)' }}>{aiError}</span>
              </div>
              <button
                onClick={generateAIInsights}
                className="text-xs font-medium px-3 py-1.5 rounded"
                style={{ background: 'var(--wiki-danger)', color: '#fff' }}
              >
                重试
              </button>
            </div>
          )}

          {/* Insight cards */}
          {aiInsights.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {aiInsights.map((insight, i) => {
                const Icon = iconMap[insight.icon] || TrendingUpIcon;
                return (
                  <div
                    key={insight.title || i}
                    className="p-4 rounded-lg transition-all duration-200 hover:border-[var(--wiki-info)]/30 cursor-pointer"
                    style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: insight.bg }}>
                        <Icon size={16} style={{ color: insight.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <div className="text-sm font-semibold truncate" style={{ color: 'var(--wiki-text)' }}>{insight.title}</div>
                          <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `${insight.color}15`, color: insight.color }}>
                            <TrendingUpIcon size={9} />
                            <span>置信度 {insight.score}%</span>
                          </div>
                        </div>
                        <div className="text-xs leading-relaxed" style={{ color: 'var(--wiki-text2)' }}>{insight.desc}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Re-generate card */}
              <div
                className="p-4 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:border-[var(--wiki-info)]/30"
                style={{ background: 'var(--wiki-surface)', border: '1px dashed var(--wiki-border)' }}
                onClick={generateAIInsights}
              >
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--wiki-text3)' }}>
                  {aiLoading ? (
                    <Loader2Icon size={14} className="animate-spin" />
                  ) : (
                    <RefreshCwIcon size={14} />
                  )}
                  <span>{aiLoading ? '分析中...' : '重新生成分析'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(Insights);

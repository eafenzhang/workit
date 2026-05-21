import { useEffect, useState } from 'react';
import { LightbulbIcon, TrendingUpIcon, BarChart2Icon, PieChartIcon, RefreshCwIcon, DownloadIcon, SparklesIcon, ArrowUpRightIcon, ArrowDownRightIcon, BrainCircuitIcon, ZapIcon, AlertTriangleIcon } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

const PIE_COLORS = [`#6366f1`, `#8b5cf6`, `#06b6d4`, `#10b981`, `#f59e0b`];

const iconMap: Record<string, typeof TrendingUpIcon> = {
  TrendingUpIcon, AlertTriangleIcon, BrainCircuitIcon, ZapIcon,
};

export default function Insights() {
  const [kpis, setKpis] = useState<any[]>([]);
  const [charts, setCharts] = useState<any>({});
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [activeReport, setActiveReport] = useState('performance');

  useEffect(() => {
    Promise.all([
      fetch('/api/insights/kpis').then(r => r.json()),
      fetch('/api/insights/charts').then(r => r.json()),
      fetch('/api/insights/ai-insights').then(r => r.json()),
    ]).then(([kpisData, chartsData, insightsData]) => {
      setKpis(kpisData);
      setCharts(chartsData);
      setAiInsights(insightsData);
    });
  }, []);

  const reports = [
    { id: 'performance', label: `性能分析` },
    { id: 'usage', label: `使用分析` },
    { id: 'quality', label: `质量评估` },
  ];

  return (
    <div data-cmp="Insights" className="flex flex-col h-full overflow-y-auto overflow-x-hidden scrollbar-thin p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-wiki-text">洞察分析</h1>
          <p className="text-wiki-text2 text-sm mt-1">智能体运行数据与知识质量深度分析</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
            {reports.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveReport(r.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: activeReport === r.id ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                  color: activeReport === r.id ? '#fff' : 'var(--wiki-text2)',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--wiki-text2)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <RefreshCwIcon size={12} />
            <span>刷新</span>
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <DownloadIcon size={12} />
            <span>导出报告</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="flex gap-4 mb-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="flex-1 p-4 rounded-2xl" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
            <div className="text-xs text-wiki-text3 mb-2">{kpi.label}</div>
            <div className="text-xl font-bold text-wiki-text mb-1">{kpi.value}</div>
            <div className="flex items-center gap-1 text-xs" style={{ color: kpi.up ? '#10b981' : '#ef4444' }}>
              {kpi.up ? <ArrowUpRightIcon size={12} /> : <ArrowDownRightIcon size={12} />}
              <span>{kpi.change} 环比上月</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="flex gap-4 mb-4">
        {/* Bar Chart - 需求分类 */}
        <div className="flex-1 p-6 rounded-2xl" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-wiki-text">需求分类分布</h3>
              <p className="text-xs text-wiki-text3 mt-0.5">按业务分类统计</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={charts.barData || []}>
              <XAxis dataKey="name" tick={{ fill: 'var(--wiki-text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--wiki-text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--wiki-surface2)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: 'var(--wiki-text)', fontSize: 12 }} />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="w-[280px] p-6 rounded-2xl" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
          <div className="mb-2">
            <h3 className="text-sm font-semibold text-wiki-text">文档类型分布</h3>
            <p className="text-xs text-wiki-text3 mt-0.5">按文档类型统计</p>
          </div>
          <div className="flex items-center gap-2">
            <ResponsiveContainer width={120} height={140}>
              <PieChart>
                <Pie data={charts.pieData || []} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" stroke="none">
                  {(charts.pieData || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--wiki-surface2)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: 'var(--wiki-text)', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2">
              {(charts.pieData || []).map((item: any, i: number) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i] }} />
                  <span className="text-xs text-wiki-text3">{item.name}</span>
                  <span className="text-xs font-medium text-wiki-text ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <SparklesIcon size={14} style={{ color: '#6366f1' }} />
          <h3 className="text-sm font-semibold text-wiki-text">AI 智能洞察</h3>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>{aiInsights.length} 条新洞察</span>
        </div>
        <div className="flex gap-3 flex-wrap">
          {aiInsights.map((insight, i) => {
            const Icon = iconMap[insight.icon] || TrendingUpIcon;
            return (
              <div
                key={i}
                className="p-5 rounded-2xl transition-all duration-200 hover:border-indigo-500/30 cursor-pointer"
                style={{ width: 'calc(50% - 6px)', background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: insight.bg }}>
                    <Icon size={16} style={{ color: insight.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-semibold text-wiki-text">{insight.title}</div>
                      <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: `${insight.color}15`, color: insight.color }}>
                        <TrendingUpIcon size={9} />
                        <span>置信度 {insight.score}%</span>
                      </div>
                    </div>
                    <div className="text-xs text-wiki-text2 leading-relaxed">{insight.desc}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

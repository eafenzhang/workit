import { useEffect, useState } from 'react';
import { SparklesIcon, DatabaseIcon, LightbulbIcon, TrendingUpIcon, ClockIcon, CheckCircleIcon, AlertCircleIcon, ZapIcon, ArrowUpRightIcon, ActivityIcon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface StatCard {
  label: string;
  value: string;
  change: string;
  icon: string;
  color: string;
  bg: string;
}

interface Activity {
  icon: string;
  color: string;
  text: string;
  time: string;
}

interface AreaData {
  name: string;
  需求: number;
  知识: number;
  洞察: number;
}

interface BarData {
  name: string;
  value: number;
}

const iconMap: Record<string, typeof SparklesIcon> = {
  SparklesIcon, DatabaseIcon, LightbulbIcon, ZapIcon,
  CheckCircleIcon, ActivityIcon, ClockIcon, AlertCircleIcon, TrendingUpIcon,
};

export default function Dashboard() {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [areaData, setAreaData] = useState<AreaData[]>([]);
  const [barData, setBarData] = useState<BarData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard/stats').then(r => r.json()),
      fetch('/api/dashboard/activities').then(r => r.json()),
      fetch('/api/dashboard/charts').then(r => r.json()),
    ]).then(([statsData, activitiesData, chartsData]) => {
      setStats(statsData);
      setActivities(activitiesData);
      setAreaData(chartsData.areaData);
      setBarData(chartsData.barData);
      setLoading(false);
    });
  }, []);

  return (
    <div data-cmp="Dashboard" className="flex flex-col gap-6 p-8 h-full overflow-y-auto overflow-x-hidden scrollbar-thin">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-wiki-text">智能体工作台</h1>
          <p className="text-wiki-text2 text-sm mt-1">欢迎回来，今日数据一切正常</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)' }}>
          <ClockIcon size={14} style={{ color: 'var(--wiki-text2)' }} />
          <span style={{ color: 'var(--wiki-text2)' }}>最后同步：刚刚</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="flex gap-4">
        {stats.map((card) => {
          const Icon = iconMap[card.icon] || SparklesIcon;
          return (
            <div
              key={card.label}
              className="flex-1 p-5 rounded-2xl relative overflow-hidden"
              style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.bg }}>
                  <Icon size={18} style={{ color: card.color }} />
                </div>
                <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text)' }}>
                  <ArrowUpRightIcon size={10} />
                  <span>{card.change}</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-wiki-text mb-1">{card.value}</div>
              <div className="text-xs text-wiki-text3">{card.label}</div>
              <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-10" style={{ background: card.color }} />
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="flex gap-4">
        {/* Area Chart */}
        <div className="flex-1 p-6 rounded-2xl" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-wiki-text">活动趋势</h3>
              <p className="text-xs text-wiki-text3 mt-0.5">近7个月数据概览</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-wiki-text3">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: '#6366f1' }} /><span>需求</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: '#06b6d4' }} /><span>知识</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} /><span>洞察</span></div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fill: 'var(--wiki-text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--wiki-text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)', borderRadius: 8, color: 'var(--wiki-text)', fontSize: 12 }} />
              <Area type="monotone" dataKey="需求" stroke="#6366f1" strokeWidth={2} fill="url(#g1)" />
              <Area type="monotone" dataKey="知识" stroke="#06b6d4" strokeWidth={2} fill="url(#g2)" />
              <Area type="monotone" dataKey="洞察" stroke="#10b981" strokeWidth={2} fill="url(#g3)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="w-[280px] p-6 rounded-2xl" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-wiki-text">需求分类</h3>
            <p className="text-xs text-wiki-text3 mt-0.5">按业务领域分布</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} layout="vertical">
              <XAxis type="number" tick={{ fill: 'var(--wiki-text3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: 'var(--wiki-text2)', fontSize: 12 }} axisLine={false} tickLine={false} width={36} />
              <Tooltip contentStyle={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)', borderRadius: 8, color: 'var(--wiki-text)', fontSize: 12 }} />
              <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="p-6 rounded-2xl" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-wiki-text">最近动态</h3>
          <button className="text-xs" style={{ color: 'var(--wiki-text2)' }}>查看全部</button>
        </div>
        <div className="flex flex-col gap-1">
          {activities.map((activity, i) => {
            const Icon = iconMap[activity.icon] || SparklesIcon;
            return (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-wiki-surface2 transition-colors">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${activity.color}18` }}>
                  <Icon size={13} style={{ color: activity.color }} />
                </div>
                <span className="text-sm text-wiki-text2 flex-1">{activity.text}</span>
                <span className="text-xs text-wiki-text3">{activity.time}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

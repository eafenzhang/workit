import { useState, useEffect } from 'react';
import { ClockIcon, PlusIcon, TrashIcon, RefreshCwIcon, PlayIcon, PowerIcon, PowerOffIcon } from 'lucide-react';
import { toast } from 'sonner';
import { aioncore } from '../lib/aioncore';
import type { CronJobResponse } from '../lib/api-types';

export default function Workflows() {
  const [jobs, setJobs] = useState<CronJobResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', schedule: '', type: 'interval' as 'interval' | 'cron' | 'once', action: '' });

  useEffect(() => { loadJobs(); }, []);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await aioncore.cron.listJobs();
      setJobs(Array.isArray(data) ? data : []);
    } catch { setJobs([]); }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.schedule.trim()) { toast.error('请填写名称和调度表达式'); return; }
    try {
      await aioncore.cron.createJob({ name: form.name, schedule: form.schedule, type: form.type as any, action: form.action || 'echo "task"' });
      toast.success('任务已创建');
      setShowAdd(false);
      loadJobs();
    } catch { toast.error('创建失败'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return;
    try { await aioncore.cron.deleteJob(id); toast.success('已删除'); loadJobs(); }
    catch { toast.error('删除失败'); }
  };

  const handleRunNow = async (id: string) => {
    try { await aioncore.cron.runNow(id); toast.success('任务已触发'); }
    catch { toast.error('执行失败'); }
  };

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto scrollbar-thin">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-wiki-text">定时任务</h1>
          <p className="text-sm text-wiki-text2 mt-1">管理自动化调度任务</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium"
          style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}>
          <PlusIcon size={14} />新建任务
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><RefreshCwIcon size={24} className="animate-spin" style={{ color: 'var(--wiki-text3)' }} /></div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-lg" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
          <ClockIcon size={40} style={{ color: 'var(--wiki-text3)' }} />
          <p className="mt-3 text-sm" style={{ color: 'var(--wiki-text2)' }}>暂无定时任务</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--wiki-text3)' }}>创建任务后 AI 可以按计划自动执行</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map(job => (
            <div key={job.id} className="rounded-lg p-4" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)' }}>
                  <ClockIcon size={20} style={{ color: '#f59e0b' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-wiki-text">{job.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)' }}>{job.type}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)' }}>{job.schedule}</span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--wiki-text3)' }}>
                    {job.lastRunAt && `上次执行: ${new Date(job.lastRunAt).toLocaleString('zh-CN')}`}
                    {job.lastRunStatus && ` · 状态: ${job.lastRunStatus}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleRunNow(job.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded text-xs"
                    style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                    <PlayIcon size={12} />执行
                  </button>
                  <button onClick={() => handleDelete(job.id)}
                    className="p-1.5 rounded hover:bg-red-50 transition-colors">
                    <TrashIcon size={14} style={{ color: 'var(--wiki-text3)' }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--wiki-overlay-heavy)' }}>
          <div className="w-[480px] rounded-lg p-6" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
            <h2 className="text-sm font-semibold text-wiki-text mb-4">新建定时任务</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-wiki-text3 mb-1 block">名称</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)', color: 'var(--wiki-text)' }} />
              </div>
              <div>
                <label className="text-xs text-wiki-text3 mb-1 block">调度类型</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value as any})}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)', color: 'var(--wiki-text)' }}>
                  <option value="interval">固定间隔</option>
                  <option value="cron">Cron 表达式</option>
                  <option value="once">一次性</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-wiki-text3 mb-1 block">调度表达式</label>
                <input value={form.schedule} onChange={e => setForm({...form, schedule: e.target.value})}
                  placeholder={form.type === 'cron' ? '*/5 * * * *' : form.type === 'once' ? '2026-12-31T23:59:00' : '30'}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)', color: 'var(--wiki-text)' }} />
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-xs" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)' }}>取消</button>
              <button onClick={handleCreate} className="px-4 py-2 rounded-lg text-xs font-medium" style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}>创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

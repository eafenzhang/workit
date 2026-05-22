import { useEffect, useState, useRef, useCallback } from 'react';
import { PlusIcon, SearchIcon, FilterIcon, SparklesIcon, CheckCircleIcon, ClockIcon, AlertCircleIcon, TagIcon, UserIcon, CalendarIcon, XIcon, EditIcon, TrashIcon, ImageIcon, ChevronDownIcon, ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Requirement {
  id: number;
  title: string;
  desc: string;
  category: string;
  module: string;
  priority: string;
  status: string;
  assignee: string;
  creator: string;
  dueDate: string;
  tags: string[];
  images: string[];
  aiSummary: string;
  aiTags: string[];
  imageDescriptions: string[];
  workflowHandler: string;
  workflowHistory: { from: string; to: string; handler: string; time: string }[];
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<string, { color: string; bg: string; icon: typeof CheckCircleIcon }> = {
  '待评审': { color: `#f59e0b`, bg: `rgba(245,158,11,0.12)`, icon: AlertCircleIcon },
  '设计中': { color: `#6366f1`, bg: `rgba(99,102,241,0.12)`, icon: ClockIcon },
  '实现中': { color: `#06b6d4`, bg: `rgba(6,182,212,0.12)`, icon: ClockIcon },
  '测试中': { color: `#8b5cf6`, bg: `rgba(139,92,246,0.12)`, icon: ClockIcon },
  '已完成': { color: `#10b981`, bg: `rgba(16,185,129,0.12)`, icon: CheckCircleIcon },
};

const priorityConfig: Record<string, { color: string; bg: string }> = {
  '高': { color: `#ef4444`, bg: `rgba(239,68,68,0.12)` },
  '中': { color: `#f59e0b`, bg: `rgba(245,158,11,0.12)` },
  '低': { color: `#10b981`, bg: `rgba(16,185,129,0.12)` },
};

const modules = ['系统后台', '机构后台', '品牌门店', '收银终端', '用户端', '开放平台'];
const priorities = ['高', '中', '低'];
const statuses = ['全部', '待评审', '设计中', '实现中', '测试中', '已完成'];

export default function Requirements() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('全部');
  const [filterPriority, setFilterPriority] = useState('全部');
  const [filterCategory, setFilterCategory] = useState('全部');
  const [filterAssignee, setFilterAssignee] = useState('全部');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingReq, setEditingReq] = useState<Requirement | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [form, setForm] = useState({
    desc: '', module: '用户端', priority: '中',
  });
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [detailWidth, setDetailWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, width: 0 });
  const detailWidthRef = useRef(0);

  useEffect(() => { detailWidthRef.current = detailWidth; }, [detailWidth]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, width: detailWidthRef.current };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const delta = dragStartRef.current.x - e.clientX;
      const newWidth = Math.max(400, Math.min(800, dragStartRef.current.width + delta));
      setDetailWidth(newWidth);
    };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    fetchRequirements();
  }, [search, filterStatus, filterPriority, filterCategory, filterAssignee, dateFrom, dateTo]);

  const fetchRequirements = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterStatus !== '全部') params.set('status', filterStatus);
    if (filterPriority !== '全部') params.set('priority', filterPriority);
    if (filterCategory !== '全部') params.set('category', filterCategory);
    if (filterAssignee !== '全部') params.set('assignee', filterAssignee);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    fetch(`/api/requirements?${params}`)
      .then(r => r.json())
      .then(data => setRequirements(data));
  };

  const handleCreate = () => {
    if (!form.desc.trim()) { toast.error('请输入需求描述'); return; }
    const title = form.desc.substring(0, 30) || '新建需求';
    fetch('/api/requirements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, desc: form.desc, module: form.module, priority: form.priority, images }),
    }).then(r => r.json()).then((data) => {
      setShowForm(false);
      resetForm();
      fetchRequirements();
      toast.success('需求创建成功，正在分析...');
      if (data.id) {
        fetch(`/api/requirements/${data.id}/analyze`, { method: 'POST' })
          .then(r => r.json())
          .then(result => {
            if (result.error) toast.error(result.error);
            else { fetchRequirements(); toast.success('AI 分析完成'); }
          })
          .catch(() => toast.error('AI 分析失败'));
      }
    });
  };

  const handleUpdate = () => {
    if (!editingReq) return;
    fetch(`/api/requirements/${editingReq.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editingReq.title, desc: form.desc, module: form.module, priority: form.priority, images }),
    }).then(r => r.json()).then(() => {
      setEditingReq(null);
      resetForm();
      fetchRequirements();
      toast.success('需求更新成功');
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm('确定删除？')) return;
    fetch(`/api/requirements/${id}`, { method: 'DELETE' })
      .then(() => { setSelectedId(null); fetchRequirements(); toast.success('已删除'); });
  };

  const resetForm = () => {
    setForm({ desc: '', module: '用户端', priority: '中' });
    setImages([]);
  };

  const openEdit = (req: Requirement) => {
    setEditingReq(req);
    setForm({ desc: req.desc, module: req.module || '用户端', priority: req.priority });
    setImages(req.images || []);
    setShowForm(true);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch('/api/requirements/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      setImages(prev => [...prev, data.url]);
      toast.success('图片上传成功');
    } catch {
      toast.error('图片上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(f => uploadImage(f));
    }
  };

  const removeImage = (url: string) => {
    setImages(prev => prev.filter(u => u !== url));
  };

  const handleAnalyze = async (req: Requirement) => {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/requirements/${req.id}/analyze`, { method: 'POST' });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      setRequirements(prev => prev.map(r => r.id === req.id ? {
        ...r, aiSummary: data.aiSummary, aiTags: data.aiTags, imageDescriptions: data.imageDescriptions
      } : r));
      toast.success('AI 分析完成');
    } catch { toast.error('AI 分析失败'); }
    finally { setAnalyzing(false); }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
  };

  const selectedReq = requirements.find(r => r.id === selectedId) || null;

  return (
    <div data-cmp="Requirements" className="flex h-full overflow-hidden">
      {/* Main List */}
      <div className="flex flex-col flex-1 p-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-wiki-text">需求采集</h1>
            <p className="text-wiki-text2 text-sm mt-1">管理和跟踪所有智能体需求条目</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90"
            style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}
          >
            <PlusIcon size={16} />
            <span>新建需求</span>
          </button>
        </div>

        {/* Search & Filter Row */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1 px-4 py-2.5 rounded-xl" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
            <SearchIcon size={15} style={{ color: 'var(--wiki-text3)' }} />
            <input className="bg-transparent flex-1 text-sm outline-none text-wiki-text placeholder:text-wiki-text3" placeholder="搜索..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button onClick={() => setShowFilter(!showFilter)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm" style={{ background: `var(--wiki-surface)`, border: `1px solid var(--wiki-border)`, color: `var(--wiki-text2)` }}>
            <FilterIcon size={14} />
            <span>筛选</span>
            <ChevronDownIcon size={12} style={{ transform: showFilter ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilter && (
          <div className="mb-4 p-4 rounded-xl" style={{ background: `var(--wiki-surface)`, border: `1px solid var(--wiki-border)` }}>
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-wiki-text3">模块</label>
                <select className="px-3 py-2 rounded-lg text-sm text-wiki-text outline-none" style={{ background: `var(--wiki-surface2)`, border: `1px solid var(--wiki-border)` }}
                  value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="全部">全部</option>
                  {modules.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-wiki-text3">优先级</label>
                <select className="px-3 py-2 rounded-lg text-sm text-wiki-text outline-none" style={{ background: `var(--wiki-surface2)`, border: `1px solid var(--wiki-border)` }}
                  value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                  <option value="全部">全部</option>
                  {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-wiki-text3">负责人</label>
                <input className="px-3 py-2 rounded-lg text-sm text-wiki-text outline-none w-28" style={{ background: `var(--wiki-surface2)`, border: `1px solid var(--wiki-border)` }}
                  placeholder="搜索..." value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-wiki-text3">创建人</label>
                <input className="px-3 py-2 rounded-lg text-sm text-wiki-text outline-none w-28" style={{ background: `var(--wiki-surface2)`, border: `1px solid var(--wiki-border)` }}
                  placeholder="搜索..." />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-wiki-text3">开始日期</label>
                <input type="date" className="px-3 py-2 rounded-lg text-sm text-wiki-text outline-none" style={{ background: `var(--wiki-surface2)`, border: `1px solid var(--wiki-border)` }}
                  value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-wiki-text3">截止日期</label>
                <input type="date" className="px-3 py-2 rounded-lg text-sm text-wiki-text outline-none" style={{ background: `var(--wiki-surface2)`, border: `1px solid var(--wiki-border)` }}
                  value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div className="flex items-end">
                <button onClick={() => { setFilterCategory('全部'); setFilterPriority('全部'); setFilterAssignee('全部'); setDateFrom(''); setDateTo(''); }}
                  className="px-3 py-2 rounded-lg text-xs" style={{ color: `var(--wiki-text2)` }}>
                  重置筛选
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Row - clickable */}
        <div className="flex gap-3 mb-4">
          {[
            { label: `全部`, count: requirements.length, color: `var(--wiki-text)`, status: `全部` },
            { label: `待评审`, count: requirements.filter(r => r.status === '待评审').length, color: `#f59e0b`, status: `待评审` },
            { label: `设计中`, count: requirements.filter(r => r.status === '设计中').length, color: `var(--wiki-text)`, status: `设计中` },
            { label: `实现中`, count: requirements.filter(r => r.status === '实现中').length, color: `var(--wiki-text)`, status: `实现中` },
            { label: `测试中`, count: requirements.filter(r => r.status === '测试中').length, color: `var(--wiki-text)`, status: `测试中` },
            { label: `已完成`, count: requirements.filter(r => r.status === '已完成').length, color: `#10b981`, status: `已完成` },
          ].map((stat) => {
            const isActive = filterStatus === stat.status;
            return (
              <div key={stat.label} onClick={() => setFilterStatus(stat.status)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all"
                style={{
                  background: isActive ? `var(--wiki-surface2)` : `var(--wiki-surface)`,
                  border: isActive ? `1px solid var(--wiki-border)` : `1px solid transparent`,
                }}>
                <div className="w-2 h-2 rounded-full" style={{ background: stat.color }} />
                <span className="text-xs text-wiki-text3">{stat.label}</span>
                <span className="text-xs font-bold text-wiki-text">{stat.count}</span>
              </div>
            );
          })}
        </div>

        {/* List */}
        <div className="flex flex-col gap-3 overflow-y-auto scrollbar-thin flex-1">
          {requirements.map((req) => {
            const statusCfg = statusConfig[req.status] || statusConfig['待评审'];
            const priorityCfg = priorityConfig[req.priority] || priorityConfig['中'];
            const StatusIcon = statusCfg.icon;
            const isSelected = selectedId === req.id;
            return (
              <div key={req.id}
                onClick={() => setSelectedId(isSelected ? null : req.id)}
                className="p-5 rounded-2xl cursor-pointer transition-all duration-200"
                style={{
                  background: isSelected ? `var(--wiki-surface2)` : 'var(--wiki-surface)',
                  border: isSelected ? `1px solid var(--wiki-border)` : `1px solid var(--wiki-border)`,
                }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `var(--wiki-surface2)` }}>
                      <SparklesIcon size={14} style={{ color: `var(--wiki-text)` }} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-wiki-text mb-0.5">{req.aiSummary || req.title}</div>
                      {req.aiSummary && <div className="text-xs text-wiki-text3 line-clamp-1">{req.title}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: priorityCfg.bg, color: priorityCfg.color }}>{req.priority}优先级</span>
                    <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: statusCfg.bg, color: statusCfg.color }}>
                      <StatusIcon size={10} />{req.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-wiki-text3"><UserIcon size={11} /><span>{req.creator}</span></div>
                    <div className="flex items-center gap-1.5 text-xs text-wiki-text3"><CalendarIcon size={11} /><span>{formatDate(req.createdAt)}</span></div>
                    <div className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-md" style={{ background: `var(--wiki-surface2)`, color: `var(--wiki-text2)` }}>{req.module}</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {req.aiTags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-md" style={{ background: `var(--wiki-surface2)`, color: `var(--wiki-text)` }}>{tag}</span>
                    ))}
                  </div>
                </div>
                {req.images?.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {req.images.map((img, i) => (
                      <img key={i} src={img} className="w-12 h-12 rounded object-cover" style={{ border: `1px solid var(--wiki-border)` }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedReq && !editingReq && (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ borderLeft: '1px solid var(--wiki-border)', background: 'var(--wiki-surface)' }}>
          {/* Header */}
          <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--wiki-border)' }}>
            <div className="flex-1">
              <div className="text-base font-bold text-wiki-text">{selectedReq.title}</div>
              <div className="flex flex-wrap gap-2 mt-1.5">
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text)' }}>{selectedReq.module}</span>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: statusConfig[selectedReq.status]?.bg, color: statusConfig[selectedReq.status]?.color }}>{selectedReq.status}</span>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: priorityConfig[selectedReq.priority]?.bg, color: priorityConfig[selectedReq.priority]?.color }}>{selectedReq.priority}</span>
                <span className="text-xs text-wiki-text3 ml-2">{selectedReq.category}</span>
              </div>
            </div>
            <button onClick={() => openEdit(selectedReq)} className="px-3 py-1.5 rounded-lg text-sm" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)' }}><EditIcon size={13} className="inline" /> 编辑</button>
            <button onClick={() => setSelectedId(null)} className="p-1.5 rounded-lg hover:bg-wiki-surface2"><XIcon size={14} style={{ color: 'var(--wiki-text3)' }} /></button>
          </div>

          {/* AI Analysis */}
          {selectedReq.aiSummary || selectedReq.aiTags.length > 0 || selectedReq.imageDescriptions.length > 0 ? (
            <div className="mx-6 mt-4 p-4 rounded-xl border" style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)' }}>
              <div className="flex items-center gap-2 mb-3">
                <SparklesIcon size={14} style={{ color: 'var(--wiki-text)' }} />
                <span className="text-xs font-bold" style={{ color: 'var(--wiki-text)' }}>AI 分析结果</span>
              </div>
              {selectedReq.aiSummary && <div className="text-sm leading-relaxed mb-3" style={{ color: 'var(--wiki-text)' }}>{selectedReq.aiSummary}</div>}
              {selectedReq.imageDescriptions.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {selectedReq.imageDescriptions.map((desc, i) => (<div key={i} className="text-xs text-wiki-text2">· {desc}</div>))}
                </div>
              )}
              {selectedReq.aiTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedReq.aiTags.map((tag) => (<span key={tag} className="text-xs px-2 py-0.5 rounded-lg" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text)' }}>{tag}</span>))}
                </div>
              )}
            </div>
          ) : (
            <div className="mx-6 mt-4">
              <button onClick={() => handleAnalyze(selectedReq)} disabled={analyzing} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: analyzing ? 'var(--wiki-surface2)' : 'var(--wiki-text)', color: analyzing ? 'var(--wiki-text2)' : 'var(--wiki-bg)' }}>
                <SparklesIcon size={13} /><span>{analyzing ? '分析中...' : 'AI 分析'}</span>
              </button>
            </div>
          )}

          {/* Workflow */}
          <div className="mx-6 mt-4 p-4 rounded-xl" style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)' }}>
            <div className="text-xs text-wiki-text3 mb-3">需求流转</div>
            <div className="flex items-center mb-4">
              {['待评审', '设计中', '实现中', '测试中', '已完成'].map((step, i) => {
                const statusOrder = ['待评审', '设计中', '实现中', '测试中', '已完成'];
                const currentIdx = statusOrder.indexOf(selectedReq.status);
                const isDone = i < currentIdx;
                const isCurrent = i === currentIdx;
                return (
                  <div key={step} className="flex items-center" style={{ flex: i < 4 ? 1 : 'none' }}>
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: isDone ? '#10b981' : isCurrent ? 'var(--wiki-text)' : 'var(--wiki-surface2)', color: isDone || isCurrent ? 'var(--wiki-bg)' : 'var(--wiki-text3)' }}>
                        {isDone ? '✓' : i + 1}
                      </div>
                      <div className="text-xs mt-1 text-center" style={{ color: isCurrent ? 'var(--wiki-text)' : 'var(--wiki-text3)', fontSize: '10px' }}>{step}</div>
                    </div>
                    {i < 4 && <div className="flex-1 h-0.5 mx-1" style={{ background: isDone ? '#10b981' : 'var(--wiki-border)' }} />}
                  </div>
                );
              })}
            </div>
            {selectedReq.status !== '已完成' && (
              <button onClick={() => { const statusOrder = ['待评审', '设计中', '实现中', '测试中', '已完成']; const nextIdx = statusOrder.indexOf(selectedReq.status) + 1; if (nextIdx < statusOrder.length) { fetch(`/api/requirements/${selectedReq.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: selectedReq.title, desc: selectedReq.desc, module: selectedReq.module, priority: selectedReq.priority, status: statusOrder[nextIdx], assignee: selectedReq.assignee, workflow_handler: selectedReq.assignee, images: selectedReq.images }) }).then(() => { fetchRequirements(); toast.success(`已推进到「${statusOrder[nextIdx]}」`); }); } }} className="w-full py-2 rounded-xl text-xs font-medium" style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}>
                推进到下一步
              </button>
            )}
            {selectedReq.workflowHistory?.length > 0 && (
              <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--wiki-border)' }}>
                <div className="text-xs text-wiki-text3 mb-2">流转记录</div>
                {selectedReq.workflowHistory.map((h, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text)' }}>{h.from}</span>
                      <span className="text-xs text-wiki-text3">→</span>
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--wiki-surface2)', color: '#10b981' }}>{h.to}</span>
                    </div>
                    <div className="text-xs text-wiki-text3">{h.time} {h.handler && `· ${h.handler}`}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            <div className="max-w-3xl mx-auto flex flex-col gap-5">
              {/* Description */}
              <div className="p-4 rounded-xl" style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)' }}>
                <div className="text-xs text-wiki-text3 mb-2">需求描述</div>
                <div className="text-sm text-wiki-text2 leading-relaxed whitespace-pre-wrap">{selectedReq.desc || '暂无描述'}</div>
                {selectedReq.images?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedReq.images.map((img, i) => (
                      <img key={i} src={img} className="rounded object-cover cursor-pointer" style={{ border: '1px solid var(--wiki-border)', width: '80px', height: '80px' }} onClick={() => window.open(img, '_blank')} />
                    ))}
                  </div>
                )}
              </div>

              {/* Fields */}
              <div className="flex flex-col gap-2">
                {[
                  { label: `负责人`, value: selectedReq.assignee },
                  { label: `创建人`, value: selectedReq.creator },
                  { label: `截止日期`, value: selectedReq.dueDate || '无' },
                  { label: `创建时间`, value: formatDate(selectedReq.createdAt) },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--wiki-border)' }}>
                    <span className="text-xs text-wiki-text3">{item.label}</span>
                    <span className="text-xs font-medium text-wiki-text">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Tags */}
              {selectedReq.tags?.length > 0 && (
                <div>
                  <div className="text-xs text-wiki-text3 mb-2">标签</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedReq.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2.5 py-1 rounded-lg" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)' }}>{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-2">
                {selectedReq.status !== '已完成' && (
                  <button onClick={() => { const statusOrder = ['待评审', '设计中', '实现中', '测试中', '已完成']; const nextIdx = statusOrder.indexOf(selectedReq.status) + 1; if (nextIdx < statusOrder.length) { fetch(`/api/requirements/${selectedReq.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: selectedReq.title, desc: selectedReq.desc, module: selectedReq.module, priority: selectedReq.priority, status: statusOrder[nextIdx], assignee: selectedReq.assignee, workflow_handler: selectedReq.assignee, images: selectedReq.images }) }).then(() => { fetchRequirements(); toast.success(`已推进到「${statusOrder[nextIdx]}」`); }); } }} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}>
                    <CheckCircleIcon size={13} /> 推进状态
                  </button>
                )}
                <button onClick={() => handleDelete(selectedReq.id)} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                  <TrashIcon size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full-panel Editor for New/Edit Requirement */}
      {showForm && (
        <div className="flex-1 flex flex-col" style={{ borderLeft: '1px solid var(--wiki-border)' }}>
          <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--wiki-border)', background: 'var(--wiki-surface)' }}>
            <div className="flex-1">
              <div className="text-base font-semibold text-wiki-text">{editingReq ? '编辑需求' : '新建需求'}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setShowForm(false); setEditingReq(null); resetForm(); }} className="px-4 py-2 rounded-xl text-sm" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)' }}>取消</button>
              <button onClick={editingReq ? handleUpdate : handleCreate} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}>
                {editingReq ? '保存修改' : '提交需求'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin" style={{ background: 'var(--wiki-bg)' }}>
            <div className="max-w-3xl mx-auto flex flex-col gap-5">
              {images.length > 0 && (
                <div className="p-4 rounded-xl" style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)' }}>
                  <div className="text-xs text-wiki-text3 mb-2">图片附件</div>
                  <div className="flex flex-wrap gap-2">
                    {images.map((img, i) => (
                      <div key={i} className="relative">
                        <img src={img} className="w-20 h-20 rounded object-cover" />
                        <button onClick={() => removeImage(img)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 rounded-xl" style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)' }}>
                <div className="text-xs text-wiki-text3 mb-2">需求描述</div>
                <textarea
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-wiki-text outline-none resize-none"
                  style={{ background: 'transparent', border: 'none' }}
                  rows={6}
                  placeholder="详细描述需求内容..."
                  value={form.desc}
                  onChange={e => setForm({ ...form, desc: e.target.value })}
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-wiki-text3 mb-2 block">模块</label>
                  <select className="w-full px-3 py-2.5 rounded-xl text-sm text-wiki-text outline-none" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }} value={form.module} onChange={e => setForm({ ...form, module: e.target.value })}>
                    {modules.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-wiki-text3 mb-2 block">优先级</label>
                  <select className="w-full px-3 py-2.5 rounded-xl text-sm text-wiki-text outline-none" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                    {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <input type="file" ref={fileInputRef} accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)', border: '1px solid var(--wiki-border)' }}>
                  <ImageIcon size={13} /> 添加图片附件
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
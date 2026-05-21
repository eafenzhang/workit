import { useState, useEffect, useRef } from 'react';
import { ClipboardIcon, XIcon, SparklesIcon, ClipboardPasteIcon } from 'lucide-react';
import { toast } from 'sonner';

interface CaptureData {
  text?: string;
  images: string[];
}

const modules = ['系统后台', '机构后台', '品牌门店', '收银终端', '用户端', '开放平台'];
const priorities = ['高', '中', '低'];

export default function QuickCapture() {
  const [captured, setCaptured] = useState<CaptureData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [desc, setDesc] = useState('');
  const [module, setModule] = useState('用户端');
  const [priority, setPriority] = useState('中');
  const [enabled, setEnabled] = useState(false);
  const lastPastedText = useRef<string>('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('quick_collect_enabled');
      setEnabled(saved === 'true');
    } catch {}
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>;
      setEnabled(customEvent.detail.enabled);
    };
    window.addEventListener('quick-collect-toggle', handler);
    return () => window.removeEventListener('quick-collect-toggle', handler);
  }, []);

  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text') || '';
      const items = e.clipboardData?.items;
      let hasImages = false;

      if (items) {
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            hasImages = true;
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = (ev) => {
                const base64 = ev.target?.result as string;
                setCaptured(prev => ({ text: prev?.text || text || '', images: [...(prev?.images || []), base64] }));
              };
              reader.readAsDataURL(file);
            }
          }
        }
      }

      if (text && text !== lastPastedText.current) {
        lastPastedText.current = text;
        setCaptured(prev => ({ ...prev, text, images: prev?.images || [] }));
        setShowModal(true);
        setDesc('');
      } else if (hasImages) {
        setShowModal(true);
        setDesc('');
      }
    };
    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, []);

  const handleFloatClick = async () => {
    try {
      const text = await navigator.clipboard.readText().catch(() => '');
      setCaptured({ text: text || '', images: [] });
      setShowModal(true);
      setDesc('');
    } catch {
      toast.error('无法读取剪贴板');
    }
  };

  const handleUploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        setCaptured(prev => prev ? { ...prev, images: [...prev.images, data.url] } : null);
        toast.success('图片已添加');
      }
    } catch {
      toast.error('图片上传失败');
    }
  };

  const removeImage = (idx: number) => {
    setCaptured(prev => prev ? { ...prev, images: prev.images.filter((_, i) => i !== idx) } : null);
  };

  const handleSubmit = async () => {
    const finalDesc = captured?.text ? (desc ? `${captured.text}\n${desc}` : captured.text) : desc;
    if (!finalDesc.trim()) {
      toast.error('请输入需求描述');
      return;
    }
    const title = finalDesc.substring(0, 30) || '新建需求';
    try {
      const res = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, desc: finalDesc, module, priority, images: captured?.images || [] }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('需求采集成功，正在分析...');
        setShowModal(false);
        setCaptured(null);
        setDesc('');
        if (data.id) {
          fetch(`/api/requirements/${data.id}/analyze`, { method: 'POST' })
            .then(r => r.json())
            .then(() => toast.success('AI 分析完成'))
            .catch(() => {});
        }
      }
    } catch {
      toast.error('采集失败');
    }
  };

  return (
    <>
      {enabled && (
      <button
        onClick={handleFloatClick}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-40 transition-all duration-200 hover:scale-110"
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}
        title="快速采集"
      >
        <ClipboardPasteIcon size={20} color="#fff" />
      </button>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-[520px] max-h-[85vh] overflow-y-auto p-6 rounded-2xl" style={{ background: 'var(--wiki-surface)', border: '1px solid rgba(99,102,241,0.3)' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  <SparklesIcon size={14} color="#fff" />
                </div>
                <span className="text-sm font-semibold text-wiki-text">快速采集</span>
              </div>
              <button onClick={() => { setShowModal(false); setCaptured(null); setDesc(''); }} className="p-1 rounded-lg hover:bg-wiki-surface2">
                <XIcon size={16} style={{ color: 'var(--wiki-text3)' }} />
              </button>
            </div>

            {captured?.text && (
              <div className="mb-4 p-4 rounded-xl max-h-40 overflow-y-auto" style={{ background: 'rgba(99,112,196,0.08)', border: '1px solid rgba(99,112,196,0.15)' }}>
                <div className="text-xs text-wiki-text3 mb-1">剪贴板文本</div>
                <div className="text-sm text-wiki-text leading-relaxed whitespace-pre-wrap">{captured.text}</div>
              </div>
            )}

            {captured?.images && captured.images.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-wiki-text3 mb-2">剪贴板图片</div>
                <div className="flex flex-wrap gap-2">
                  {captured.images.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img} className="w-16 h-16 rounded object-cover" style={{ border: '1px solid rgba(99,112,196,0.2)' }} />
                      <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="text-xs text-wiki-text3 mb-1.5 block">上传图片</label>
              <input type="file" accept="image/*" className="hidden" id="capture-image-input" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUploadImage(file); e.target.value = ''; }} />
              <button onClick={() => document.getElementById('capture-image-input')?.click()} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(99,112,196,0.1)', color: 'var(--wiki-text2)', border: '1px solid rgba(99,112,196,0.2)' }}>
                <ClipboardIcon size={12} /> 添加图片
              </button>
            </div>

            <div className="mb-4">
              <label className="text-xs text-wiki-text3 mb-1.5 block">补充描述</label>
              <textarea
                className="w-full px-3 py-2.5 rounded-xl text-sm text-wiki-text outline-none resize-none"
                style={{ background: 'rgba(99,112,196,0.1)', border: '1px solid rgba(99,112,196,0.2)' }}
                rows={3}
                placeholder="补充更多信息..."
                value={desc}
                onChange={e => setDesc(e.target.value)}
              />
            </div>

            <div className="flex gap-3 mb-5">
              <div className="flex-1">
                <label className="text-xs text-wiki-text3 mb-1.5 block">模块</label>
                <select
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-wiki-text outline-none"
                  style={{ background: 'rgba(99,112,196,0.1)', border: '1px solid rgba(99,112,196,0.2)' }}
                  value={module}
                  onChange={e => setModule(e.target.value)}
                >
                  {modules.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-wiki-text3 mb-1.5 block">优先级</label>
                <select
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-wiki-text outline-none"
                  style={{ background: 'rgba(99,112,196,0.1)', border: '1px solid rgba(99,112,196,0.2)' }}
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                >
                  {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowModal(false); setCaptured(null); setDesc(''); }}
                className="flex-1 py-2.5 rounded-xl text-sm"
                style={{ background: 'rgba(99,112,196,0.1)', color: 'var(--wiki-text2)' }}
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                提交需求
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
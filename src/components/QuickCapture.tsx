import { apiFetch } from '../api';
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
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    try {
      const saved = localStorage.getItem('quick_collect_enabled');
      setEnabled(saved === 'true');
    } catch {}
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>;
      setEnabled(customEvent.detail.enabled);
    };
    window.addEventListener('quick-collect-toggle', handler);
    return () => { window.removeEventListener('quick-collect-toggle', handler); mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const dt = e.clipboardData;
      if (!dt) return;

      // Safely read clipboard formats (some browsers throw on unsupported types)
      let text = '', html = '';
      try { text = dt.getData('text/plain') || ''; } catch {}
      try { html = dt.getData('text/html') || ''; } catch {}

      const items = dt.items;
      const imagePromises: Promise<string>[] = [];

      // 1. Raw image items (screenshots, file copies)
      if (items) {
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              imagePromises.push(new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = () => { if (mountedRef.current) resolve(reader.result as string); };
                reader.onerror = () => resolve('');
                reader.readAsDataURL(file);
              }));
            }
          }
        }
      }

      // 2. Image URLs from HTML (web page copies)
      if (html) {
        const imgRx = /<img[^>]+src\s*=\s*["']([^"']+?)["']/gi;
        let m;
        while ((m = imgRx.exec(html)) !== null) {
          const s = m[1];
          if (s && (s.startsWith('data:') || s.startsWith('http'))) {
            imagePromises.push(Promise.resolve(s));
          }
        }
      }

      if (!text && imagePromises.length === 0) return;

      Promise.all(imagePromises).then(resolved => {
        if (!mountedRef.current) return;
        setCaptured(prev => ({
          text: text || prev?.text || '',
          images: [...new Set([...(prev?.images || []), ...resolved.filter(Boolean)])],
        }));
        setShowModal(true);
        setDesc('');
      });
    };
    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, []);

  const handleFloatClick = async () => {
    try {
      const api = (window as any).electronAPI;
      let text = '';
      const images: string[] = [];

      // 1. Read images via Electron native clipboard (most reliable)
      if (api?.readClipboardImages) {
        try {
          const nativeImages = await api.readClipboardImages();
          if (Array.isArray(nativeImages)) {
            images.push(...nativeImages.filter(Boolean));
          }
        } catch {}
      }

      // 2. Read text via Electron native clipboard
      if (api?.readClipboardText) {
        try { text = await api.readClipboardText() || ''; } catch {}
      }

      // 3. Fallback: browser clipboard API for images (if native got nothing)
      if (images.length === 0 && navigator.clipboard.read) {
        try {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            for (const type of item.types) {
              if (type.startsWith('image/')) {
                const blob = await item.getType(type);
                const dataUrl = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as string);
                  reader.onerror = () => resolve('');
                  reader.readAsDataURL(blob);
                });
                if (dataUrl) images.push(dataUrl);
              }
            }
            if (!text && item.types.includes('text/plain')) {
              try {
                const blob = await item.getType('text/plain');
                text = await blob.text();
              } catch {}
            }
          }
        } catch {}
      }

      // 4. Fallback: browser readText
      if (!text && navigator.clipboard.readText) {
        try { text = await navigator.clipboard.readText() || ''; } catch {}
      }

      if (!text && images.length === 0) {
        toast.error('剪贴板为空或无法读取');
        return;
      }

      setCaptured({ text: text || '', images });
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
      const res = await apiFetch('/api/documents/upload', { method: 'POST', body: formData });
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

  const refreshMainList = () => {
    window.dispatchEvent(new CustomEvent('requirements-changed'));
    // Cross-window: notify main window via IPC (for standalone QC popup)
    (window as any).electronAPI?.notifyRequirementsChanged?.();
  };

  const handleSubmit = async () => {
    const hasImages = captured?.images && captured.images.length > 0;
    const finalDesc = captured?.text ? (desc ? `${captured.text}\n${desc}` : captured.text) : desc;
    if (!finalDesc.trim() && !hasImages) {
      toast.error('请输入需求描述或添加图片');
      return;
    }
    const title = finalDesc.substring(0, 30) || (hasImages ? '图片需求' : '新建需求');

    // Step 1: save
    let newId: number | null = null;
    try {
      const res = await apiFetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, desc: finalDesc, module, priority, images: captured?.images || [] }),
      });
      const result = res.data;
      console.log('[qc-submit] POST result:', JSON.stringify(result).substring(0, 200));
      const extractedId = result?.id;
      if (!extractedId) { toast.error('采集失败 (id=' + extractedId + ')'); return; }
      newId = extractedId;
    } catch (e) { console.error('[qc-submit] save error', e); toast.error('采集失败'); return; }

    // Step 2: UI cleanup (independent)
    try { setShowModal(false); setCaptured(null); setDesc(''); toast.success('需求采集成功'); refreshMainList(); } catch {}

    // Step 3: auto-analyze
    if (newId) {
      setTimeout(async () => {
        try {
          console.log('[qc-auto-analyze] start, newId=' + newId);
          const autoEnabled = (() => { try { return localStorage.getItem('ai_auto_analyze') !== 'false'; } catch { return true; } })();
          if (!autoEnabled) return;
          const modelsRes = await apiFetch('/api/models');
          const models = modelsRes.data;
          if (Array.isArray(models) && models.some((m: any) => m.enabled)) {
            toast.success('正在 AI 分析...');
            const aRes = await apiFetch(`/api/requirements/${newId}/analyze`, { method: 'POST' });
            const aData = aRes.data;
            if (aData.error) { toast.error(aData.error); return; }
            toast.success('AI 分析完成');
            refreshMainList();
          }
        } catch (e) { console.error('[qc-auto-analyze] error', e); }
      }, 800);
    }
  };

  const isStandalone = !!(window as any).electronAPI?.__isQCPopup;

  return (
    <>
      {!isStandalone && enabled && (
      <button
        onClick={handleFloatClick}
        className="fixed bottom-6 right-6 w-10 h-10 rounded-full flex items-center justify-center shadow-lg z-40 transition-all duration-200 hover:scale-110 opacity-80 hover:opacity-100"
        style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}
        title="快速采集"
      >
        <ClipboardPasteIcon size={20} style={{ color: 'var(--wiki-bg)' }} />
      </button>
      )}

      {(showModal || isStandalone) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: isStandalone ? 'transparent' : 'rgba(0,0,0,0.6)', backdropFilter: isStandalone ? 'none' : 'blur(4px)' }}>
          <div className="w-[672px] max-h-[85vh] overflow-y-auto p-5 rounded-lg" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "var(--wiki-text)", color: "var(--wiki-bg)" }}>
                  <SparklesIcon size={14} style={{ color: 'var(--wiki-bg)' }} />
                </div>
                <span className="text-sm font-semibold text-wiki-text">快速采集</span>
              </div>
              {!isStandalone && (
              <button onClick={() => { setShowModal(false); setCaptured(null); setDesc(''); }} className="p-1 rounded-md hover:bg-wiki-surface2">
                <XIcon size={16} style={{ color: 'var(--wiki-text3)' }} />
              </button>
              )}
            </div>

            {captured?.text && (
              <div className="mb-4 p-4 rounded-lg max-h-40 overflow-y-auto" style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)' }}>
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
                      <img src={img} className="w-16 h-16 rounded object-cover" style={{ border: '1px solid var(--wiki-border)' }} />
                      <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="text-xs text-wiki-text3 mb-1.5 block">上传图片</label>
              <input type="file" accept="image/*" className="hidden" id="capture-image-input" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUploadImage(file); e.target.value = ''; }} />
              <button onClick={() => document.getElementById('capture-image-input')?.click()} className="flex items-center gap-2 px-3 py-2 rounded-md text-xs" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)', border: '1px solid var(--wiki-border)' }}>
                <ClipboardIcon size={12} /> 添加图片
              </button>
            </div>

            <div className="mb-4">
              <label className="text-xs text-wiki-text3 mb-1.5 block">补充描述</label>
              <textarea
                className="w-full px-3 py-2 rounded-lg text-xs text-wiki-text outline-none resize-none"
                style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)' }}
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
                  className="w-full px-3 py-2 rounded-lg text-xs text-wiki-text outline-none"
                  style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)' }}
                  value={module}
                  onChange={e => setModule(e.target.value)}
                >
                  {modules.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-wiki-text3 mb-1.5 block">优先级</label>
                <select
                  className="w-full px-3 py-2 rounded-lg text-xs text-wiki-text outline-none"
                  style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)' }}
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                >
                  {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { if (isStandalone) (window as any).electronAPI?.closeQCForm?.(); else { setShowModal(false); setCaptured(null); setDesc(''); } }}
                className="flex-1 py-2 rounded-lg text-xs"
                style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)' }}
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-2 rounded-lg text-xs font-medium"
                style={{ background: "var(--wiki-text)", color: "var(--wiki-bg)" }}
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
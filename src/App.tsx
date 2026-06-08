import { MemoryRouter } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import Index from './pages/Index';
import { AuthProvider } from './context/AuthContext';
import { AgentOSProvider } from './context/AgentOSContext';
import { useState, useEffect, lazy, Suspense, useRef } from 'react';

const QuickCapture = lazy(() => import('./components/QuickCapture'));

const App = () => {
  const isQCPopup = !!window.electronAPI?.__isQCPopup;
  if (isQCPopup) return <Suspense fallback={null}><QuickCapture /></Suspense>;

  const [qcEnabled, setQcEnabled] = useState(false);
  const updateToastId = useRef<string | number | null>(null);

  useEffect(() => {
    try { setQcEnabled(localStorage.getItem('quick_collect_enabled') === 'true'); } catch {}
    const h = (e: Event) => setQcEnabled((e as CustomEvent<{enabled:boolean}>).detail.enabled);
    window.addEventListener('quick-collect-toggle', h);
    return () => window.removeEventListener('quick-collect-toggle', h);
  }, []);

  // Global update listener — background toast notifications
  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onUpdateEvent) return;
    const unsub = api.onUpdateEvent((type: string, data: any) => {
      const ver = data?.version || '';
      switch (type) {
        case 'available':
          updateToastId.current = toast('发现新版本', {
            description: `v${ver} 正在后台下载...`,
            duration: Infinity,
          });
          break;
        case 'progress': {
          const pct = data?.percent ?? data ?? 0;
          if (updateToastId.current && pct > 0 && pct < 100) {
            toast('正在下载更新', { id: updateToastId.current, description: `${pct}%`, duration: Infinity });
          }
          break;
        }
        case 'downloaded':
          if (updateToastId.current) toast.dismiss(updateToastId.current);
          toast('更新已就绪', {
            description: `v${ver} 已下载完成`,
            duration: 10000,
            action: { label: '安装并重启', onClick: () => api?.installUpdate() },
          });
          break;
        case 'error':
          if (updateToastId.current) toast.dismiss(updateToastId.current);
          toast.error('更新失败', { description: data?.message || '请稍后重试' });
          break;
      }
    });
    return () => unsub?.();
  }, []);

  // Global link interception: open external URLs in built-in browser tab
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a') || target.closest('button');
      if (!anchor) return;
      // Skip elements explicitly marked for external/system browser
      if (anchor.hasAttribute('data-bypass-interceptor')) return;
      const href = anchor.getAttribute('href') || (anchor as HTMLAnchorElement).href;
      if (href && /^https?:\/\//.test(href)) {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('open-browser-tab', { detail: { url: href } }));
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, []);

  return (
    <AuthProvider>
      <MemoryRouter>
        <AgentOSProvider>
          <Index />
        </AgentOSProvider>
        {qcEnabled && <Suspense fallback={null}><QuickCapture /></Suspense>}
        <Toaster position="top-right" />
      </MemoryRouter>
    </AuthProvider>
  );
};

export default App;
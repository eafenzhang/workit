import { apiFetch } from '../api';
import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { SunIcon, MoonIcon, MonitorIcon, PaletteIcon, InfoIcon, GlobeIcon, DownloadIcon, RefreshCwIcon, CheckIcon, ServerIcon, WifiIcon, WifiOffIcon, LinkIcon, UnplugIcon, LoaderIcon } from 'lucide-react';
import { toast } from 'sonner';
import { APP_ICON } from '../constants/icon';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const [quickCollect, setQuickCollect] = useState(() => {
    try { return localStorage.getItem('quick_collect_enabled') === 'true'; } catch { return false; }
  });
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error'>('idle');
  const [latestVersion, setLatestVersion] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [serverMode, setServerMode] = useState<'local' | 'remote'>('local');
  const [remoteUrl, setRemoteUrl] = useState('http://100.95.196.33:3001');
  const [backendStatus, setBackendStatus] = useState<'stopped' | 'starting' | 'running' | 'error'>('stopped');
  const [backendError, setBackendError] = useState('');

  const api = (window as any).electronAPI;
  const currentVersion = api?.getVersion?.() || '1.0.0';
  const isElectron = !!api;

  useEffect(() => {
    api?.onUpdateProgress?.((p: number) => { setDownloadProgress(p); if (p >= 100) setUpdateStatus('ready'); });
    api?.onUpdateReady?.(() => setUpdateStatus('ready'));
    // Check if backend is already running
    apiFetch('/api/health').then(r => r.json()).then(() => setBackendStatus('running')).catch(() => {});
  }, []);

  const startBackend = async () => {
    if (!api) { toast.error('仅在桌面应用中可用'); return; }
    setBackendStatus('starting');
    setBackendError('');
    const result = await api.startLocalBackend();
    if (result.success) {
      setBackendStatus('running');
      toast.success('后端已启动');
    } else {
      setBackendStatus('error');
      setBackendError(result.error || '启动失败');
    }
  };

  const stopBackend = async () => {
    if (!api) return;
    await api.stopLocalBackend();
    setBackendStatus('stopped');
  };

  const connectRemote = async () => {
    if (!api) { toast.error('仅在桌面应用中可用'); return; }
    setBackendStatus('starting');
    try {
      const res = await fetch(remoteUrl + '/api/health');
      if (!res.ok) throw new Error('无法连接');
      await api.connectServer(remoteUrl);
      setBackendStatus('running');
    } catch {
      setBackendStatus('error');
      setBackendError('无法连接到服务器');
    }
  };

  const disconnectServer = async () => {
    if (!api) return;
    await api.disconnectServer();
    setBackendStatus('stopped');
  };

  const checkForUpdate = async () => {
    if (!api) return;
    setUpdateStatus('checking');
    try {
      const result = await api.checkForUpdate();
      if (result?.available) { setLatestVersion(result.version); setUpdateStatus('available'); }
      else setUpdateStatus('idle');
    } catch { setUpdateStatus('error'); }
  };

  const downloadUpdate = async () => {
    if (!api) return;
    setUpdateStatus('downloading');
    setDownloadProgress(0);
    try { await api.downloadUpdate(); } catch { setUpdateStatus('error'); }
  };

  const installUpdate = () => { api?.installUpdate(); };

  const toggleQuickCollect = (enabled: boolean) => {
    setQuickCollect(enabled);
    localStorage.setItem('quick_collect_enabled', String(enabled));
    window.dispatchEvent(new CustomEvent('quick-collect-toggle', { detail: { enabled } }));
  };

  const appearanceOptions = [
    { id: 'light', label: '浅色', icon: SunIcon, desc: '明亮主题' },
    { id: 'dark', label: '深色', icon: MoonIcon, desc: '深色主题' },
    { id: 'system', label: '跟随系统', icon: MonitorIcon, desc: '自动跟随系统' },
  ] as const;

  return (
    <div data-cmp="Settings" className="h-full p-8 overflow-y-auto overflow-x-hidden scrollbar-thin">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-wiki-text mb-1">设置</h1>
        <p className="text-wiki-text2 text-sm mb-8">配置 Workit 的外观和行为</p>

        {/* Appearance Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <PaletteIcon size={18} style={{ color: 'var(--wiki-accent)' }} />
            <h2 className="text-base font-semibold text-wiki-text">外观</h2>
          </div>

          {/* Light/Dark/System */}
          <div className="rounded-xl p-5" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
            <div className="text-sm font-medium text-wiki-text mb-1">色彩模式</div>
            <div className="text-xs text-wiki-text3 mb-4">选择浅色或深色模式</div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {appearanceOptions.map((opt) => {
                const Icon = opt.icon;
                const isActive = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setTheme(opt.id)}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg transition-all relative"
                    style={{
                      background: isActive ? 'var(--wiki-surface2)' : 'transparent',
                      border: '1px solid var(--wiki-border)',
                    }}
                  >
                    <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ background: isActive ? 'var(--wiki-accent)' : 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)' }}>
                      <Icon size={18} style={{ color: isActive ? 'var(--wiki-bg)' : 'var(--wiki-text2)' }} />
                    </div>
                    <div className="text-sm font-medium" style={{ color: isActive ? 'var(--wiki-accent)' : 'var(--wiki-text2)' }}>{opt.label}</div>
                    <div className="text-xs" style={{ color: 'var(--wiki-text3)' }}>{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Quick Collect Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <GlobeIcon size={18} style={{ color: 'var(--wiki-accent)' }} />
            <h2 className="text-base font-semibold text-wiki-text">快速采集</h2>
          </div>

          <div className="rounded-xl p-5" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-wiki-text mb-1">采集浮窗</div>
                <div className="text-xs text-wiki-text3">开启后显示右下角采集按钮，点击可快速采集网页内容</div>
              </div>
              <button
                onClick={() => toggleQuickCollect(!quickCollect)}
                className="relative w-12 h-6 rounded-full transition-colors"
                style={{ background: quickCollect ? "var(--wiki-text)" : "var(--wiki-surface2)" }}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 rounded-full shadow transition-all"
                  style={{ left: quickCollect ? '26px' : '4px', transition: 'left 0.2s', background: quickCollect ? "var(--wiki-bg)" : "var(--wiki-text3)" }}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Server Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <ServerIcon size={18} style={{ color: 'var(--wiki-accent)' }} />
            <h2 className="text-base font-semibold text-wiki-text">服务器连接</h2>
          </div>

          <div className="rounded-xl p-5" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
            {/* Connection status */}
            <div className="flex items-center gap-3 mb-5 p-3 rounded-xl" style={{ background: 'var(--wiki-surface2)' }}>
              {backendStatus === 'running' ? (
                <WifiIcon size={18} style={{ color: '#10b981' }} />
              ) : backendStatus === 'starting' ? (
                <LoaderIcon size={18} className="animate-spin" style={{ color: 'var(--wiki-text3)' }} />
              ) : (
                <WifiOffIcon size={18} style={{ color: 'var(--wiki-text3)' }} />
              )}
              <div className="flex-1">
                <div className="text-sm font-medium text-wiki-text">
                  {backendStatus === 'running' ? '已连接' : backendStatus === 'starting' ? '连接中...' : '未连接'}
                </div>
                <div className="text-xs text-wiki-text3">
                  {backendStatus === 'running' ? (serverMode === 'local' ? '本地后端' : `远程: ${remoteUrl}`) : '数据存储在本地'}
                </div>
              </div>
              {backendStatus === 'error' && <div className="text-xs" style={{ color: '#ef4444' }}>{backendError}</div>}
            </div>

            {/* Mode selector */}
            <div className="flex gap-3 mb-4">
              <button onClick={() => { if (backendStatus === 'running') stopBackend(); setServerMode('local'); }}
                className="flex-1 flex flex-col items-center gap-2 px-4 py-3 rounded-xl transition-all text-sm"
                style={{ background: serverMode === 'local' ? 'var(--wiki-surface2)' : 'transparent', border: '1px solid var(--wiki-border)', color: serverMode === 'local' ? 'var(--wiki-text)' : 'var(--wiki-text2)' }}>
                <ServerIcon size={20} />
                <span className="font-medium">本地后端</span>
                <span className="text-xs text-wiki-text3">启动内置服务器</span>
              </button>
              <button onClick={() => setServerMode('remote')}
                className="flex-1 flex flex-col items-center gap-2 px-4 py-3 rounded-xl transition-all text-sm"
                style={{ background: serverMode === 'remote' ? 'var(--wiki-surface2)' : 'transparent', border: '1px solid var(--wiki-border)', color: serverMode === 'remote' ? 'var(--wiki-text)' : 'var(--wiki-text2)' }}>
                <GlobeIcon size={20} />
                <span className="font-medium">远程服务器</span>
                <span className="text-xs text-wiki-text3">连接外部服务器</span>
              </button>
            </div>

            {/* Local mode */}
            {serverMode === 'local' && (
              <div>
                {backendStatus === 'stopped' && (
                  <button onClick={startBackend} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}>
                    <ServerIcon size={14} /> 启动本地后端
                  </button>
                )}
                {backendStatus === 'starting' && (
                  <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text3)' }}>
                    <LoaderIcon size={14} className="animate-spin" /> 启动中...
                  </div>
                )}
                {backendStatus === 'running' && (
                  <div className="flex gap-2">
                    <button onClick={stopBackend} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)' }}>
                      停止后端
                    </button>
                    <button onClick={() => api?.connectServer('http://localhost:3001')} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}>
                      <LinkIcon size={13} className="inline" /> 连接
                    </button>
                  </div>
                )}
                {backendStatus === 'error' && (
                  <button onClick={startBackend} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                    <RefreshCwIcon size={14} /> 重试
                  </button>
                )}
              </div>
            )}

            {/* Remote mode */}
            {serverMode === 'remote' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)' }}>
                  <GlobeIcon size={14} style={{ color: 'var(--wiki-text3)' }} />
                  <input value={remoteUrl} onChange={e => setRemoteUrl(e.target.value)}
                    placeholder="http://100.95.196.33:3001"
                    className="flex-1 bg-transparent text-sm text-wiki-text outline-none" />
                </div>
                {backendStatus === 'stopped' && (
                  <button onClick={connectRemote} className="w-full py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}>
                    <LinkIcon size={13} className="inline" /> 连接远程服务器
                  </button>
                )}
                {backendStatus === 'running' && (
                  <button onClick={disconnectServer} className="w-full py-2.5 rounded-xl text-sm" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)' }}>
                    <UnplugIcon size={13} className="inline" /> 断开连接
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* About Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <InfoIcon size={18} style={{ color: 'var(--wiki-accent)' }} />
            <h2 className="text-base font-semibold text-wiki-text">关于</h2>
          </div>

          <div className="rounded-xl p-5" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden">
                <img src={APP_ICON} alt="Workit" className="w-12 h-12 object-contain" />
              </div>
              <div className="flex-1">
                <div className="text-lg font-bold text-wiki-text">Workit</div>
                <div className="text-sm text-wiki-text3">智能体工作台</div>
                <div className="text-xs text-wiki-text3 mt-1">版本 {currentVersion}</div>
              </div>
              {updateStatus === 'idle' && (
                <button onClick={checkForUpdate} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)' }}>
                  <RefreshCwIcon size={12} /> 检查更新
                </button>
              )}
              {updateStatus === 'checking' && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text3)' }}>
                  <RefreshCwIcon size={12} className="animate-spin" /> 检查中...
                </div>
              )}
              {updateStatus === 'available' && (
                <button onClick={downloadUpdate} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}>
                  <DownloadIcon size={14} /> 更新 v{latestVersion}
                </button>
              )}
              {updateStatus === 'downloading' && (
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 rounded-full bg-wiki-surface2 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${downloadProgress}%`, background: 'var(--wiki-text)' }} />
                  </div>
                  <span className="text-xs text-wiki-text3">{downloadProgress}%</span>
                </div>
              )}
              {updateStatus === 'ready' && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                    <CheckIcon size={12} /> 已下载
                  </div>
                  <button onClick={installUpdate} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}>
                    立即安装
                  </button>
                </div>
              )}
              {updateStatus === 'error' && (
                <button onClick={checkForUpdate} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                  <RefreshCwIcon size={12} /> 重试
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
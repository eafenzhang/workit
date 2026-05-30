import { apiFetch, API } from '../api';
import { useEffect, useState } from 'react';
import { ServerIcon, PlusIcon, TrashIcon, XIcon, KeyIcon, CheckCircleIcon, CircleIcon, PlugIcon, DownloadIcon, UploadIcon, EditIcon } from 'lucide-react';
import { toast } from 'sonner';

// ── Toast message constants ──
const TOAST = {
  mcpDisabled: 'MCP已禁用',
  mcpEnabled: 'MCP已启用',
  deleted: '已删除',
  tokenSaved: 'Token已保存',
  configExported: '配置已导出',
  invalidConfig: '无效的配置文件',
  imported: (n: number) => `已导入 ${n} 个服务`,
  fixFormErrors: '请修正表单中的错误',
  mcpAdded: 'MCP服务器已添加',
  addFailed: '添加失败',
  saveFailed: '保存失败',
  dataError: (msg: string) => msg || '添加失败',
} as const;
interface MCPServer {
  id: number;
  name: string;
  type: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  enabled: boolean;
  config: Record<string, any>;
  createdAt: string;
}

export default function MCP() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  // P1-01: editingId for edit mode — non-null means editing existing server
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showToken, setShowToken] = useState<number | null>(null);
  const [tokenInput, setTokenInput] = useState('');

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = () => {
    apiFetch(API.mcp)
      .then(r => r.json())
      .then(data => setServers(data))
      .catch(() => {}); // 后端未就绪时静默处理
  };

  const toggleServer = (server: MCPServer) => {
    apiFetch(API.mcpById(server.id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...server, enabled: !server.enabled }),
    }).then(() => {
      fetchServers();
      toast.success(server.enabled ? TOAST.mcpDisabled : TOAST.mcpEnabled);
    });
  };

  const deleteServer = (id: number) => {
    if (!confirm('确定删除？')) return;
    apiFetch(API.mcpById(id), { method: 'DELETE' })
      .then(() => { fetchServers(); toast.success(TOAST.deleted); });
  };

  const saveToken = (serverId: number) => {
    if (!tokenInput.trim()) return;
    apiFetch(API.mcpToken(serverId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenInput }),
    }).then(() => {
      toast.success(TOAST.tokenSaved);
      setShowToken(null);
      setTokenInput('');
    });
  };

  // Import/Export MCP servers configuration
  const handleExport = () => {
    const data = JSON.stringify(servers.map(({ id, ...s }) => s), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `mcp-servers-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(TOAST.configExported);
  };
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      let configs: any[];
      try {
        configs = JSON.parse(text);
      } catch {
        return toast.error(TOAST.invalidConfig);
      }
      if (!Array.isArray(configs)) return toast.error(TOAST.invalidConfig);
      let imported = 0;
      for (const cfg of configs) {
        await apiFetch(API.mcpServers, { method: 'POST', body: JSON.stringify(cfg) });
        imported++;
      }
      toast.success(TOAST.imported(imported));
      fetchServers();
    };
    input.click();
  };

  return (
    <div className="flex flex-col gap-6 p-8 h-full overflow-y-auto scrollbar-thin">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-wiki-text">MCP工具</h1>
          <p className="text-sm text-wiki-text2 mt-1">管理和配置 MCP 服务器</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleImport} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)', border: '1px solid var(--wiki-border)' }}>
            <UploadIcon size={14} />导入
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)', border: '1px solid var(--wiki-border)' }}>
            <DownloadIcon size={14} />导出
          </button>
          <button onClick={() => { setEditingId(null); setShowAdd(true); setErrors({}); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium"
            style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}>
            <PlusIcon size={16} />添加服务
          </button>
        </div>
      </div>

      {servers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 rounded-lg" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
          <ServerIcon size={48} style={{ color: 'var(--wiki-text3)' }} />
          <p className="mt-4 text-wiki-text2 text-sm">暂无 MCP 服务</p>
          <p className="mt-1 text-wiki-text3 text-xs">点击「添加服务」开始配置</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {servers.map((server) => (
          <div key={server.id} className="rounded-lg p-6" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: server.enabled ? 'var(--wiki-surface2)' : 'var(--wiki-surface)' }}>
                {server.enabled ? <CheckCircleIcon size={24} style={{ color: 'var(--wiki-success)' }} /> : <PlugIcon size={24} style={{ color: 'var(--wiki-text3)' }} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-wiki-text">{server.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text)' }}>{server.type}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-wiki-text3">
                  <span>{server.command} {server.args.join(' ')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {server.type === 'tapd' && (
                  <button
                    onClick={() => setShowToken(showToken === server.id ? null : server.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs"
                    style={{ background: 'var(--wiki-surface2)', color: server.config.token ? 'var(--wiki-success)' : 'var(--wiki-text2)', border: '1px solid var(--wiki-border)' }}
                  >
                    <KeyIcon size={12} />
                    {server.config.token ? 'Token 已配置' : '设置 Token'}
                  </button>
                )}
                <button
                  onClick={() => toggleServer(server)}
                  className="px-4 py-2 rounded-lg text-xs font-medium"
                  style={{ background: server.enabled ? 'var(--wiki-danger-bg)' : 'var(--wiki-surface2)', color: server.enabled ? 'var(--wiki-danger)' : 'var(--wiki-success)' }}
                >
                  {server.enabled ? '禁用' : '启用'}
                </button>
                {/* P1-01: Edit button to enter edit mode */}
                <button onClick={() => { setEditingId(server.id); setShowAdd(true); }} className="p-2 rounded-lg hover:bg-wiki-surface2 transition-colors">
                  <EditIcon size={16} style={{ color: 'var(--wiki-text3)' }} />
                </button>
                <button onClick={() => deleteServer(server.id)} className="p-2 rounded-lg hover:bg-wiki-surface2 transition-colors">
                  <TrashIcon size={16} style={{ color: 'var(--wiki-text3)' }} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Token Input Modal */}
      {showToken !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--wiki-overlay-heavy)' }}>
          <div className="w-[480px] rounded-lg p-6" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <KeyIcon size={18} style={{ color: 'var(--wiki-text)' }} />
                <h2 className="text-lg font-semibold text-wiki-text">设置 TAPD Token</h2>
              </div>
              <button onClick={() => { setShowToken(null); setTokenInput(''); }} className="p-1 rounded-lg hover:bg-wiki-surface2">
                <XIcon size={18} style={{ color: 'var(--wiki-text3)' }} />
              </button>
            </div>
            <p className="text-sm text-wiki-text3 mb-4">输入您的 TAPD 个人令牌，用于认证 API 请求</p>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--wiki-text)' }}>Token</label>
              <input
                type="password"
                placeholder="输入 TAPD 个人令牌..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs"
                style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)', color: 'var(--wiki-text)' }}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowToken(null); setTokenInput(''); }}
                className="px-4 py-2 rounded-lg text-xs" style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)' }}>取消</button>
              <button onClick={() => saveToken(showToken!)}
                className="px-4 py-2 rounded-lg text-xs font-medium" style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}>保存 Token</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Server Modal */}
      {/* P1-01: Pass editingId and server data for edit mode */}
      {showAdd && <AddServerModal
        onClose={() => { setShowAdd(false); setEditingId(null); setErrors({}); }}
        onAdd={fetchServers}
        editingId={editingId}
        editData={editingId ? servers.find(s => s.id === editingId) || null : null}
      />}
    </div>
  );
}

function AddServerModal({ onClose, onAdd, editingId, editData }: {
  onClose: () => void;
  onAdd: () => void;
  editingId: number | null;
  editData: MCPServer | null;
}) {
  const isEdit = editingId !== null && editData !== null;
  const [name, setName] = useState(editData?.name || '');
  const [type, setType] = useState(editData?.type || 'custom');
  const [command, setCommand] = useState(editData?.command || 'node');
  const [args, setArgs] = useState(editData?.args?.join(' ') || '');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; command?: string }>({});

  const handleSubmit = async () => {
    const newErrors: { name?: string; command?: string } = {};
    if (!name.trim()) newErrors.name = '名称不能为空';
    if (!command.trim()) newErrors.command = '命令不能为空';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error(TOAST.fixFormErrors);
      return;
    }
    setSaving(true);
    // P1-01: Use PUT for edit, POST for create
    const url = isEdit ? API.mcpById(editingId) : API.mcp;
    const method = isEdit ? 'PUT' : 'POST';
    const body = isEdit
      ? { name, type, command, args: args ? args.split(' ').filter(Boolean) : [], env: editData!.env, config: editData!.config }
      : { name, type, command, args: args ? args.split(' ').filter(Boolean) : [], env: {}, config: {}, enabled: false };
    try {
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        onAdd();
        onClose();
        toast.success(isEdit ? 'MCP服务已更新' : TOAST.mcpAdded);
      } else {
        toast.error(TOAST.dataError(data.error));
      }
    } catch {
      toast.error(TOAST.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-[480px] rounded-lg p-6" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
        <div className="flex items-center justify-between mb-6">
          {/* P1-01: Dynamic title based on mode */}
          <h2 className="text-lg font-semibold text-wiki-text">{isEdit ? '编辑服务' : '添加 MCP 服务器'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-wiki-surface2">
            <XIcon size={18} style={{ color: 'var(--wiki-text3)' }} />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--wiki-text)' }}>名称</label>
          <input value={name} onChange={(e) => { setName(e.target.value); setErrors(prev => ({ ...prev, name: undefined })); }}
            placeholder="TAPD"
            className="w-full px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--wiki-surface2)', border: errors.name ? '1px solid var(--wiki-danger)' : '1px solid var(--wiki-border)', color: 'var(--wiki-text)' }} />
          {errors.name && <div className="text-xs mt-1" style={{ color: 'var(--wiki-danger)' }}>{errors.name}</div>}
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--wiki-text)' }}>类型</label>
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)', color: 'var(--wiki-text)' }}>
            <option value="tapd">TAPD</option>
            <option value="custom">自定义</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--wiki-text)' }}>命令</label>
          <input value={command} onChange={(e) => { setCommand(e.target.value); setErrors(prev => ({ ...prev, command: undefined })); }}
            placeholder="node"
            className="w-full px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--wiki-surface2)', border: errors.command ? '1px solid var(--wiki-danger)' : '1px solid var(--wiki-border)', color: 'var(--wiki-text)' }} />
          {errors.command && <div className="text-xs mt-1" style={{ color: 'var(--wiki-danger)' }}>{errors.command}</div>}
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--wiki-text)' }}>参数（用空格分隔）</label>
          <input value={args} onChange={(e) => setArgs(e.target.value)}
            placeholder="path/to/script.js"
            className="w-full px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)', color: 'var(--wiki-text)' }} />
        </div>

        <button onClick={handleSubmit} disabled={saving}
          className="w-full py-2 rounded-lg text-xs font-medium" style={{ background: saving ? 'var(--wiki-surface2)' : 'var(--wiki-text)', color: saving ? 'var(--wiki-text3)' : 'var(--wiki-bg)' }}>
          {saving ? '保存中...' : (isEdit ? '保存修改' : '添加')}
        </button>
      </div>
    </div>
  );
}

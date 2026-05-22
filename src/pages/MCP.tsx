import { useEffect, useState } from 'react';
import { ServerIcon, PlusIcon, TrashIcon, XIcon, KeyIcon, CheckCircleIcon, CircleIcon, PlugIcon } from 'lucide-react';
import { toast } from 'sonner';

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
  const [showToken, setShowToken] = useState<number | null>(null);
  const [tokenInput, setTokenInput] = useState('');

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = () => {
    fetch('/api/mcp')
      .then(r => r.json())
      .then(data => setServers(data))
      .catch(() => toast.error('获取MCP服务失败'));
  };

  const toggleServer = (server: MCPServer) => {
    fetch(`/api/mcp/${server.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...server, enabled: !server.enabled }),
    }).then(() => {
      fetchServers();
      toast.success(server.enabled ? 'MCP已禁用' : 'MCP已启用');
    });
  };

  const deleteServer = (id: number) => {
    if (!confirm('确定删除？')) return;
    fetch(`/api/mcp/${id}`, { method: 'DELETE' })
      .then(() => { fetchServers(); toast.success('已删除'); });
  };

  const saveToken = (serverId: number) => {
    if (!tokenInput.trim()) return;
    fetch(`/api/mcp/${serverId}/token`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenInput }),
    }).then(() => {
      toast.success('Token已保存');
      setShowToken(null);
      setTokenInput('');
    });
  };

  return (
    <div className="flex flex-col gap-6 p-8 h-full overflow-y-auto scrollbar-thin">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-wiki-text">MCP 工具</h1>
          <p className="text-wiki-text2 text-sm mt-1">管理和配置 MCP 服务器</p>
        </div>
      </div>

      {/* Server List */}
      <div className="rounded-2xl p-6" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--wiki-surface2)' }}>
              <PlugIcon size={16} style={{ color: 'var(--wiki-text)' }} />
            </div>
            <div>
              <div className="text-sm font-semibold text-wiki-text">已安装的 MCP 服务</div>
              <div className="text-xs text-wiki-text3">共 {servers.length} 个服务</div>
            </div>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}
          >
            <PlusIcon size={14} /> 添加服务
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {servers.map((server) => (
            <div key={server.id} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: server.enabled ? 'var(--wiki-surface2)' : 'var(--wiki-surface)' }}>
                {server.enabled ? <CheckCircleIcon size={20} style={{ color: '#10b981' }} /> : <CircleIcon size={20} style={{ color: 'var(--wiki-text3)' }} />}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-wiki-text">{server.name}</div>
                <div className="text-xs text-wiki-text3 mt-0.5">{server.command} {server.args.join(' ')}</div>
              </div>
              <div className="flex items-center gap-2">
                {server.type === 'tapd' && (
                  <button
                    onClick={() => setShowToken(showToken === server.id ? null : server.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                    style={{ background: server.config.token ? 'var(--wiki-surface2)' : 'var(--wiki-surface)', color: server.config.token ? '#10b981' : 'var(--wiki-text2)', border: `1px solid ${server.config.token ? 'var(--wiki-border)' : 'var(--wiki-border)'}` }}
                  >
                    <KeyIcon size={12} />
                    {server.config.token ? 'Token 已配置' : '设置 Token'}
                  </button>
                )}
                <button
                  onClick={() => toggleServer(server)}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: server.enabled ? 'rgba(239,68,68,0.1)' : 'var(--wiki-surface2)', color: server.enabled ? '#ef4444' : '#10b981' }}
                >
                  {server.enabled ? '禁用' : '启用'}
                </button>
                <button onClick={() => deleteServer(server.id)} className="p-1.5 rounded-lg hover:bg-wiki-surface transition-colors">
                  <TrashIcon size={14} style={{ color: 'var(--wiki-text3)' }} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {servers.length === 0 && (
          <div className="text-center py-8 text-wiki-text3 text-sm">暂无 MCP 服务，点击添加开始配置</div>
        )}
      </div>

      {/* Token Input Modal */}
      {showToken !== null && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-[420px] rounded-2xl p-6" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <KeyIcon size={18} style={{ color: 'var(--wiki-text)' }} />
                <h3 className="text-base font-semibold text-wiki-text">设置 TAPD Token</h3>
              </div>
              <button onClick={() => { setShowToken(null); setTokenInput(''); }}>
                <XIcon size={18} style={{ color: 'var(--wiki-text3)' }} />
              </button>
            </div>
            <p className="text-xs text-wiki-text3 mb-4">输入您的 TAPD 个人令牌，用于认证 API 请求</p>
            <input
              type="password"
              placeholder="输入 TAPD 个人令牌..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm text-wiki-text outline-none mb-4"
              style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)' }}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowToken(null); setTokenInput(''); }}
                className="px-4 py-2 rounded-xl text-sm"
                style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)' }}
              >
                取消
              </button>
              <button
                onClick={() => saveToken(showToken!)}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}
              >
                保存 Token
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Server Modal */}
      {showAdd && <AddServerModal onClose={() => setShowAdd(false)} onAdd={fetchServers} />}
    </div>
  );
}

function AddServerModal({ onClose, onAdd }: { onClose: () => void; onAdd: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('custom');
  const [command, setCommand] = useState('node');
  const [args, setArgs] = useState('');

  const handleSubmit = () => {
    if (!name || !command) return;
    fetch('/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        type,
        command,
        args: args ? args.split(' ').filter(Boolean) : [],
        env: {},
        config: {},
        enabled: false,
      }),
    }).then(() => {
      onAdd();
      onClose();
      toast.success('MCP服务器已添加');
    });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-[460px] rounded-2xl p-6" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PlusIcon size={18} style={{ color: 'var(--wiki-text)' }} />
            <h3 className="text-base font-semibold text-wiki-text">添加 MCP 服务器</h3>
          </div>
          <button onClick={onClose}>
            <XIcon size={18} style={{ color: 'var(--wiki-text3)' }} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-wiki-text3 mb-1.5 block">名称</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="TAPD"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-wiki-text outline-none"
                style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)' }}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-wiki-text3 mb-1.5 block">类型</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-wiki-text outline-none"
                style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)' }}
              >
                <option value="tapd">TAPD</option>
                <option value="custom">自定义</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-wiki-text3 mb-1.5 block">命令</label>
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="node"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-wiki-text outline-none"
              style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)' }}
            />
          </div>
          <div>
            <label className="text-xs text-wiki-text3 mb-1.5 block">参数（用空格分隔）</label>
            <input
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              placeholder="path/to/script.js"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-wiki-text outline-none"
              style={{ background: 'var(--wiki-surface2)', border: '1px solid var(--wiki-border)' }}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm"
            style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)' }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}
          >
            添加
          </button>
        </div>
      </div>
    </div>
  );
}
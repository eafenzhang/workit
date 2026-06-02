import { useState } from 'react';
import { UploadIcon, ServerIcon, TerminalIcon, ZapIcon, WrenchIcon } from 'lucide-react';
import { apiFetch, API } from '../api';
import { toast } from 'sonner';
import ImportModal from '../components/ImportModal';
import MCPTab from '../components/MCPTab';
import CliToolsTab from '../components/CliToolsTab';
import SkillsTab from '../components/SkillsTab';
import PluginsTab from '../components/PluginsTab';

const TABS = [
  { id: 'mcp', label: 'MCP工具', icon: ServerIcon, api: API.mcp, tmpl: [{ name: 'filesystem', type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', 'C:/temp'], env: {}, config: {}, description: '文件系统 MCP 服务', source: 'marketplace' }, { name: 'github', type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'], env: { GITHUB_PERSONAL_ACCESS_TOKEN: '' }, config: {}, description: 'GitHub MCP 服务 (npx, 需填入 Token)', source: 'marketplace' }], title: 'MCP 服务器' },
  { id: 'cli', label: 'CLI工具', icon: TerminalIcon, api: API.cliTools, tmpl: [{ name: 'gh', description: 'GitHub CLI', source: 'marketplace', config: {} }], title: 'CLI 工具' },
  { id: 'skills', label: 'Skill技能', icon: ZapIcon, api: API.skills, tmpl: [{ name: 'pdf-skill', description: 'PDF 文件处理', source: 'built-in', config: {} }], title: 'Skill 技能' },
  { id: 'plugins', label: 'Claude Code插件', icon: WrenchIcon, api: API.plugins, tmpl: [{ name: 'code-reviewer', description: 'AI 代码审查', source: 'marketplace', config: {} }], title: 'Claude Code 插件' },
] as const;

export default function AppEcosystem() {
  const [activeTab, setActiveTab] = useState<string>('mcp');
  const [showImport, setShowImport] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const current = TABS.find(t => t.id === activeTab);

  return (
    <div className="flex flex-col h-full">
      {/* Header row with import button */}
      <div className="flex items-center justify-between px-8 pt-8 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-wiki-text">应用生态</h1>
          <p className="text-sm text-wiki-text2 mt-1">管理 MCP 工具、Skill 技能和 Claude Code 插件</p>
        </div>
        <button onClick={() => setShowImport(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium"
          style={{ background: 'var(--wiki-text)', color: 'var(--wiki-bg)' }}>
          <UploadIcon size={14} />一键导入
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-8 pb-4">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-xs font-medium transition-colors"
              style={{
                background: active ? 'var(--wiki-surface)' : 'transparent',
                color: active ? 'var(--wiki-text)' : 'var(--wiki-text3)',
                borderBottom: active ? '2px solid var(--wiki-text)' : '2px solid transparent',
              }}>
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div style={{ display: activeTab === 'mcp' ? 'block' : 'none' }}>
          <MCPTab key={`mcp-${refreshKey}`} hideToolbar />
        </div>
        <div style={{ display: activeTab === 'cli' ? 'block' : 'none' }}>
          <CliToolsTab key={`cli-${refreshKey}`} hideToolbar />
        </div>
        <div style={{ display: activeTab === 'skills' ? 'block' : 'none' }}>
          <SkillsTab key={`skills-${refreshKey}`} hideToolbar />
        </div>
        <div style={{ display: activeTab === 'plugins' ? 'block' : 'none' }}>
          <PluginsTab key={`plugins-${refreshKey}`} hideToolbar />
        </div>
      </div>

      {/* Unified Import Modal */}
      {current && (
        <ImportModal open={showImport} onClose={() => setShowImport(false)}
          onImported={() => { setRefreshKey(k => k + 1); toast.success('导入完成'); }}
          apiPrefix={current.api} title={`导入 ${current.title}`} template={current.tmpl} />
      )}
    </div>
  );
}

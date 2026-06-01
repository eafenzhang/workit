import { useState } from 'react';
import { PackageIcon, ServerIcon, ZapIcon, WrenchIcon } from 'lucide-react';
import MCPTab from '../components/MCPTab';
import SkillsTab from '../components/SkillsTab';
import PluginsTab from '../components/PluginsTab';

const TABS = [
  { id: 'mcp', label: 'MCP工具', icon: ServerIcon },
  { id: 'skills', label: 'Skill技能', icon: ZapIcon },
  { id: 'plugins', label: 'Claude Code插件', icon: WrenchIcon },
] as const;

export default function AppEcosystem() {
  const [activeTab, setActiveTab] = useState<string>('mcp');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 pt-8 pb-4">
        <h1 className="text-xl font-semibold text-wiki-text">应用生态</h1>
        <p className="text-sm text-wiki-text2 mt-1">管理 MCP 工具、Skill 技能和 Claude Code 插件</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-8 pb-4" style={{ borderBottom: '1px solid var(--wiki-border)' }}>
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

      {/* Tab content — render all, hide inactive (preserves state) */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div style={{ display: activeTab === 'mcp' ? 'block' : 'none' }}>
          <MCPTab />
        </div>
        <div style={{ display: activeTab === 'skills' ? 'block' : 'none' }}>
          <SkillsTab />
        </div>
        <div style={{ display: activeTab === 'plugins' ? 'block' : 'none' }}>
          <PluginsTab />
        </div>
      </div>
    </div>
  );
}

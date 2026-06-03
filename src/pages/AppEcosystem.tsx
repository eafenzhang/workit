import { useState } from 'react';
import { ServerIcon, TerminalIcon, ZapIcon, WrenchIcon, PuzzleIcon } from 'lucide-react';
import MCPTab from '../components/MCPTab';
import CliToolsTab from '../components/CliToolsTab';
import SkillsTab from '../components/SkillsTab';
import PluginsTab from '../components/PluginsTab';

const TABS = [
  { id: 'mcp',     label: 'MCP工具',   icon: ServerIcon,   color: 'var(--wiki-accent)' },
  { id: 'cli',     label: 'CLI工具',   icon: TerminalIcon, color: 'var(--wiki-accent)' },
  { id: 'skills',  label: 'Skill技能', icon: ZapIcon,      color: 'var(--wiki-accent)' },
  { id: 'plugins', label: 'Claude插件', icon: WrenchIcon,   color: 'var(--wiki-accent)' },
] as const;

export default function AppEcosystem() {
  const [activeTab, setActiveTab] = useState<string>('mcp');
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar — improved styling */}
      <div className="w-52 flex flex-col flex-shrink-0" style={{ borderRight: '1px solid var(--wiki-border)', background: 'var(--wiki-surface)' }}>
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-2.5">
          <PuzzleIcon size={17} style={{ color: 'var(--wiki-accent)' }} />
          <span className="text-sm font-semibold text-wiki-text">应用生态</span>
        </div>
        <nav className="flex flex-col gap-0.5 px-2.5 pt-1 pb-4 flex-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors w-full"
                style={{
                  background: active ? 'var(--wiki-surface2)' : 'transparent',
                  color: active ? 'var(--wiki-text)' : 'var(--wiki-text2)',
                }}>
                <Icon
                  size={16}
                  style={{
                    color: active ? tab.color : 'var(--wiki-text3)',
                    flexShrink: 0,
                  }}
                />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main content — no extra header, each tab has its own title+toolbar */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div style={{ display: activeTab === 'mcp' ? 'block' : 'none' }}>
            <MCPTab key={`mcp-${refreshKey}`} hideToolbar={false} />
          </div>
          <div style={{ display: activeTab === 'cli' ? 'block' : 'none' }}>
            <CliToolsTab key={`cli-${refreshKey}`} hideToolbar={false} />
          </div>
          <div style={{ display: activeTab === 'skills' ? 'block' : 'none' }}>
            <SkillsTab key={`skills-${refreshKey}`} hideToolbar={false} />
          </div>
          <div style={{ display: activeTab === 'plugins' ? 'block' : 'none' }}>
            <PluginsTab key={`plugins-${refreshKey}`} hideToolbar={false} />
          </div>
        </div>
      </div>
    </div>
  );
}

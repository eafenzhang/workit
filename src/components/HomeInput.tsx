import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowUpIcon, PowerIcon } from 'lucide-react';
import { apiFetch } from '../api';

export interface HomeSendPayload {
  content: string;
  providerId: string;
  modelId: string;
  toolsEnabled: boolean;
}

interface HomeInputProps {
  onSend: (payload: HomeSendPayload) => void;
  disabled?: boolean;
  selectedProvider: string;
  selectedModel: string;
  toolsEnabled: boolean;
  onProviderChange: (pid: string, mid: string) => void;
  onToolsToggle: () => void;
}

function HomeInput({ onSend, disabled, selectedProvider, selectedModel, toolsEnabled, onToolsToggle }: HomeInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [hasTools, setHasTools] = useState(false);

  useEffect(() => {
    // Check if any tools/skills/plugins are configured
    Promise.all([
      apiFetch('/api/mcp_servers').then(r => r.data).catch(() => []),
      apiFetch('/api/cli_tools').then(r => r.data).catch(() => []),
      apiFetch('/api/skills').then(r => r.data).catch(() => []),
      apiFetch('/api/claude_code_plugins').then(r => r.data).catch(() => []),
    ]).then(([mcp, cli, skills, plugins]: any[]) => {
      setHasTools(
        (Array.isArray(mcp) && mcp.length > 0) ||
        (Array.isArray(cli) && cli.length > 0) ||
        (Array.isArray(skills) && skills.length > 0) ||
        (Array.isArray(plugins) && plugins.length > 0)
      );
    }).catch(() => {});
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend({ content: trimmed, providerId: selectedProvider, modelId: selectedModel, toolsEnabled });
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [value, disabled, toolsEnabled, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  return (
    <div data-cmp="HomeInput" className="w-full max-w-[692px] mx-auto">
      <div className="rounded-xl" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            const el = textareaRef.current;
            if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px'; }
          }}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          disabled={disabled}
          rows={1}
          className="w-full resize-none bg-transparent outline-none text-sm px-4 pt-3 pb-1 placeholder:text-wiki-text3 disabled:opacity-50"
          style={{ color: 'var(--wiki-text)', maxHeight: '160px' }}
        />
        <div className="flex items-center justify-between px-2 pb-2 gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onToolsToggle}
              title={toolsEnabled ? '工具/技能已开启' : '工具/技能已关闭'}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors"
              style={{
                background: toolsEnabled ? 'var(--wiki-text)' : 'var(--wiki-surface2)',
                color: toolsEnabled ? 'var(--wiki-bg)' : 'var(--wiki-text3)',
                display: hasTools ? 'flex' : 'none',
              }}
            >
              <PowerIcon size={11} />
              <span>工具</span>
            </button>
          </div>
          <button
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30"
            style={{ background: value.trim() ? 'var(--wiki-text)' : 'var(--wiki-surface2)', color: value.trim() ? 'var(--wiki-bg)' : 'var(--wiki-text3)' }}
          >
            <ArrowUpIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default HomeInput;

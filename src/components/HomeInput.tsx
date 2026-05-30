import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowUpIcon, PowerIcon } from 'lucide-react';
import { apiFetch, API } from '../api';

export interface HomeSendPayload {
  content: string;
  providerId: string;
  modelId: string;
  mcpEnabled: boolean;
}

interface HomeInputProps {
  onSend: (payload: HomeSendPayload) => void;
  disabled?: boolean;
  selectedProvider: string;
  selectedModel: string;
  mcpEnabled: boolean;
  onProviderChange: (pid: string, mid: string) => void;
  onMcpToggle: () => void;
}

interface ProviderEntry { id: string; name: string; models: { id: string; name: string }[] }

function HomeInput({ onSend, disabled, selectedProvider, selectedModel, mcpEnabled, onProviderChange, onMcpToggle }: HomeInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [providers, setProviders] = useState<ProviderEntry[]>([]);
  const [hasMcp, setHasMcp] = useState(false);

  useEffect(() => {
    apiFetch(API.models).then((list: any) => {
      const arr = Array.isArray(list) ? list : [];
      setProviders(arr.map((m: any) => ({ id: m.id, name: m.name, models: m.models || [] })));
    }).catch(() => {});
    apiFetch('/api/mcp_servers').then((list: any) => {
      setHasMcp(Array.isArray(list) && list.length > 0);
    }).catch(() => {});
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend({ content: trimmed, providerId: selectedProvider, modelId: selectedModel, mcpEnabled });
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [value, disabled, selectedProvider, selectedModel, mcpEnabled, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  return (
    <div data-cmp="HomeInput" className="w-full max-w-2xl mx-auto">
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--wiki-surface)', border: '1px solid var(--wiki-border)' }}>
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
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {/* Provider/Model selector — native select for reliability */}
            <select
              value={selectedProvider + '|' + selectedModel}
              onChange={(e) => {
                const [pid, mid] = e.target.value.split('|');
                onProviderChange(pid, mid);
              }}
              className="text-xs rounded-lg px-2 py-1 outline-none cursor-pointer min-w-0"
              style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)', border: '1px solid var(--wiki-border)', maxWidth: '180px' }}
            >
              {providers.map(p =>
                p.models.map(m => (
                  <option key={p.id + '|' + m.id} value={p.id + '|' + m.id}>
                    {p.name} / {m.name}
                  </option>
                ))
              )}
            </select>
            {/* MCP toggle */}
            <button
              onClick={onMcpToggle}
              title={mcpEnabled ? 'MCP 已开启' : 'MCP 已关闭'}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs flex-shrink-0 transition-colors"
              style={{
                background: mcpEnabled ? 'var(--wiki-text)' : 'var(--wiki-surface2)',
                color: mcpEnabled ? 'var(--wiki-bg)' : 'var(--wiki-text3)',
                display: hasMcp ? 'flex' : 'none',
              }}
            >
              <PowerIcon size={11} />
              <span>MCP</span>
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

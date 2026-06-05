import React from 'react';
import { StarIcon } from 'lucide-react';
import { type ProviderConfig, type ModelItem } from '../data/providers';

interface ProviderCardProps {
  provider: ProviderConfig;
  saved: ModelItem | undefined;
  onClick: () => void;
  onSetDefault?: () => void;
}

/** Renders a single provider card in the provider grid */
export default function ProviderCard({ provider, saved, onClick, onSetDefault }: ProviderCardProps) {
  const configured = !!saved;
  const isDefault = saved?.isDefault;
  const borderColor = isDefault ? 'var(--wiki-warning)' : 'var(--wiki-border)';
  const statusLabel = configured
    ? saved?.enabled
      ? `已配置 · ${provider.models.find((m) => m.id === saved?.modelId)?.name}`
      : '已配置 · 已禁用'
    : '点击配置';

  return (
    <div
      className="rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-colors"
      style={{ background: 'var(--wiki-surface)', border: `1px solid ${borderColor}` }}
      onClick={onClick}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--wiki-surface2)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--wiki-surface)'; }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-wiki-text">{provider.name}</span>
          {isDefault && <StarIcon size={12} style={{ color: 'var(--wiki-warning)' }} />}
          {configured && (
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: saved?.enabled ? 'var(--wiki-success)' : 'var(--wiki-text3)' }}
            />
          )}
        </div>
        <div className="text-xs text-wiki-text3 mt-0.5">{statusLabel}</div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {configured && !isDefault && onSetDefault && (
          <button
            onClick={(e) => { e.stopPropagation(); onSetDefault(); }}
            className="text-xs px-2 py-1 rounded"
            style={{ background: 'var(--wiki-surface2)', color: 'var(--wiki-text2)' }}
          >设为默认</button>
        )}
        {saved?.hasApiKey && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--wiki-success)" strokeWidth="2">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
        )}
      </div>
    </div>
  );
}

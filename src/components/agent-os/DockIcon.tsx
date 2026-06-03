import { useCallback, useState, useRef } from 'react';
import type { DockItem } from '../../types/agent-os';

interface DockIconProps {
  item: DockItem;
  isOpen: boolean;
  onClick: (type: string) => void;
}

/**
 * A single icon in the Dock bar.
 *
 * Features a hover scale animation, running indicator dot for open
 * windows, and a tooltip label on hover.
 */
export default function DockIcon({ item, isOpen, onClick }: DockIconProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = useCallback(() => {
    onClick(item.type);
  }, [onClick, item.type]);

  const Icon = item.icon;

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex flex-col items-center justify-end relative focus:outline-none"
      style={{
        width: '44px',
        height: '52px',
        border: 'none',
        background: 'transparent',
        padding: 0,
        cursor: 'default',
      }}
      aria-label={item.label}
      title={item.label}
    >
      {/* ── Icon ── */}
      <div
        className="flex items-center justify-center rounded-lg transition-transform duration-200"
        style={{
          width: '40px',
          height: '40px',
          transform: isHovered ? 'scale(1.2)' : 'scale(1)',
        }}
      >
        <Icon size={24} style={{ color: 'var(--wiki-text)' }} />
      </div>

      {/* ── Running indicator dot ── */}
      <div
        className="transition-opacity duration-200"
        style={{
          width: '4px',
          height: '4px',
          borderRadius: '50%',
          background: 'var(--wiki-text3)',
          marginTop: '2px',
          opacity: isOpen ? 1 : 0,
        }}
      />

      {/* ── Tooltip ── */}
      <span
        className="absolute left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap z-50 pointer-events-none transition-opacity duration-150"
        style={{
          bottom: '100%',
          marginBottom: '8px',
          background: 'var(--wiki-text)',
          color: 'var(--wiki-bg)',
          opacity: isHovered ? 1 : 0,
        }}
      >
        {item.label}
      </span>
    </button>
  );
}

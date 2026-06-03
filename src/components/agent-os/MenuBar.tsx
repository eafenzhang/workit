import { useState, useEffect } from 'react';

// ── Apple logo SVG ───────────────────────────────────────────────

const AppleLogo: React.FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ color: 'var(--wiki-text)' }}
    aria-hidden="true"
  >
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

// ── Menu items (display only) ────────────────────────────────────

const MENU_ITEMS = ['Workit', '文件', '编辑', '视图', '窗口', '帮助'];

// ── Component ────────────────────────────────────────────────────

/**
 * Top menu bar (28px) — macOS-style with Apple logo, menu items,
 * and a live clock on the right side.
 */
export default function MenuBar() {
  const [time, setTime] = useState<string>(() =>
    new Date().toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="flex items-center h-7 flex-shrink-0 select-none relative"
      style={{
        background: 'var(--wiki-surface)',
        borderBottom: '1px solid var(--wiki-border)',
        fontSize: '13px',
        color: 'var(--wiki-text2)',
      }}
    >
      {/* ── Left: Apple logo + menu items ── */}
      <div className="flex items-center h-full gap-4 pl-3 flex-1">
        <span className="inline-flex items-center" aria-label="Apple 菜单">
          <AppleLogo />
        </span>
        {MENU_ITEMS.map((item) => (
          <span
            key={item}
            className="cursor-default"
            style={{ color: 'var(--wiki-text2)' }}
          >
            {item}
          </span>
        ))}
      </div>

      {/* ── Center: Clock (absolute positioned) ── */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center h-full">
        <span
          className="cursor-default tabular-nums"
          style={{ color: 'var(--wiki-text2)' }}
        >
          {time}
        </span>
      </div>

      {/* ── Right: spacer ── */}
      <div className="flex-1" />
    </div>
  );
}

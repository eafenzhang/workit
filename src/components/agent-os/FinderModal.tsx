import { useState, useEffect } from 'react';
import { XIcon, BookmarkIcon } from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────

interface Bookmark {
  url: string;
  title: string;
  addedAt: number;
}

interface FinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUrl: (url: string, title: string) => void;
}

const BM_KEY = 'workit_browser_bookmarks';

// ── Helpers ──────────────────────────────────────────────────────

function loadBookmarks(): Bookmark[] {
  try {
    const raw = localStorage.getItem(BM_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Corrupted data — return empty
  }
  return [];
}

function faviconUrl(url: string): string {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=16`;
  } catch {
    return '';
  }
}

// ── Component ────────────────────────────────────────────────────

export default function FinderModal({ isOpen, onClose, onOpenUrl }: FinderModalProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    if (isOpen) {
      setBookmarks(loadBookmarks());
    }
  }, [isOpen]);

  // ── Keyboard: Escape to close ──
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl overflow-hidden w-[480px] max-h-[520px] flex flex-col mx-4"
        style={{
          background: 'var(--wiki-surface)',
          border: '1px solid var(--wiki-border)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--wiki-border)' }}
        >
          <div className="flex items-center gap-2">
            <BookmarkIcon size={16} style={{ color: 'var(--wiki-text2)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--wiki-text)' }}>
              访达 — 浏览器收藏
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-wiki-surface2 transition-colors"
            aria-label="关闭"
          >
            <XIcon size={14} style={{ color: 'var(--wiki-text3)' }} />
          </button>
        </div>

        {/* ── Bookmark list ── */}
        <div className="flex-1 overflow-y-auto">
          {bookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <BookmarkIcon size={32} style={{ color: 'var(--wiki-text3)', opacity: 0.4 }} />
              <span className="text-sm" style={{ color: 'var(--wiki-text3)' }}>
                暂无收藏
              </span>
            </div>
          ) : (
            bookmarks.map(bm => (
              <button
                key={bm.url + bm.addedAt}
                onClick={() => onOpenUrl(bm.url, bm.title)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-wiki-surface2 transition-colors"
                style={{ borderBottom: '1px solid var(--wiki-border)' }}
              >
                <img
                  src={faviconUrl(bm.url)}
                  className="w-4 h-4 flex-shrink-0 rounded-sm"
                  alt=""
                  loading="lazy"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs truncate"
                    style={{ color: 'var(--wiki-text)' }}
                  >
                    {bm.title || bm.url}
                  </div>
                  <div
                    className="text-[10px] truncate"
                    style={{ color: 'var(--wiki-text3)' }}
                  >
                    {bm.url}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="px-4 py-2 flex-shrink-0 text-center"
          style={{ borderTop: '1px solid var(--wiki-border)' }}
        >
          <span className="text-[11px]" style={{ color: 'var(--wiki-text3)' }}>
            {bookmarks.length} 个书签
          </span>
        </div>
      </div>
    </div>
  );
}

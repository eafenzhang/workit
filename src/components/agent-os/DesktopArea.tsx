import { type ReactNode } from 'react';
import WindowManager from './WindowManager';

interface DesktopAreaProps {
  children?: ReactNode;
}

/**
 * Desktop canvas area where windows live.
 *
 * Provides `position: relative; overflow: hidden` container for
 * absolute-positioned windows and serves as the WindowManager host.
 */
export default function DesktopArea({ children }: DesktopAreaProps) {
  return (
    <div
      className="flex-1 relative overflow-hidden"
      style={{ background: 'var(--wiki-bg)' }}
    >
      <WindowManager />
      {children}
    </div>
  );
}

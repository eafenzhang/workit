import React from 'react';

/**
 * A React-isolated native DOM container for Electron webview.
 *
 * ── Problem ──
 * Any React re-render of the webview's parent `<div>` can cause Electron's
 * GPU compositor to re-initialize the webview — triggering an unwanted page
 * reload when the user simply switches windows.
 *
 * ── Solution ─
 * This component renders a plain `<div>` once, then **never participates
 * in React reconciliation again** (memo comparator always returns true).
 * All webview lifecycle (create, destroy, navigate) is managed imperatively
 * via the forwarded ref — completely outside React's virtual DOM.
 */
const WebviewContainer = React.memo(
  React.forwardRef<HTMLDivElement>(function WebviewContainer(_props, ref) {
    console.log('[WebviewContainer] RENDER — should only fire ONCE');
    return (
      <div
        ref={ref}
        className="flex-1 flex flex-col overflow-hidden"
        style={{ display: 'flex' }}
      />
    );
  }),
  () => true, // NEVER re-render — not even on prop changes
);

WebviewContainer.displayName = 'WebviewContainer';
export default WebviewContainer;

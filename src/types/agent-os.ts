import type React from 'react';

// ── Core geometry types ──────────────────────────────────────────

/** A rectangle representing window position + size */
export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ── Window & dock types ──────────────────────────────────────────

/** A single OS desktop window */
export interface OSWindow {
  id: string;
  type: string; // maps to page component type (home, requirements, etc.)
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  /** Saved position/size before maximizing — used to restore */
  preMaximizeRect: WindowRect | null;
  /** Initial URL for browser-type windows */
  initialUrl?: string;
}

/** A single Dock bar icon entry */
export interface DockItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string; style?: React.CSSProperties }>;
  type: string;
}

// ── Global state ─────────────────────────────────────────────────

/** Top-level AgentOS state managed by useReducer */
export interface AgentOSState {
  isOSMode: boolean;
  windows: OSWindow[];
  activeWindowId: string | null;
  nextZIndex: number;
  /** Prevents hydration mismatch — true after first init from localStorage */
  isInitialized: boolean;
}

// ── Reducer actions ──────────────────────────────────────────────

export type AgentOSAction =
  | { type: 'TOGGLE_OS_MODE' }
  | { type: 'INIT_FROM_STORAGE'; payload: { isOSMode: boolean; windows: OSWindow[]; nextZIndex: number } }
  | { type: 'OPEN_WINDOW'; payload: { window: OSWindow } }
  | { type: 'CLOSE_WINDOW'; payload: { id: string } }
  | { type: 'FOCUS_WINDOW'; payload: { id: string } }
  | { type: 'MINIMIZE_WINDOW'; payload: { id: string } }
  | { type: 'TOGGLE_MAXIMIZE'; payload: { id: string; desktopRect: WindowRect } }
  | { type: 'MOVE_WINDOW'; payload: { id: string; x: number; y: number } }
  | { type: 'RESIZE_WINDOW'; payload: { id: string; width: number; height: number; x?: number; y?: number } };

// ── Page component map ───────────────────────────────────────────

/** Maps window type → lazy-loaded page component */
export type WindowPageMap = Record<string, React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>>>;

// ── Constants ────────────────────────────────────────────────────

export const WINDOW_DEFAULT_WIDTH = 800;
export const WINDOW_DEFAULT_HEIGHT = 560;
export const WINDOW_MIN_WIDTH = 400;
export const WINDOW_MIN_HEIGHT = 300;

/** localStorage key prefix — shared across the AgentOS module */
export const LS_MODE_KEY = 'agent-os-mode';
export const LS_WINDOWS_KEY = 'agent-os-windows';

// ── Factory ──────────────────────────────────────────────────────

/** Create the default initial state before localStorage hydration */
export function createInitialState(): AgentOSState {
  return {
    isOSMode: false,
    windows: [],
    activeWindowId: null,
    nextZIndex: 1,
    isInitialized: false,
  };
}

// ── Reducer ──────────────────────────────────────────────────────

/**
 * Pure reducer for AgentOSState.
 *
 * All business logic (dedup, centering, viewport math) lives in the
 * context provider methods; this reducer only applies atomic transitions.
 */
export function agentOSReducer(state: AgentOSState, action: AgentOSAction): AgentOSState {
  switch (action.type) {

    // ── Mode ──

    case 'TOGGLE_OS_MODE': {
      return { ...state, isOSMode: !state.isOSMode };
    }

    case 'INIT_FROM_STORAGE': {
      return {
        ...state,
        isOSMode: action.payload.isOSMode,
        windows: action.payload.windows,
        nextZIndex: action.payload.nextZIndex,
        isInitialized: true,
      };
    }

    // ── Window CRUD ──

    case 'OPEN_WINDOW': {
      const { window: newWin } = action.payload;
      return {
        ...state,
        windows: [...state.windows, newWin],
        activeWindowId: newWin.id,
        nextZIndex: newWin.zIndex + 1,
      };
    }

    case 'CLOSE_WINDOW': {
      const remaining = state.windows.filter(w => w.id !== action.payload.id);
      // If we closed the active window, focus the top-most remaining one
      let nextActiveId = state.activeWindowId;
      if (state.activeWindowId === action.payload.id) {
        const top = remaining.reduce<OSWindow | null>(
          (best, w) => (!best || w.zIndex > best.zIndex ? w : best),
          null,
        );
        nextActiveId = top?.id ?? null;
      }
      return {
        ...state,
        windows: remaining,
        activeWindowId: nextActiveId,
      };
    }

    case 'FOCUS_WINDOW': {
      const newZ = state.nextZIndex;
      return {
        ...state,
        activeWindowId: action.payload.id,
        nextZIndex: newZ + 1,
        windows: state.windows.map(w =>
          w.id === action.payload.id
            ? { ...w, zIndex: newZ, isMinimized: false }
            : w,
        ),
      };
    }

    case 'MINIMIZE_WINDOW': {
      const minWin = state.windows.find(w => w.id === action.payload.id);
      if (!minWin) return state;

      // When minimizing, find the next highest visible window to focus
      const visible = state.windows.filter(
        w => w.id !== action.payload.id && !w.isMinimized,
      );
      const nextActive = visible.reduce<OSWindow | null>(
        (best, w) => (!best || w.zIndex > best.zIndex ? w : best),
        null,
      );

      return {
        ...state,
        activeWindowId: nextActive?.id ?? null,
        windows: state.windows.map(w =>
          w.id === action.payload.id ? { ...w, isMinimized: true } : w,
        ),
      };
    }

    case 'TOGGLE_MAXIMIZE': {
      const { id, desktopRect } = action.payload;
      return {
        ...state,
        windows: state.windows.map(w => {
          if (w.id !== id) return w;
          if (w.isMaximized) {
            // Restore to previous position/size
            const restored = w.preMaximizeRect ?? {
              x: 200,
              y: 80,
              width: WINDOW_DEFAULT_WIDTH,
              height: WINDOW_DEFAULT_HEIGHT,
            };
            return {
              ...w,
              ...restored,
              isMaximized: false,
              preMaximizeRect: null,
            };
          }
          // Save current rect and go fullscreen within DesktopArea
          return {
            ...w,
            x: 0,
            y: 0,
            width: desktopRect.width,
            height: desktopRect.height,
            isMaximized: true,
            preMaximizeRect: { x: w.x, y: w.y, width: w.width, height: w.height },
          };
        }),
      };
    }

    case 'MOVE_WINDOW': {
      const { id, x, y } = action.payload;
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === id ? { ...w, x, y } : w,
        ),
      };
    }

    case 'RESIZE_WINDOW': {
      const { id, width, height, x, y } = action.payload;
      return {
        ...state,
        windows: state.windows.map(w => {
          if (w.id !== id) return w;
          const clampedW = Math.max(WINDOW_MIN_WIDTH, width);
          const clampedH = Math.max(WINDOW_MIN_HEIGHT, height);
          return {
            ...w,
            width: clampedW,
            height: clampedH,
            ...(x !== undefined ? { x } : {}),
            ...(y !== undefined ? { y } : {}),
          };
        }),
      };
    }

    default:
      return state;
  }
}

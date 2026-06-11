// ──────────────────────────────────────────────────────
// AionCore WebSocket Client
// Real-time event streaming for AionCore backend
// ──────────────────────────────────────────────────────

type WsEventListener = (data: unknown) => void;

export type WsEventName =
  | 'conversation.listChanged'
  | 'conversation.statusChanged'
  | 'conversation.messageReceived'
  | 'conversation.confirmationRequested'
  | 'cron.jobExecuted'
  | 'cron.jobStatusChanged'
  | 'fileWatch.fileChanged'
  | 'extensions.stateChanged'
  | 'channel.pairingRequested'
  | 'channel.pluginStatusChanged'
  | 'channel.messageReceived'
  | 'team.agent.status'
  | 'team.messageReceived';

interface WsMessage {
  name: string;
  data: unknown;
}

const RECONNECT_INTERVAL = 3000;
const MAX_RECONNECT_ATTEMPTS = 50;

class WsClient {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<WsEventListener>>();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;
  private baseUrl = '';

  /**
   * Connect to the AionCore WebSocket endpoint.
   * In Electron, connects directly to the backend port.
   * In dev mode, uses Vite proxy or falls back to port 13400.
   */
  connect(url?: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.shouldReconnect = true;
    this.baseUrl = url || this.resolveUrl();
    this.doConnect();
  }

  private resolveUrl(): string {
    // In Electron, use the exposed port
    if (typeof window !== 'undefined' && (window as any).electronAPI?.aioncorePort) {
      return `ws://localhost:${(window as any).electronAPI.aioncorePort}/ws`;
    }
    // In dev mode with Vite proxy
    const loc = typeof window !== 'undefined' ? window.location : null;
    if (loc && loc.host === 'localhost:5173') {
      return `ws://localhost:5173/ws`;  // Vite proxy handles it
    }
    // Direct fallback
    return 'ws://localhost:13400/ws';
  }

  private doConnect(): void {
    try {
      this.ws = new WebSocket(this.baseUrl);
    } catch (err) {
      console.error('[ws] Connection failed:', err);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log('[ws] Connected to', this.baseUrl);
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        this.dispatch(msg.name, msg.data);
      } catch (err) {
        console.warn('[ws] Failed to parse message:', err);
      }
    };

    this.ws.onerror = (err) => {
      console.error('[ws] Error:', err);
    };

    this.ws.onclose = (event) => {
      console.log('[ws] Disconnected (code:', event.code, ')');
      this.ws = null;
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return;
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[ws] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(RECONNECT_INTERVAL * this.reconnectAttempts, 30000);
    console.log(`[ws] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.doConnect(), delay);
  }

  /**
   * Disconnect and stop reconnecting.
   */
  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  /**
   * Subscribe to a WebSocket event.
   * Returns an unsubscribe function.
   */
  on(event: WsEventName, listener: WsEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  /**
   * Subscribe to an event, but only trigger once then auto-unsubscribe.
   */
  once(event: WsEventName, listener: WsEventListener): void {
    const wrapper = (data: unknown) => {
      listener(data);
      this.listeners.get(event)?.delete(wrapper);
    };
    this.on(event, wrapper);
  }

  /**
   * Remove a specific listener from an event.
   */
  off(event: WsEventName, listener: WsEventListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  /**
   * Remove all listeners for an event.
   */
  removeAllListeners(event?: WsEventName): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  private dispatch(name: string, data: unknown): void {
    const listeners = this.listeners.get(name as WsEventName);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(data);
        } catch (err) {
          console.error(`[ws] Error in listener for "${name}":`, err);
        }
      }
    }
  }
}

// Singleton instance
export const wsClient = new WsClient();

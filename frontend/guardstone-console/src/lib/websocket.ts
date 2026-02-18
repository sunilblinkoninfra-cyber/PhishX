/**
 * WebSocket Client Utility
 * Handles real-time communication with server, reconnection logic, and message routing
 */

import { WebSocketMessage, WebSocketMessageType, WebSocketConnectionOptions } from '@/types';

type MessageHandler = (message: WebSocketMessage) => void;
type ConnectionHandler = (connected: boolean) => void;
type ErrorHandler = (error: Error) => void;

export class SOCWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private reconnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectInterval: number;
  private shouldReconnect: boolean;

  private messageHandlers: Map<WebSocketMessageType, Set<MessageHandler>> = new Map();
  private generalHandlers: Set<MessageHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();

  private heartbeatInterval: NodeJS.Timer | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private isReady = false;

  constructor(options: WebSocketConnectionOptions) {
    this.url = options.url;
    this.token = options.token;
    this.shouldReconnect = options.reconnect ?? true;
    this.reconnectInterval = options.reconnectInterval ?? 3000;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
  }

  /**
   * Connect to WebSocket server
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected');
          this.isReady = true;
          this.reconnectAttempts = 0;
          this.reconnecting = false;

          this.authenticate();
          this.startHeartbeat();
          this.flushMessageQueue();
          this.notifyConnectionHandlers(true);

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('[WebSocket] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (event) => {
          console.error('[WebSocket] Error:', event);
          const error = new Error('WebSocket error occurred');
          this.notifyErrorHandlers(error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[WebSocket] Disconnected');
          this.isReady = false;
          this.stopHeartbeat();
          this.notifyConnectionHandlers(false);

          if (this.shouldReconnect && !this.reconnecting) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send message to server
   */
  public send(message: Partial<WebSocketMessage>): void {
    const fullMessage: WebSocketMessage = {
      id: message.id || `msg_${Date.now()}_${Math.random()}`,
      type: message.type || 'message:broadcast',
      timestamp: message.timestamp || new Date(),
      payload: message.payload || {},
      userId: message.userId,
      sessionId: message.sessionId,
    };

    if (this.isReady && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(fullMessage));
    } else {
      this.messageQueue.push(fullMessage);
    }
  }

  /**
   * Subscribe to specific message type
   */
  public subscribe(type: WebSocketMessageType, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }

    this.messageHandlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  /**
   * Subscribe to all messages
   */
  public subscribeAll(handler: MessageHandler): () => void {
    this.generalHandlers.add(handler);

    return () => {
      this.generalHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to connection state changes
   */
  public onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);

    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to errors
   */
  public onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);

    return () => {
      this.errorHandlers.delete(handler);
    };
  }

  /**
   * Disconnect from server
   */
  public disconnect(): void {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.stopHeartbeat();
    this.messageQueue = [];
  }

  /**
   * Get connection status
   */
  public isConnected(): boolean {
    return this.isReady && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get message queue length
   */
  public getQueueLength(): number {
    return this.messageQueue.length;
  }

  // ===========================
  // PRIVATE METHODS
  // ===========================

  private authenticate(): void {
    this.send({
      type: 'auth:required',
      payload: {
        token: this.token,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private handleMessage(message: WebSocketMessage): void {
    // Notify general handlers
    this.generalHandlers.forEach((handler) => handler(message));

    // Notify type-specific handlers
    const typeHandlers = this.messageHandlers.get(message.type);
    if (typeHandlers) {
      typeHandlers.forEach((handler) => handler(message));
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          type: 'health:check',
          payload: { timestamp: new Date().toISOString() },
        });
      }
    }, 30000); // Every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private flushMessageQueue(): void {
    if (this.isReady && this.ws && this.ws.readyState === WebSocket.OPEN) {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (message) {
          this.ws.send(JSON.stringify(message));
        }
      }
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `[WebSocket] Max reconnection attempts (${this.maxReconnectAttempts}) reached`
      );
      const error = new Error('Max WebSocket reconnection attempts reached');
      this.notifyErrorHandlers(error);
      return;
    }

    this.reconnecting = true;
    this.reconnectAttempts++;

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    console.log(`[WebSocket] Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('[WebSocket] Reconnection failed:', error);
      });
    }, delay);
  }

  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach((handler) => handler(connected));
  }

  private notifyErrorHandlers(error: Error): void {
    this.errorHandlers.forEach((handler) => handler(error));
  }
}

// ===========================
// SINGLETON INSTANCE
// ===========================

let wsClientInstance: SOCWebSocketClient | null = null;

export function initializeWebSocketClient(
  options: WebSocketConnectionOptions
): SOCWebSocketClient {
  if (!wsClientInstance) {
    wsClientInstance = new SOCWebSocketClient(options);
  }
  return wsClientInstance;
}

export function getWebSocketClient(): SOCWebSocketClient {
  if (!wsClientInstance) {
    throw new Error(
      'WebSocket client not initialized. Call initializeWebSocketClient first.'
    );
  }
  return wsClientInstance;
}

export function closeWebSocketClient(): void {
  if (wsClientInstance) {
    wsClientInstance.disconnect();
    wsClientInstance = null;
  }
}

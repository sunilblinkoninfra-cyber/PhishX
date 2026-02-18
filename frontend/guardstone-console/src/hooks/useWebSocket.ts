/**
 * WebSocket React Hooks
 * Provides hooks for integrating WebSocket functionality in React components
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import {
  SOCWebSocketClient,
  getWebSocketClient,
  initializeWebSocketClient,
} from '@/lib/websocket';
import { WebSocketMessage, WebSocketMessageType, WebSocketConnectionOptions } from '@/types';

/**
 * Hook to initialize and manage WebSocket connection
 */
export function useWebSocketConnection(options: WebSocketConnectionOptions) {
  const clientRef = useRef<SOCWebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected');

  useEffect(() => {
    const initConnection = async () => {
      try {
        setConnectionStatus('connecting');
        const client = initializeWebSocketClient(options);
        clientRef.current = client;

        await client.connect();
        setIsConnected(true);
        setConnectionStatus('connected');
        setError(null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setConnectionStatus('error');
        setIsConnected(false);
      }
    };

    initConnection();

    return () => {
      // Cleanup on unmount
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, [options.url, options.token]);

  const reconnect = useCallback(async () => {
    try {
      setConnectionStatus('connecting');
      const client = clientRef.current || getWebSocketClient();
      await client.connect();
      setIsConnected(true);
      setConnectionStatus('connected');
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setConnectionStatus('error');
    }
  }, []);

  return {
    isConnected,
    error,
    connectionStatus,
    client: clientRef.current,
    reconnect,
  };
}

/**
 * Hook to subscribe to specific WebSocket message types
 */
export function useWebSocketMessage(
  type: WebSocketMessageType | WebSocketMessageType[],
  callback: (message: WebSocketMessage) => void
) {
  const clientRef = useRef<SOCWebSocketClient | null>(null);

  useEffect(() => {
    try {
      const client = getWebSocketClient();
      clientRef.current = client;

      const types = Array.isArray(type) ? type : [type];
      const unsubscribeFunctions = types.map((t) => client.subscribe(t, callback));

      return () => {
        unsubscribeFunctions.forEach((fn) => fn());
      };
    } catch (error) {
      console.error('Failed to subscribe to WebSocket messages:', error);
    }
  }, [type, callback]);
}

/**
 * Hook to subscribe to all WebSocket messages
 */
export function useWebSocketMessages(callback: (message: WebSocketMessage) => void) {
  const clientRef = useRef<SOCWebSocketClient | null>(null);

  useEffect(() => {
    try {
      const client = getWebSocketClient();
      clientRef.current = client;
      const unsubscribe = client.subscribeAll(callback);

      return () => {
        unsubscribe();
      };
    } catch (error) {
      console.error('Failed to subscribe to WebSocket messages:', error);
    }
  }, [callback]);
}

/**
 * Hook to send WebSocket messages
 */
export function useWebSocketSend() {
  const sendMessage = useCallback((message: Partial<WebSocketMessage>) => {
    try {
      const client = getWebSocketClient();
      client.send(message);
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
    }
  }, []);

  return sendMessage;
}

/**
 * Hook to listen to connection state changes
 */
export function useWebSocketConnectionStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<SOCWebSocketClient | null>(null);

  useEffect(() => {
    try {
      const client = getWebSocketClient();
      clientRef.current = client;

      // Check initial state
      setIsConnected(client.isConnected());

      // Subscribe to changes
      const unsubscribe = client.onConnectionChange((connected) => {
        setIsConnected(connected);
      });

      return () => {
        unsubscribe();
      };
    } catch (error) {
      console.error('Failed to subscribe to connection status:', error);
      setIsConnected(false);
    }
  }, []);

  return isConnected;
}

/**
 * Hook to handle WebSocket errors
 */
export function useWebSocketError() {
  const [error, setError] = useState<Error | null>(null);
  const clientRef = useRef<SOCWebSocketClient | null>(null);

  useEffect(() => {
    try {
      const client = getWebSocketClient();
      clientRef.current = client;

      const unsubscribe = client.onError((err) => {
        console.error('WebSocket error:', err);
        setError(err);
      });

      return () => {
        unsubscribe();
      };
    } catch (error) {
      console.error('Failed to subscribe to WebSocket errors:', error);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { error, clearError };
}

/**
 * Hook for real-time alert updates
 */
export function useRealtimeAlerts(callback: (message: WebSocketMessage) => void) {
  useWebSocketMessage(
    [
      'alert:new',
      'alert:updated',
      'alert:status_changed',
    ] as WebSocketMessageType[],
    callback
  );
}

/**
 * Hook for real-time incident updates
 */
export function useRealtimeIncidents(callback: (message: WebSocketMessage) => void) {
  useWebSocketMessage(
    [
      'incident:created',
      'incident:updated',
      'incident:closed',
    ] as WebSocketMessageType[],
    callback
  );
}

/**
 * Hook for real-time metrics updates
 */
export function useRealtimeMetrics(callback: (message: WebSocketMessage) => void) {
  useWebSocketMessage('metrics:update', callback);
}

/**
 * Hook for real-time workflow execution updates
 */
export function useRealtimeWorkflows(callback: (message: WebSocketMessage) => void) {
  useWebSocketMessage(
    [
      'workflow:executed',
      'workflow:failed',
    ] as WebSocketMessageType[],
    callback
  );
}

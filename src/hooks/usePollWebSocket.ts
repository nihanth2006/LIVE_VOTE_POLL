import { useState, useEffect, useCallback, useRef } from 'react';
import { PollResults } from '../types/poll';
import { realTimeBroadcast } from '../services/api';

export interface UsePollWebSocketReturn {
  isConnected: boolean;
  isReconnecting: boolean;
  lastEvent: any;
  reconnect: () => void;
}

export function usePollWebSocket(
  pollId: string,
  onVoteUpdate?: (results: PollResults, event: any) => void,
  onStatusChange?: (status: string) => void
): UsePollWebSocketReturn {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<any>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const attemptsRef = useRef<number>(0);

  const onVoteUpdateRef = useRef(onVoteUpdate);
  const onStatusChangeRef = useRef(onStatusChange);

  useEffect(() => {
    onVoteUpdateRef.current = onVoteUpdate;
    onStatusChangeRef.current = onStatusChange;
  }, [onVoteUpdate, onStatusChange]);

  const connect = useCallback(() => {
    if (!pollId || typeof window === 'undefined') return;

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore close error
      }
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/polls/${pollId}`;

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        setIsReconnecting(false);
        attemptsRef.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastEvent(data);
          if (data.type === 'VOTE_UPDATE' && onVoteUpdateRef.current) {
            onVoteUpdateRef.current(data.results, data.event);
          }
          if (data.type === 'POLL_STATUS_CHANGE' && onStatusChangeRef.current) {
            onStatusChangeRef.current(data.status);
          }
        } catch {
          // Non-JSON message ignore
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        setIsReconnecting(true);
        // Exponential backoff reconnect: min 2s, max 10s
        const delay = Math.min(10000, 2000 * Math.pow(1.5, attemptsRef.current));
        attemptsRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

      socket.onerror = () => {
        try {
          socket.close();
        } catch {
          // ignore
        }
      };
    } catch {
      // WebSocket creation failed (e.g. sandbox or fallback)
      setIsConnected(true);
      setIsReconnecting(false);
    }
  }, [pollId]);

  useEffect(() => {
    connect();

    // Listen to cross-tab BroadcastChannel for real-time Redis Pub/Sub multi-window testing
    const handleBroadcast = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'VOTE_UPDATE' && data.event && data.event.pollId === pollId) {
        setLastEvent(data.event);
        if (onVoteUpdateRef.current) {
          onVoteUpdateRef.current(data.results, data.event);
        }
      } else if (data.type === 'POLL_STATUS_CHANGE' && data.pollId === pollId) {
        if (onStatusChangeRef.current) {
          onStatusChangeRef.current(data.status);
        }
      }
    };

    realTimeBroadcast?.addEventListener('message', handleBroadcast);

    return () => {
      realTimeBroadcast?.removeEventListener('message', handleBroadcast);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
      }
    };
  }, [pollId, connect]);

  const reconnect = useCallback(() => {
    attemptsRef.current = 0;
    connect();
  }, [connect]);

  return {
    isConnected,
    isReconnecting,
    lastEvent,
    reconnect,
  };
}

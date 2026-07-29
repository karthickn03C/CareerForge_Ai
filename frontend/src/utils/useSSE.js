/**
 * useSSE — React hook for Server-Sent Events.
 * Connects to /api/events/stream and dispatches real-time events.
 * Auto-reconnects on disconnect with exponential backoff.
 */

import { useEffect, useRef, useCallback } from 'react';

const getSSEUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace('/api', '') + '/api/events/stream';
  }
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return '/api/events/stream';
  }
  return 'https://careerforge-ai-2bbv.onrender.com/api/events/stream';
};

/**
 * @param {function} onEvent - callback(eventType: string, data: object)
 * @param {boolean} enabled - whether to connect (false for non-staff users)
 */
export function useSSE(onEvent, enabled = true) {
  const esRef = useRef(null);
  const reconnectTimer = useRef(null);
  const backoffMs = useRef(2000);
  const onEventRef = useRef(onEvent);

  // Keep ref current without re-triggering effect
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const connect = useCallback(() => {
    if (!enabled) return;
    if (esRef.current) {
      esRef.current.close();
    }

    const url = getSSEUrl();
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      backoffMs.current = 2000; // reset backoff on successful connect
    };

    es.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.type && parsed.type !== 'connected') {
          onEventRef.current?.(parsed.type, parsed.data);
        }
      } catch (err) {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      // Exponential backoff reconnect (max 30s)
      const delay = Math.min(backoffMs.current, 30000);
      backoffMs.current = Math.min(delay * 1.5, 30000);
      reconnectTimer.current = setTimeout(connect, delay);
    };
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      connect();
    }
    return () => {
      if (esRef.current) esRef.current.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect, enabled]);
}

export default useSSE;

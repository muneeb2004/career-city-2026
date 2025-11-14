'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

interface SessionTimeoutOptions {
  expiresAt: number | null | undefined;
  onExpire: () => Promise<void> | void;
  warningOffsetMs?: number;
  warningMessage?: string;
  expirationMessage?: string;
}

const DEFAULT_WARNING_OFFSET = 2 * 60 * 1000; // two minutes

export function useSessionTimeout({
  expiresAt,
  onExpire,
  warningOffsetMs = DEFAULT_WARNING_OFFSET,
  warningMessage = 'Your session will end soon. Save your changes to avoid losing progress.',
  expirationMessage = 'Your session has expired. Please sign in again.',
}: SessionTimeoutOptions) {
  const warnedRef = useRef(false);

  useEffect(() => {
    if (!expiresAt) {
      return;
    }

    const now = Date.now();
    const expireAtMs = expiresAt * 1000;
    const timeUntilExpiration = expireAtMs - now;

    if (timeUntilExpiration <= 0) {
      toast.error(expirationMessage);
      void onExpire();
      return;
    }

    let warningTimer: ReturnType<typeof setTimeout> | null = null;
    let expirationTimer: ReturnType<typeof setTimeout> | null = null;

    const warningDelay = Math.max(timeUntilExpiration - warningOffsetMs, 0);

    if (warningOffsetMs > 0 && timeUntilExpiration > warningOffsetMs && !warnedRef.current) {
      warningTimer = setTimeout(() => {
        warnedRef.current = true;
        toast(warningMessage, {
          icon: '!'
        });
      }, warningDelay);
    }

    expirationTimer = setTimeout(() => {
      toast.error(expirationMessage);
      void onExpire();
    }, timeUntilExpiration);

    return () => {
      if (warningTimer) {
        clearTimeout(warningTimer);
      }
      if (expirationTimer) {
        clearTimeout(expirationTimer);
      }
    };
  }, [expiresAt, expirationMessage, onExpire, warningMessage, warningOffsetMs]);
}

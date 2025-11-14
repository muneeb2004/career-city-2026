'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { extractErrorMessage } from '@/lib/client/api';

interface LogoutOptions {
  silent?: boolean;
  successMessage?: string;
}

export function useLogout(redirectPath: string) {
  const router = useRouter();

  return useCallback(
    async (options?: LogoutOptions) => {
      const { silent = false, successMessage } = options ?? {};

      const performLogout = async () => {
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        const contentType = response.headers.get('content-type') ?? '';
        const expectsJson = /application\/json/i.test(contentType);
        const payload = expectsJson ? await response.json().catch(() => ({})) : null;

        if (!response.ok) {
          const message = payload && typeof payload === 'object' && 'error' in payload ? (payload as { error?: string }).error : null;
          throw new Error(message && message.trim() ? message : 'Unable to sign out. Please try again.');
        }

        return response;
      };

      try {
        if (silent) {
          await performLogout();
        } else {
          await toast.promise(performLogout(), {
            loading: 'Signing you out...',
            success: successMessage ?? 'Signed out successfully.',
            error: (error) => extractErrorMessage(error, 'Unable to sign out. Please try again.'),
          });
        }
      } catch (error) {
        const message = extractErrorMessage(error, 'Unable to sign out. Please try again.');
        console.error('Logout error', error);
        if (silent) {
          toast.error(message);
        }
        return;
      }

      router.push(redirectPath);
      router.refresh();
    },
    [redirectPath, router]
  );
}

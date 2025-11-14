'use client';

import { memo } from 'react';
import { LogOut } from 'lucide-react';
import { useLogout } from '@/hooks/useLogout';

interface LogoutButtonProps {
  redirectPath: string;
  className?: string;
  label?: string;
  onLogout?: () => Promise<void> | void;
}

const baseClasses =
  'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

function LogoutButtonComponent({ redirectPath, className = '', label = 'Log out', onLogout }: LogoutButtonProps) {
  const logout = useLogout(redirectPath);

  const handleLogout = () => {
    if (onLogout) {
      void onLogout();
      return;
    }
    void logout();
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={`${baseClasses} ${className}`.trim()}
    >
      <LogOut className="h-4 w-4" />
      {label}
    </button>
  );
}

export const LogoutButton = memo(LogoutButtonComponent);

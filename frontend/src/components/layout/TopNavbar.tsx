import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';

export function TopNavbar() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = now.toLocaleString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-8">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Xeno CRM</h1>
        <p className="text-xs text-gray-500">Marketing Intelligence Dashboard</p>
      </div>

      <div className="flex items-center gap-5">
        {/* Live clock */}
        <time className="font-mono text-sm text-gray-400">{timeString}</time>

        {/* Divider */}
        <div className="h-7 w-px bg-gray-200" />

        {/* Admin badge */}
        <div className="flex items-center gap-2.5 rounded-xl border border-purple-100 bg-purple-50 px-3.5 py-2 shadow-sm">
          {/* Shield icon with purple gradient background */}
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] shadow-sm">
            <Shield className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-none">
            <p className="text-xs font-semibold text-gray-800">Admin</p>
            <p className="mt-0.5 text-[10px] font-medium text-purple-500">Full Access</p>
          </div>
          {/* Online indicator dot */}
          <span className="relative flex h-2 w-2 ml-1">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        </div>
      </div>
    </header>
  );
}

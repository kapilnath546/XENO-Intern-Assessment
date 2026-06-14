import { useEffect, useState } from 'react';

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

      <div className="flex items-center gap-4">
        <time className="font-mono text-sm text-gray-500">{timeString}</time>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7C3AED] text-sm font-semibold text-white">
          AK
        </div>
      </div>
    </header>
  );
}

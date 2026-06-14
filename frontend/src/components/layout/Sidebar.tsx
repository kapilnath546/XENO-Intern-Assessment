import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Megaphone, BarChart3 } from 'lucide-react';
import { cn } from '../../utils';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/segments', label: 'Segments', icon: Users },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

/** Inline SVG logo mark — bar chart + upward trend, matches favicon */
function LogoMark() {
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-9 w-9">
      <rect width="36" height="36" rx="10" fill="url(#logoGrad)" />
      {/* Bar chart columns */}
      <rect x="7"  y="21" width="4.5" height="9"  rx="1.2" fill="white" fillOpacity="0.85" />
      <rect x="13.5" y="15" width="4.5" height="15" rx="1.2" fill="white" />
      <rect x="20" y="10" width="4.5" height="20" rx="1.2" fill="white" fillOpacity="0.7"  />
      {/* Trend arrow */}
      <path d="M26 7 L30 7 L30 11" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 9 L30 7"         stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#5B21B6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      {/* Brand header */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-5">
        <LogoMark />
        <div>
          <p className="text-sm font-bold text-gray-900 leading-tight">Xeno CRM</p>
          <p className="text-[11px] font-medium text-purple-500">AI-Native Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-purple-50 text-[#7C3AED]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer status */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <p className="text-xs text-gray-500 font-medium">Live polling enabled</p>
        </div>
        <p className="mt-1 text-xs text-gray-400 pl-4">Updates every 3s</p>
      </div>
    </aside>
  );
}

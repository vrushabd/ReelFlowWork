'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ListVideo, 
  PlusCircle, 
  CalendarClock, 
  CheckCircle2, 
  XCircle, 
  BarChart3, 
  Camera, 
  Settings, 
  TerminalSquare 
} from 'lucide-react';

const routes = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Content Queue', path: '/queue', icon: ListVideo },
  { name: 'Add Reels', path: '/add-reels', icon: PlusCircle },
  { name: 'Scheduled', path: '/scheduled', icon: CalendarClock },
  { name: 'Published', path: '/published', icon: CheckCircle2 },
  { name: 'Failed', path: '/failed', icon: XCircle },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Instagram', path: '/settings/instagram', icon: Camera },
  { name: 'Settings', path: '/settings', icon: Settings },
  { name: 'System Logs', path: '/system-logs', icon: TerminalSquare },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 border-r border-border bg-card h-full flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <div className="flex items-center gap-2 font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-500">
          <Camera className="text-pink-500" />
          ReelFlow
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {routes.map((route) => (
          <Link
            key={route.path}
            href={route.path}
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
              pathname === route.path
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <route.icon size={18} />
            {route.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

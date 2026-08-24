'use client';

import { useState, useEffect } from 'react';
import { Bell, User } from 'lucide-react';

export function Topbar() {
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/health`);
        if (res.ok) setHealth(await res.json());
      } catch (e) {}
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const apiOnline = !!health;
  const workerOnline = !!health?.redis;
  const dbOnline = !!health?.db;

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 flex items-center justify-between px-6 z-10">
      <div className="flex items-center gap-4">
        {/* System Status Indicators */}
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${apiOnline ? 'bg-green-500' : 'bg-gray-500'}`}></span> API</span>
          <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${workerOnline ? 'bg-green-500' : 'bg-red-500'}`}></span> Queue</span>
          <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${dbOnline ? 'bg-green-500' : 'bg-red-500'}`}></span> DB</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-pink-500 rounded-full border border-card"></span>
        </button>
        <div className="flex items-center gap-2 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border group-hover:border-primary transition-colors">
            <User size={16} />
          </div>
        </div>
      </div>
    </header>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CheckCircle2, Clock, XCircle, ListVideo } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentReels, setRecentReels] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);

  const fetchData = async () => {
    try {
      // 1. Fetch Analytics for stats cards
      const statsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analytics`);
      if (statsRes.ok) setStats(await statsRes.json());

      // 2. Fetch Recent Activity (last 5 reels)
      const reelsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reels`);
      if (reelsRes.ok) {
        const reelsData = await reelsRes.json();
        setRecentReels(reelsData.reels?.slice(0, 5) || []);
      }

      // 3. Fetch Health status
      const healthRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/health`);
      if (healthRes.ok) setHealth(await healthRes.json());
    } catch (e) {
      console.error('Failed to fetch dashboard data', e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const pendingCount = stats ? (stats.totalReels - stats.published - stats.failed - stats.scheduled) : 0;
  const serviceStatus = [
    { name: 'API Server', status: health ? 'ONLINE' : 'OFFLINE', color: health ? 'bg-green-500' : 'bg-red-500' },
    { name: 'Redis Queue', status: health?.redis ? 'ONLINE' : (health ? 'OFFLINE' : 'CHECKING'), color: health?.redis ? 'bg-green-500' : (health ? 'bg-red-500' : 'bg-yellow-500') },
    { name: 'PostgreSQL DB', status: health?.db ? 'ONLINE' : (health ? 'OFFLINE' : 'CHECKING'), color: health?.db ? 'bg-green-500' : (health ? 'bg-red-500' : 'bg-yellow-500') },
    { name: 'Downloader API', status: health?.downloader ? 'ONLINE' : (health ? 'OFFLINE' : 'CHECKING'), color: health?.downloader ? 'bg-green-500' : (health ? 'bg-red-500' : 'bg-yellow-500') },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your Instagram automation pipeline.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <ListVideo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalReels || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime processed</p>
          </CardContent>
        </Card>
        
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending / Processing</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount > 0 ? pendingCount : 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently in queue</p>
          </CardContent>
        </Card>
        
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.published || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully posted</p>
          </CardContent>
        </Card>
        
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.failed || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Real-time health of background services.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {serviceStatus.map((service) => (
                <div key={service.name} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${service.color}`}></span>
                    <span className="text-xs text-muted-foreground font-mono">{service.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest items from the content queue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentReels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <ListVideo className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">No recent activity</p>
                  <p className="text-xs">Queue is currently empty</p>
                </div>
              ) : (
                recentReels.map((reel) => (
                   <div key={reel.id} className="flex flex-col border-b border-border/50 pb-3 last:border-0 last:pb-0">
                     <span className="font-medium text-sm truncate">{reel.title || reel.sourceUrl}</span>
                     <div className="flex items-center justify-between mt-1">
                       <span className="text-xs font-mono text-muted-foreground">{reel.status}</span>
                       <span className="text-xs text-muted-foreground">{new Date(reel.createdAt).toLocaleTimeString()}</span>
                     </div>
                   </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw, BarChart3, Users, Heart, Video } from 'lucide-react';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analytics`);
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your system's performance and Instagram reach.
          </p>
        </div>
        <Button variant="outline" onClick={fetchStats}><RotateCcw className="mr-2 w-4 h-4" /> Refresh</Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Processed</CardTitle>
                <Video className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalReels || 0}</div>
                <p className="text-xs text-muted-foreground">Reels in system</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Published Success</CardTitle>
                <BarChart3 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{stats?.published || 0}</div>
                <p className="text-xs text-muted-foreground">Successfully posted</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Est. Total Reach</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">{stats?.totalReach?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">Aggregated across posts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Est. Total Likes</CardTitle>
                <Heart className="h-4 w-4 text-pink-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-pink-500">{stats?.totalLikes?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">Aggregated across posts</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>System Health</CardTitle>
              <CardDescription>Current state of your automation pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                   <div>
                     <p className="font-medium">Scheduled Posts</p>
                     <p className="text-sm text-muted-foreground">Waiting to be published</p>
                   </div>
                   <div className="text-xl font-bold">{stats?.scheduled || 0}</div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-red-500/10 border-red-500/20">
                   <div>
                     <p className="font-medium text-red-500">Failed Processing</p>
                     <p className="text-sm text-red-500/80">Require manual attention</p>
                   </div>
                   <div className="text-xl font-bold text-red-500">{stats?.failed || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

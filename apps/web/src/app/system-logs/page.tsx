'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw, Terminal } from 'lucide-react';

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/logs`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000); // 10s polling
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const getLogColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-500';
      case 'WARNING': return 'text-yellow-500';
      case 'SUCCESS': return 'text-green-500';
      case 'DEBUG': return 'text-gray-500';
      default: return 'text-blue-400'; // INFO
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Logs</h1>
          <p className="text-muted-foreground mt-1">
            Real-time backend worker logs.
          </p>
        </div>
        <Button variant="outline" onClick={fetchLogs}><RotateCcw className="mr-2 w-4 h-4" /> Refresh</Button>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 bg-black text-gray-300 border-gray-800">
        <CardHeader className="shrink-0 border-b border-gray-800 pb-4">
          <CardTitle className="text-gray-100 flex items-center gap-2">
            <Terminal size={18} /> Application Terminal Output
          </CardTitle>
          <CardDescription className="text-gray-500">
            Fetching last 100 entries from the database log table.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-4 font-mono text-xs sm:text-sm">
          {loading && logs.length === 0 ? (
            <div className="text-gray-500 animate-pulse">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-gray-500">No logs found in the database yet.</div>
          ) : (
            <div className="space-y-1">
              {[...logs].reverse().map((log) => (
                <div key={log.id} className="flex gap-4 hover:bg-white/5 p-1 rounded transition-colors">
                  <span className="text-gray-500 shrink-0">
                    {new Date(log.createdAt).toISOString().replace('T', ' ').substring(0, 19)}
                  </span>
                  <span className={`shrink-0 w-16 font-semibold ${getLogColor(log.level)}`}>
                    [{log.level}]
                  </span>
                  <span className="text-blue-300 shrink-0 w-32 truncate" title={log.component}>
                    {log.component}
                  </span>
                  <span className="text-gray-300 whitespace-pre-wrap break-all">
                    {log.message}
                    {log.errorMessage && <div className="text-red-400 mt-1">{log.errorMessage}</div>}
                  </span>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

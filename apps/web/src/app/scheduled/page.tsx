'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Calendar as CalendarIcon, RotateCcw, Trash2 } from 'lucide-react';

export default function ScheduledPage() {
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReels = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reels?status=SCHEDULED`);
      const data = await res.json();
      setReels(data.reels || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReels();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled reel?')) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reels/${id}`, { method: 'DELETE' });
      fetchReels();
    } catch (e) {
      alert('Failed to delete');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scheduled</h1>
          <p className="text-muted-foreground mt-1">
            Reels waiting to be published at a later time.
          </p>
        </div>
        <Button variant="outline" onClick={fetchReels}><RotateCcw className="mr-2 w-4 h-4" /> Refresh</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Posts</CardTitle>
          <CardDescription>
            These posts are fully processed and waiting in the queue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reel</TableHead>
                  <TableHead>Scheduled Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : reels.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No scheduled reels.</TableCell></TableRow>
                ) : (
                  reels.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium max-w-[400px] truncate">{item.title || item.caption?.shortTitle || 'Untitled'}</span>
                          <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center mt-1 w-fit">
                            Source URL <ExternalLink className="ml-1 w-3 h-3" />
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center w-fit gap-1"><CalendarIcon size={12} /> {item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : 'TBD'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ExternalLink, RotateCcw, AlertCircle, Trash2 } from 'lucide-react';

export default function FailedPage() {
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReels = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reels?status=FAILED`);
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

  const handleRetry = async (id: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reels/${id}/retry`, { method: 'POST' });
      alert('Requeued for processing!');
      fetchReels();
    } catch (e) {
      alert('Failed to retry');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this failed reel?')) return;
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
          <h1 className="text-3xl font-bold tracking-tight">Failed</h1>
          <p className="text-muted-foreground mt-1">
            Reels that encountered errors during downloading, processing, or publishing.
          </p>
        </div>
        <Button variant="outline" onClick={fetchReels}><RotateCcw className="mr-2 w-4 h-4" /> Refresh</Button>
      </div>

      <Card className="border-red-500/20">
        <CardHeader>
          <CardTitle className="text-red-500 flex items-center gap-2"><AlertCircle size={20}/> Error Log</CardTitle>
          <CardDescription>
            Review the errors and retry processing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reel</TableHead>
                  <TableHead>Error Message</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : reels.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No failed reels. Everything is running smoothly!</TableCell></TableRow>
                ) : (
                  reels.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium max-w-[300px] truncate">{item.title || item.sourceUrl}</span>
                          <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center mt-1 w-fit">
                            Source URL <ExternalLink className="ml-1 w-3 h-3" />
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-red-500/80 bg-red-500/10 p-2 rounded max-w-[400px] whitespace-pre-wrap">
                           {item.errorMessage || 'Unknown error occurred.'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                           <Button size="sm" variant="outline" onClick={() => handleRetry(item.id)}>
                             <RotateCcw className="mr-2 w-4 h-4" /> Retry
                           </Button>
                           <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => handleDelete(item.id)}>
                             <Trash2 className="w-4 h-4" />
                           </Button>
                        </div>
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

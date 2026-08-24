'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ExternalLink, RotateCcw, CheckCircle2 } from 'lucide-react';

export default function PublishedPage() {
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReels = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reels?status=PUBLISHED`);
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Published</h1>
          <p className="text-muted-foreground mt-1">
            History of all successfully published reels.
          </p>
        </div>
        <Button variant="outline" onClick={fetchReels}><RotateCcw className="mr-2 w-4 h-4" /> Refresh</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Published Posts</CardTitle>
          <CardDescription>
            Reels that have been successfully posted to your Instagram account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reel</TableHead>
                  <TableHead>IG Media ID</TableHead>
                  <TableHead>Published Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : reels.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No published reels yet.</TableCell></TableRow>
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
                        <div className="flex items-center text-sm font-mono text-muted-foreground">
                           <CheckCircle2 size={14} className="text-green-500 mr-2" />
                           {item.instagramMediaId || 'Unknown'}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {item.publishedAt ? new Date(item.publishedAt).toLocaleString() : 'N/A'}
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

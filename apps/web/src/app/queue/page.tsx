'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, RotateCcw, Send, Trash2, ChevronDown, ChevronRight, Music, Video, Cloud, CheckCircle2, AlertTriangle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function QualityBadge({ value, label }: { value: string | number | boolean | null | undefined; label: string }) {
  if (value === null || value === undefined || value === '') return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className="text-xs font-mono">
      <span className="text-muted-foreground mr-1">{label}</span>
      <span className="text-foreground">{String(value)}</span>
    </span>
  );
}

function QualityDashboard({ video }: { video: any }) {
  if (!video) return null;

  const sourceRes = video.sourceWidth && video.sourceHeight ? `${video.sourceWidth}×${video.sourceHeight}` : null;
  const outputRes = video.width && video.height ? `${video.width}×${video.height}` : null;
  const resolutionDecreased = video.sourceWidth && video.width && video.width < video.sourceWidth;
  const audioPresent = !!video.audioCodec;
  const sourceHadAudio = video.sourceHasAudio;
  const audioLost = sourceHadAudio && !audioPresent;
  const cloudinaryUploaded = !!video.cloudinaryPublicId;
  const qualityPreserved = !resolutionDecreased && !audioLost;

  return (
    <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border/50 space-y-3 text-xs">
      <div className="font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <Video size={12} /> Video Quality
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Source */}
        <div className="space-y-1">
          <div className="text-muted-foreground font-medium">Source</div>
          <div className="font-mono text-foreground">{sourceRes || '—'}</div>
          <div className="text-muted-foreground">{video.sourceFps ? `${Math.round(video.sourceFps)} FPS` : '—'}</div>
          <div className="text-muted-foreground">{video.sourceCodec?.toUpperCase() || '—'}</div>
          {video.sourceAudioCodec && (
            <div className="flex items-center gap-1 text-green-400">
              <Music size={10} /> {video.sourceAudioCodec.toUpperCase()}
            </div>
          )}
          {video.sourceHasAudio === false && <div className="text-muted-foreground">No audio</div>}
        </div>

        {/* Processed */}
        <div className="space-y-1">
          <div className="text-muted-foreground font-medium">Processed</div>
          {outputRes ? (
            <>
              <div className={`font-mono ${resolutionDecreased ? 'text-amber-400' : 'text-foreground'}`}>
                {outputRes} {resolutionDecreased && '⚠'}
              </div>
              <div className="text-muted-foreground">{video.fps ? `${Math.round(video.fps)} FPS` : '—'}</div>
              <div className="text-muted-foreground">{video.codec?.toUpperCase() || '—'}</div>
              {audioPresent ? (
                <div className="flex items-center gap-1 text-green-400">
                  <Music size={10} /> {video.audioCodec?.toUpperCase()} {video.audioChannels ? `${video.audioChannels}ch` : ''}
                </div>
              ) : sourceHadAudio ? (
                <div className="text-red-400 font-semibold">❌ Audio lost!</div>
              ) : (
                <div className="text-muted-foreground">No audio</div>
              )}
            </>
          ) : (
            <div className="text-muted-foreground">Pending...</div>
          )}
        </div>
      </div>

      {/* Status Row */}
      <div className="flex flex-wrap gap-3 pt-1 border-t border-border/30">
        {outputRes && (
          <div className={`flex items-center gap-1 ${qualityPreserved ? 'text-green-400' : 'text-amber-400'}`}>
            {qualityPreserved ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
            {qualityPreserved ? 'Quality Preserved' : 'Quality Changed'}
          </div>
        )}
        <div className={`flex items-center gap-1 ${audioPresent ? 'text-green-400' : audioLost ? 'text-red-400' : 'text-muted-foreground'}`}>
          <Music size={12} />
          {audioLost ? 'Audio Lost' : audioPresent ? 'Audio OK' : 'No Audio'}
        </div>
        <div className={`flex items-center gap-1 ${cloudinaryUploaded ? 'text-green-400' : 'text-muted-foreground'}`}>
          <Cloud size={12} />
          {cloudinaryUploaded ? 'Cloudinary ✓' : 'Not Uploaded'}
        </div>
        {cloudinaryUploaded && video.cloudinaryBytes && (
          <span className="text-muted-foreground">
            {Math.round(Number(video.cloudinaryBytes) / 1024 / 1024 * 10) / 10} MB
          </span>
        )}
      </div>

      {resolutionDecreased && (
        <div className="flex items-center gap-1 text-amber-400 bg-amber-400/10 px-2 py-1 rounded text-xs">
          <AlertTriangle size={12} />
          Output resolution decreased from {sourceRes} to {outputRes}
        </div>
      )}
      {audioLost && (
        <div className="flex items-center gap-1 text-red-400 bg-red-400/10 px-2 py-1 rounded text-xs">
          <AlertTriangle size={12} />
          Audio was lost during processing. Publishing will be blocked.
        </div>
      )}
    </div>
  );
}

export default function QueuePage() {
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchReels = async () => {
    try {
      const res = await fetch(`${API_URL}/api/reels?status=PENDING,DOWNLOADING,DOWNLOADED,PROCESSING,PROCESSED,CAPTION_GENERATING,READY,UPLOADING,SKIPPED_DUPLICATE`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setReels(data.reels || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this reel from the queue?')) return;
    try {
      await fetch(`${API_URL}/api/reels/${id}`, { method: 'DELETE' });
      fetchReels();
    } catch (e) {
      alert('Failed to delete.');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/reels/${id}/publish`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      alert('Queued for publishing!');
      fetchReels();
    } catch (e) {
      alert('Failed to trigger publish. Check that the reel is in READY state.');
    }
  };

  const toggleExpanded = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    fetchReels();
    const interval = setInterval(fetchReels, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY': return <Badge className="bg-blue-500 text-white">Ready to Publish</Badge>;
      case 'UPLOADING': return <Badge className="bg-purple-500 text-white">Uploading</Badge>;
      case 'PROCESSING': return <Badge className="bg-yellow-500 text-white">Processing</Badge>;
      case 'DOWNLOADING': return <Badge className="bg-yellow-400 text-white">Downloading</Badge>;
      case 'CAPTION_GENERATING': return <Badge className="bg-orange-400 text-white">Generating Caption</Badge>;
      case 'DOWNLOADED': return <Badge className="bg-teal-500 text-white">Downloaded</Badge>;
      case 'PROCESSED': return <Badge className="bg-cyan-500 text-white">Processed</Badge>;
      case 'SKIPPED_DUPLICATE': return <Badge variant="outline" className="text-gray-400">Duplicate</Badge>;
      case 'FAILED': return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Queue</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track the status of your active reels pipeline.
          </p>
        </div>
        <Button variant="outline" onClick={fetchReels}>
          <RotateCcw className="mr-2 w-4 h-4" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Processing Queue</CardTitle>
          <CardDescription>
            Videos waiting to be downloaded, processed, captioned, or published. Click a row to see quality details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Reel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && reels.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : reels.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No active reels in the queue.</TableCell></TableRow>
                ) : (
                  reels.map((item) => (
                    <>
                      <TableRow
                        key={item.id}
                        className="cursor-pointer hover:bg-muted/30"
                        onClick={() => toggleExpanded(item.id)}
                      >
                        <TableCell className="text-muted-foreground">
                          {expanded.has(item.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium max-w-[350px] truncate">
                              {item.title || item.caption?.shortTitle || 'Processing...'}
                            </span>
                            <a href={item.sourceUrl} target="_blank" rel="noreferrer"
                              className="text-xs text-blue-500 hover:underline flex items-center mt-1 w-fit"
                              onClick={e => e.stopPropagation()}>
                              Source URL <ExternalLink className="ml-1 w-3 h-3" />
                            </a>
                          </div>
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          {getStatusBadge(item.status)}
                          {item.attempts > 0 && <span className="ml-2 text-xs text-muted-foreground">(Attempt {item.attempts})</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm" onClick={e => e.stopPropagation()}>
                          {new Date(item.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            {item.status === 'READY' && (
                              <Button size="sm" variant="default" onClick={() => handlePublish(item.id)}
                                className="bg-green-600 hover:bg-green-700 text-white">
                                <Send className="w-3 h-3 mr-1" /> Publish
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                              onClick={() => handleDelete(item.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expanded.has(item.id) && item.video && (
                        <TableRow key={`${item.id}-quality`} className="bg-muted/10 hover:bg-muted/10">
                          <TableCell colSpan={5} className="py-0 px-6 pb-4">
                            <QualityDashboard video={item.video} />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
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

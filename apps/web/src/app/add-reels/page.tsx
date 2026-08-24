'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, ListPlus } from 'lucide-react';

const isValidReelUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes('instagram.com') && (parsed.pathname.includes('/reel/') || parsed.pathname.includes('/reels/'));
  } catch {
    return false;
  }
};
export default function AddReelsPage() {
  const [urlsText, setUrlsText] = useState('');
  const [postingMode, setPostingMode] = useState('IMMEDIATELY');
  const [validation, setValidation] = useState<{ valid: string[]; invalid: string[] } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateUrls = () => {
    const rawUrls = urlsText.split('\n').map((u) => u.trim()).filter(Boolean);
    const valid: string[] = [];
    const invalid: string[] = [];

    rawUrls.forEach((url) => {
      if (isValidReelUrl(url)) {
        valid.push(url);
      } else {
        invalid.push(url);
      }
    });

    setValidation({ valid, invalid });
  };

  const handleAddReels = async () => {
    if (!validation?.valid.length) return;
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: validation.valid, postingMode })
      });
      
      if (!response.ok) {
        throw new Error('API Request Failed');
      }

      const result = await response.json();
      
      setUrlsText('');
      setValidation(null);
      const parts = [
        result.addedCount ? `${result.addedCount} added` : null,
        result.requeuedCount ? `${result.requeuedCount} requeued` : null,
        result.publishQueuedCount ? `${result.publishQueuedCount} queued to publish` : null,
        result.skippedCount ? `${result.skippedCount} already active` : null,
      ].filter(Boolean);
      alert(parts.length ? parts.join(', ') : 'No new reels were queued.');
    } catch (error) {
      console.error('Failed to add reels', error);
      alert('Failed to add reels.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add Reels</h1>
        <p className="text-muted-foreground mt-1">
          Paste Instagram Reel URLs to add them to your processing queue.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Source URLs</CardTitle>
          <CardDescription>
            Enter one Instagram Reel URL per line. Make sure the reels are public or authorized.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea 
            placeholder="https://www.instagram.com/reel/ABC1234/&#10;https://www.instagram.com/reel/DEF5678/"
            className="min-h-[200px] resize-y font-mono text-sm"
            value={urlsText}
            onChange={(e) => {
              setUrlsText(e.target.value);
              setValidation(null);
            }}
          />

          {validation && (
            <div className="flex gap-4 text-sm mt-4 p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 size={18} />
                <span className="font-semibold">{validation.valid.length} Valid</span>
              </div>
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle size={18} />
                <span className="font-semibold">{validation.invalid.length} Invalid</span>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t border-border pt-6">
          <Button variant="outline" onClick={validateUrls} disabled={!urlsText.trim()}>
            Validate URLs
          </Button>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="postingMode" className="text-muted-foreground whitespace-nowrap">Mode:</Label>
              <Select value={postingMode} onValueChange={(val) => setPostingMode(val || 'MANUAL')}>
                <SelectTrigger id="postingMode" className="w-[180px]">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manual Approval</SelectItem>
                  <SelectItem value="SCHEDULED">Schedule Automatically</SelectItem>
                  <SelectItem value="IMMEDIATELY">Publish Immediately</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleAddReels} 
              disabled={!validation || validation.valid.length === 0 || isSubmitting}
            >
              <ListPlus className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Adding...' : 'Add to Queue'}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

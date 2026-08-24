'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { RotateCcw, CheckCircle2, AlertTriangle, ExternalLink, XCircle, User } from 'lucide-react';

type InstagramSettings = {
  isConnected: boolean;
  tokenValid: boolean;
  source: 'database' | 'env' | 'none';
  instagramUserId: string | null;
  username: string | null;
  profilePicture: string | null;
  profileTokenValid?: boolean;
  publishingTokenValid?: boolean;
  tokenError?: string | null;
};

export default function InstagramSettingsPage() {
  const [settings, setSettings] = useState<InstagramSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings/instagram`);
      const data = await res.json();
      setSettings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const testConnection = async () => {
    setTesting(true);
    setTestMessage(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings/instagram/test`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Instagram authentication failed');
      }
      setTestMessage(`Connected as @${data.username}`);
      await fetchSettings();
    } catch (error: any) {
      setTestMessage(error.message || 'Instagram authentication failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Instagram Connection</h1>
          <p className="text-muted-foreground mt-1">
            Manage your Meta Graph API connection.
          </p>
        </div>
        <Button variant="outline" onClick={fetchSettings} disabled={loading}>
          <RotateCcw className={`mr-2 w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
          <CardDescription>
            The account ReelFlow will use to publish your automated reels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-muted-foreground flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
              Verifying connection with Instagram...
            </div>
          ) : settings?.isConnected && settings?.tokenValid ? (
            <div className="space-y-6">
              {/* Connected Banner */}
              <div className="flex items-center gap-4 p-4 border border-green-500/20 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg text-green-500">Successfully Connected</h3>
                  <p className="text-sm text-green-500/80">
                    Publishing token verified live with Meta Graph API · Configured via <strong>{settings.source === 'env' ? '.env file' : 'Database'}</strong>
                  </p>
                </div>
              </div>

              {/* Profile Card */}
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border">
                {settings.profilePicture ? (
                  <img
                    src={settings.profilePicture}
                    alt={settings.username || 'Instagram'}
                    className="w-16 h-16 rounded-full object-cover border-2 border-green-500/40"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                    <User className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="text-xl font-bold">@{settings.username}</p>
                  <p className="text-sm text-muted-foreground">Instagram User ID: {settings.instagramUserId}</p>
                </div>
              </div>

              {/* Details Table */}
              <div className="space-y-1 rounded-lg border border-border overflow-hidden">
                <div className="grid grid-cols-3 p-3 border-b text-sm bg-muted/20">
                  <span className="text-muted-foreground font-medium">Username</span>
                  <span className="col-span-2 font-mono font-semibold">@{settings.username}</span>
                </div>
                <div className="grid grid-cols-3 p-3 border-b text-sm">
                  <span className="text-muted-foreground font-medium">User ID</span>
                  <span className="col-span-2 font-mono">{settings.instagramUserId || '—'}</span>
                </div>
                <div className="grid grid-cols-3 p-3 text-sm">
                  <span className="text-muted-foreground font-medium">Token Source</span>
                  <span className="col-span-2 capitalize">{settings.source === 'env' ? '.env file' : 'Database'}</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                To switch accounts, update the <code className="bg-muted px-1 rounded">INSTAGRAM_ACCESS_TOKEN</code> in your <code className="bg-muted px-1 rounded">.env</code> file and restart the server.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={testConnection} disabled={testing}>
                  {testing ? 'Testing...' : 'Test Instagram Connection'}
                </Button>
                <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", className: "w-fit" })}>
                  Reconnect Instagram <ExternalLink className="ml-2 w-4 h-4" />
                </a>
              </div>
              {testMessage && <p className="text-sm text-muted-foreground">{testMessage}</p>}
            </div>
          ) : settings?.isConnected && !settings?.tokenValid ? (
            // Token set but invalid / expired
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 border border-red-500/20 bg-red-500/10 rounded-lg">
                <XCircle className="w-8 h-8 text-red-500 shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg text-red-500">Token Expired or Invalid</h3>
                  <p className="text-sm text-red-500/80">
                    An access token is set, but Meta rejected it for publishing. Please use a token that works with the Instagram Graph publishing API.
                  </p>
                  {settings.tokenError && (
                    <p className="text-xs text-red-500/70 mt-1 font-mono">{settings.tokenError}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={testConnection} disabled={testing}>
                  {testing ? 'Testing...' : 'Test Instagram Connection'}
                </Button>
                <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", className: "w-fit" })}>
                  Reconnect Instagram <ExternalLink className="ml-2 w-4 h-4" />
                </a>
              </div>
              {testMessage && <p className="text-sm text-muted-foreground">{testMessage}</p>}
            </div>
          ) : (
            // Not connected at all
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 border border-yellow-500/20 bg-yellow-500/10 rounded-lg">
                <AlertTriangle className="w-8 h-8 text-yellow-500 shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg text-yellow-500">Not Connected</h3>
                  <p className="text-sm text-yellow-500/80">
                    ReelFlow cannot publish videos without a valid Meta API token.
                  </p>
                </div>
              </div>
              <p className="text-sm">
                Please open your <code className="bg-muted px-1 rounded">.env</code> file and set:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground ml-2">
                <li><code className="text-foreground">INSTAGRAM_APP_ID</code></li>
                <li><code className="text-foreground">INSTAGRAM_ACCESS_TOKEN</code></li>
              </ul>
              <div className="flex gap-3">
                <Button variant="outline" onClick={testConnection} disabled={testing}>
                  {testing ? 'Testing...' : 'Test Instagram Connection'}
                </Button>
                <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", className: "w-fit" })}>
                  Reconnect Instagram <ExternalLink className="ml-2 w-4 h-4" />
                </a>
              </div>
              {testMessage && <p className="text-sm text-muted-foreground">{testMessage}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Key } from 'lucide-react';

export default function SettingsPage() {
  const [aiApiKey, setAiApiKey] = useState('');
  const [cloudinary, setCloudinary] = useState({
    cloudName: '',
    apiKey: '',
    apiSecret: '',
    apiSecretSet: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCloudinary, setSavingCloudinary] = useState(false);
  const [message, setMessage] = useState('');
  const [cloudinaryMessage, setCloudinaryMessage] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings`);
        if (res.ok) {
          const data = await res.json();
          // We don't return the full key for security if it's from env, but if they set it in DB we show a masked version or empty to let them overwrite
          setAiApiKey(data.aiApiKeySet ? '*****************' : '');
          setCloudinary({
            cloudName: data.cloudinary?.cloudName || '',
            apiKey: data.cloudinary?.apiKey || '',
            apiSecret: data.cloudinary?.apiSecretSet ? '*****************' : '',
            apiSecretSet: !!data.cloudinary?.apiSecretSet,
          });
        }
      } catch (e) {} finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'AI_API_KEY', value: aiApiKey })
      });
      if (res.ok) {
        setMessage('Settings saved successfully!');
        setAiApiKey('*****************');
      } else {
        setMessage('Failed to save settings.');
      }
    } catch (e) {
      setMessage('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleCloudinarySave = async () => {
    setSavingCloudinary(true);
    setCloudinaryMessage('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings/cloudinary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cloudinary)
      });
      if (res.ok) {
        setCloudinaryMessage('Cloudinary settings saved successfully!');
        setCloudinary((current) => ({
          ...current,
          apiSecret: current.apiSecret && !current.apiSecret.includes('*') ? '*****************' : current.apiSecret,
          apiSecretSet: true,
        }));
      } else {
        setCloudinaryMessage('Failed to save Cloudinary settings.');
      }
    } catch (e) {
      setCloudinaryMessage('Failed to save Cloudinary settings.');
    } finally {
      setSavingCloudinary(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage application-wide configurations and API keys.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5"/> AI Configuration</CardTitle>
          <CardDescription>
            Update your Gemini API key used for generating Instagram captions. 
            If you hit rate limits or your token expires, you can replace it here without restarting the system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="gemini-key">Gemini AI API Key</Label>
              <Input 
                id="gemini-key" 
                type="password" 
                placeholder="AIzaSy..." 
                value={aiApiKey}
                onChange={(e) => setAiApiKey(e.target.value)}
                onFocus={() => { if (aiApiKey === '*****************') setAiApiKey(''); }}
              />
              <p className="text-xs text-muted-foreground">
                Keys saved here will override the <code className="bg-muted px-1 rounded">AI_API_KEY</code> set in your <code className="bg-muted px-1 rounded">.env</code> file.
              </p>
            </div>
          )}
          {message && <div className={`text-sm ${message.includes('success') ? 'text-green-500' : 'text-red-500'}`}>{message}</div>}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={saving || !aiApiKey || aiApiKey === '*****************'}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5"/> Cloudinary Configuration</CardTitle>
          <CardDescription>
            Cloudinary hosts processed videos at public HTTPS URLs before Instagram publishing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="cloudinary-cloud">Cloud Name</Label>
                <Input
                  id="cloudinary-cloud"
                  placeholder="your-cloud-name"
                  value={cloudinary.cloudName}
                  onChange={(e) => setCloudinary((current) => ({ ...current, cloudName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cloudinary-key">API Key</Label>
                <Input
                  id="cloudinary-key"
                  placeholder="1234567890"
                  value={cloudinary.apiKey}
                  onChange={(e) => setCloudinary((current) => ({ ...current, apiKey: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cloudinary-secret">API Secret</Label>
                <Input
                  id="cloudinary-secret"
                  type="password"
                  placeholder="Cloudinary API secret"
                  value={cloudinary.apiSecret}
                  onChange={(e) => setCloudinary((current) => ({ ...current, apiSecret: e.target.value }))}
                  onFocus={() => {
                    if (cloudinary.apiSecret === '*****************') {
                      setCloudinary((current) => ({ ...current, apiSecret: '' }));
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  The API secret is never returned to the browser. Saving a new value overrides the previous one.
                </p>
              </div>
            </>
          )}
          {cloudinaryMessage && <div className={`text-sm ${cloudinaryMessage.includes('success') ? 'text-green-500' : 'text-red-500'}`}>{cloudinaryMessage}</div>}
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleCloudinarySave}
            disabled={savingCloudinary || !cloudinary.cloudName || !cloudinary.apiKey || !cloudinary.apiSecret || cloudinary.apiSecret === '*****************'}
          >
            <Save className="w-4 h-4 mr-2" />
            {savingCloudinary ? 'Saving...' : 'Save Cloudinary'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

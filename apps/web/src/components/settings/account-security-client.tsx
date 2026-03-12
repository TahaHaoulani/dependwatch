'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Shield, Copy, Check } from 'lucide-react';

export function AccountSecurityClient() {
  const { toast } = useToast();
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const [enrollStep, setEnrollStep] = useState<'idle' | 'qr' | 'verify' | 'backup'>('idle');
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/account/mfa/status')
      .then((r) => r.json())
      .then((d) => setMfaEnabled(d.enabled === true))
      .catch(() => setMfaEnabled(false));
  }, []);

  const startEnroll = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/account/mfa/enroll/start', { method: 'POST' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? 'Failed');
      setOtpauthUrl(d.otpauthUrl);
      setEnrollStep('qr');
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Could not start enrollment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyEnroll = async () => {
    if (!/^\d{6}$/.test(verifyCode)) {
      toast({ title: 'Enter a 6-digit code', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/account/mfa/enroll/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? 'Invalid code');
      setBackupCodes(d.backupCodes ?? []);
      setEnrollStep('backup');
      setMfaEnabled(true);
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Invalid code',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const disableMfa = async () => {
    const code = disableCode.trim().replace(/\s/g, '');
    if (!code) {
      toast({ title: 'Enter your 6-digit code or a backup code', variant: 'destructive' });
      return;
    }
    setDisabling(true);
    try {
      const res = await fetch('/api/account/mfa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? 'Failed');
      setMfaEnabled(false);
      setDisableCode('');
      toast({ title: 'MFA disabled' });
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Could not disable MFA',
        variant: 'destructive',
      });
    } finally {
      setDisabling(false);
    }
  };

  const copyBackupCodes = () => {
    if (!backupCodes) return;
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    toast({ title: 'Backup codes copied' });
    setTimeout(() => setCopied(false), 2000);
  };

  if (mfaEnabled === null) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-factor authentication (MFA)
          </CardTitle>
          <CardDescription>
            Add an authenticator app (Google Authenticator, Authy, etc.) to require a 6-digit code when signing in. You will get backup codes to use if you lose access to the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mfaEnabled ? (
            <div>
              <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-2">MFA is enabled.</p>
              <p className="text-sm text-muted-foreground mb-3">
                To disable MFA, enter a current 6-digit code from your app or one of your backup codes.
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Code"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  className="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                />
                <Button variant="destructive" onClick={disableMfa} disabled={disabling}>
                  {disabling ? 'Disabling…' : 'Disable MFA'}
                </Button>
              </div>
            </div>
          ) : (
            <div>
              {enrollStep === 'idle' && (
                <Button onClick={startEnroll} disabled={loading}>
                  {loading ? 'Starting…' : 'Enable MFA'}
                </Button>
              )}
              {enrollStep === 'qr' && otpauthUrl && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Scan this QR code with your authenticator app, then enter the 6-digit code below.
                  </p>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`}
                    alt="QR code for authenticator"
                    className="border border-border rounded"
                    width={200}
                    height={200}
                  />
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                      className="flex h-9 w-28 rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono"
                    />
                    <Button onClick={verifyEnroll} disabled={loading || verifyCode.length !== 6}>
                      {loading ? 'Verifying…' : 'Verify and enable'}
                    </Button>
                    <Button variant="ghost" onClick={() => { setEnrollStep('idle'); setOtpauthUrl(null); setVerifyCode(''); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={enrollStep === 'backup' && backupCodes !== null} onOpenChange={(open) => !open && setEnrollStep('idle')}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save your backup codes</DialogTitle>
            <DialogDescription>
              Each code can be used once if you lose access to your authenticator app. Store them somewhere safe.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-muted/50 p-4 font-mono text-sm space-y-1">
            {backupCodes?.map((c, i) => (
              <div key={i}>{c}</div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={copyBackupCodes}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              Copy
            </Button>
            <Button onClick={() => { setEnrollStep('idle'); setBackupCodes(null); setOtpauthUrl(null); setVerifyCode(''); }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

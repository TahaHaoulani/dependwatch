'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, Copy, ArrowUpRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type DigestCapabilities = {
  digestDelivery: boolean;
  planName: string;
};

export function ProjectDigestPreviewClient({
  projectId,
  workspaceId,
  capabilities,
}: {
  projectId: string;
  workspaceId: string;
  capabilities: DigestCapabilities;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ textBody: string; note?: string } | null>(null);

  const fetchPreview = async () => {
    setLoading(true);
    setPreview(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/digest/preview?range=7d`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setPreview({ textBody: data.textBody ?? '', note: data.note });
    } catch {
      toast({ title: 'Could not load digest preview', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!preview?.textBody) return;
    navigator.clipboard.writeText(preview.textBody);
    toast({ title: 'Digest copied to clipboard' });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Digest (preview & delivery)
        </CardTitle>
        <CardDescription className="mt-1">
          <strong>Preview</strong> (below) shows digest content from your project data — top cost driver, error rate, slowest operation, recent failures. It is not sent anywhere. <strong>Delivery</strong> sends that content to your enabled Slack webhooks when you call the deliver endpoint (e.g. from a cron job).
        </CardDescription>
        {capabilities.digestDelivery && (
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <p>Use the <strong>Automated schedule</strong> section below to send the digest daily or weekly to your <strong>enabled</strong> Slack webhooks. You can also call <code className="rounded bg-muted px-1">POST /api/projects/{projectId}/digest/deliver?range=7d</code> manually (authenticated).</p>
          </div>
        )}
        {!capabilities.digestDelivery && (
          <div className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <p>Scheduled digests are available on the Pro plan.</p>
            <Link
              href={`/dashboard/${workspaceId}/billing`}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-foreground underline hover:no-underline"
            >
              Upgrade to Pro <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <Button variant="outline" size="sm" onClick={fetchPreview} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <FileText className="h-3.5 w-3.5 mr-1.5" />}
          Generate preview (7d)
        </Button>
        {preview && (
          <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
            <pre className="whitespace-pre-wrap font-sans text-muted-foreground overflow-x-auto max-h-64 overflow-y-auto">
              {preview.textBody}
            </pre>
            <div className="flex items-center gap-2 mt-2">
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={copyToClipboard}>
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copy to clipboard
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Preview only — not sent. Use the deliver endpoint (cron) to send this to Slack.</p>
            {preview.note && (
              <p className="text-xs text-muted-foreground mt-1">{preview.note}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

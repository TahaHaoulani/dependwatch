'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, BookOpen, Settings } from 'lucide-react';

export function ConnectCodingAssistantCard({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const mcpHref = `/dashboard/${workspaceId}/${projectId}/mcp`;
  return (
    <Card className="border-border/60 bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Connect your coding assistant</CardTitle>
            <CardDescription className="text-sm">
              Use DependWatch from Cursor or Claude Code — search docs, list projects, send test events.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button asChild size="sm" className="gap-1.5">
          <Link href={mcpHref}>
            <Settings className="h-4 w-4" />
            Set up connection
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/docs">
            <BookOpen className="h-4 w-4" />
            View docs
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

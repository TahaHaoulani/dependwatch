'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';

export function WorkspaceDangerClient({
  workspaceId,
  workspaceName,
  isOwner,
}: {
  workspaceId: string;
  workspaceName: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmName !== workspaceName) {
      toast({
        title: 'Name does not match',
        description: 'Type the workspace name exactly to confirm.',
        variant: 'destructive',
      });
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed to delete');
      }
      toast({ title: 'Workspace deleted' });
      router.push('/onboarding');
      router.refresh();
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to delete workspace',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="border-l-4 border-l-destructive/80 bg-destructive/5 dark:bg-destructive/10">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          Delete workspace
        </CardTitle>
        <CardDescription className="mt-1.5 leading-relaxed">
          Permanently delete this workspace and all its projects, events, and data. This action cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {isOwner ? (
          <>
            <Button variant="destructive" onClick={() => setOpen(true)}>
              Delete workspace
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Delete workspace?</DialogTitle>
                  <DialogDescription className="leading-relaxed">
                    This will permanently delete <strong className="text-foreground">{workspaceName}</strong> and all projects, events, and data. Type the workspace name below to confirm.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 py-4">
                  <Label htmlFor="confirm-name" className="text-sm font-medium">Workspace name</Label>
                  <Input
                    id="confirm-name"
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    placeholder={workspaceName}
                    className="font-mono"
                    autoComplete="off"
                  />
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    loading={deleting}
                    onClick={handleDelete}
                    disabled={confirmName !== workspaceName}
                  >
                    {deleting ? 'Deleting…' : 'Delete forever'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Only the workspace owner can delete this workspace.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

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

export function ProjectDangerClient({
  workspaceId,
  projectId,
  projectName,
  canDelete,
}: {
  workspaceId: string;
  projectId: string;
  projectName: string;
  canDelete: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmName !== projectName) {
      toast({
        title: 'Name does not match',
        description: 'Type the project name exactly to confirm.',
        variant: 'destructive',
      });
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed to delete');
      }
      toast({ title: 'Project deleted' });
      router.push(`/dashboard/${workspaceId}`);
      router.refresh();
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to delete project',
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
          Delete project
        </CardTitle>
        <CardDescription className="mt-1.5 leading-relaxed">
          Permanently delete this project and all its events and data. Ingest API keys will stop working. This action cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {canDelete ? (
          <>
            <Button variant="destructive" onClick={() => setOpen(true)}>
              Delete project
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Delete project?</DialogTitle>
                  <DialogDescription className="leading-relaxed">
                    This will permanently delete <strong className="text-foreground">{projectName}</strong> and all events and data. Type the project name below to confirm.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 py-4">
                  <Label htmlFor="confirm-name" className="text-sm font-medium">Project name</Label>
                  <Input
                    id="confirm-name"
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    placeholder={projectName}
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
                    disabled={confirmName !== projectName}
                  >
                    {deleting ? 'Deleting…' : 'Delete forever'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Only workspace owners and admins can delete projects.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

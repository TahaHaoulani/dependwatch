import { auth } from '@/lib/auth-server';
import { getProjectById } from '@/lib/project';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/db';

export default async function ProjectDependencyControlsPage({
  params,
}: {
  params: Promise<{ workspaceId: string; projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { workspaceId, projectId } = await params;
  const project = await getProjectById(projectId, session.user.id);
  if (!project) return null;

  const policies = await prisma.apiPolicy.findMany({
    where: { projectId },
    orderBy: { type: 'asc' },
  });

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Dependency controls</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Retry, fallback, and guardrail policy configuration. Runtime enforcement is on the roadmap.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Policy configuration</CardTitle>
          <CardDescription>
            These settings define project-level policies for retries, fallbacks, and guardrails. Enforcement at runtime is planned; for now they are stored as configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {policies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No policies configured. Policy UI and runtime enforcement will be added in a future release.
            </p>
          ) : (
            <ul className="space-y-2">
              {policies.map((p) => (
                <li key={p.id} className="rounded-md border border-border px-3 py-2">
                  <span className="font-medium">{p.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">({p.type})</span>
                  {!p.enabled && <span className="ml-2 text-xs text-muted-foreground">Disabled</span>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

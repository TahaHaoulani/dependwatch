import { NextResponse } from 'next/server';
import { getIncidentByPublicId } from '@/lib/incident-report';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params;
  if (!publicId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const incident = await getIncidentByPublicId(publicId);
  if (!incident) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({
    id: incident.publicId,
    provider: incident.provider,
    endpoint: incident.endpoint,
    detectionType: incident.detectionType,
    message: incident.message,
    metrics: incident.metrics,
    timeline: incident.timeline,
    createdAt: incident.createdAt.toISOString(),
    projectName: incident.project.name,
  });
}

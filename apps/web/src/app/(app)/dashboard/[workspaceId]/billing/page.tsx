import { redirect } from 'next/navigation';

/**
 * Billing is shown inside Workspace settings (same layout as Members, General, etc.).
 * Redirect so direct links (e.g. Stripe return URL) land in the settings layout.
 */
export default async function BillingRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const { workspaceId } = await params;
  const { success, canceled } = await searchParams;
  const query = new URLSearchParams();
  if (success) query.set('success', success);
  if (canceled) query.set('canceled', canceled);
  const qs = query.toString();
  redirect(`/dashboard/${workspaceId}/settings/billing${qs ? `?${qs}` : ''}`);
}

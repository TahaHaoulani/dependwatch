/**
 * Logo.dev image CDN URL for company logos by domain.
 * @see https://www.logo.dev/docs
 */
export function getLogoDevUrl(domain: string, size = 128): string {
  const token = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_LOGO_DEV_PUBLISHABLE_KEY ?? '' : '';
  const params = new URLSearchParams({ size: String(size), format: 'webp' });
  if (token) params.set('token', token);
  return `https://img.logo.dev/${encodeURIComponent(domain)}?${params.toString()}`;
}

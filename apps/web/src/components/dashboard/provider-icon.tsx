'use client';

import { useState } from 'react';
import { getLogoDevUrl } from '@/lib/logo-url';
import { getProviderDomain } from '@/lib/provider-registry';

/** Capitalize provider for display (e.g. openai → OpenAI). */
export function providerDisplayName(provider: string): string {
  if (!provider) return '';
  const lower = provider.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function LetterFallback({ name, size, className }: { name: string; size: number; className?: string }) {
  return (
    <span
      className={className}
      style={{ width: size, height: size, fontSize: size * 0.65 }}
      aria-hidden
    >
      {providerDisplayName(name).slice(0, 1)}
    </span>
  );
}

export function ProviderIcon({
  name,
  size = 16,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const domain = getProviderDomain(name);

  if (imgError) {
    return <LetterFallback name={name} size={size} className={className} />;
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={getLogoDevUrl(domain, size)}
      alt=""
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: 'contain' }}
      loading="lazy"
      onError={() => setImgError(true)}
      aria-hidden
    />
  );
}

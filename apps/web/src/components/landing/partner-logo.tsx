'use client';

import { useState } from 'react';
import { getLogoDevUrl } from '@/lib/logo-url';

export function PartnerLogo({ name, domain }: { name: string; domain: string }) {
  const [error, setError] = useState(false);
  const logoSrc = getLogoDevUrl(domain, 96);

  if (error) {
    return (
      <span className="flex h-14 w-24 flex-shrink-0 items-center justify-center rounded-xl border border-border/50 bg-background/80 px-3 text-xs font-medium text-muted-foreground sm:h-16 sm:w-28 sm:text-sm">
        {name}
      </span>
    );
  }

  return (
    <a
      href={`https://${domain}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-14 w-24 flex-shrink-0 items-center justify-center rounded-xl border border-border/50 bg-background/80 p-3 transition-all hover:border-border hover:opacity-100 opacity-90 sm:h-16 sm:w-28"
      title={name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoSrc}
        alt={`${name} logo`}
        width={96}
        height={40}
        className="h-8 max-h-8 w-full max-w-[80px] object-contain object-center sm:h-10 sm:max-h-10 sm:max-w-[100px]"
        loading="eager"
        onError={() => setError(true)}
      />
    </a>
  );
}

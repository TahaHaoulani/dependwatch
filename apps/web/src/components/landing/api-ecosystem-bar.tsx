'use client';

import { useState } from 'react';
import { Globe } from 'lucide-react';
import { getLogoDevUrl } from '@/lib/logo-url';

export type ApiProvider = { name: string; domain: string };

function EcosystemLogoItem({ name, domain }: ApiProvider) {
  const [error, setError] = useState(false);
  const isGeneric = domain === 'generic';
  const logoSrc = getLogoDevUrl(domain, 256);

  const boxClass =
    'flex h-14 w-16 flex-shrink-0 items-center justify-center rounded-lg border border-border/40 bg-muted/30 px-2.5 transition-transform duration-200 hover:scale-105 hover:border-border/70 hover:bg-muted/50 sm:h-16 sm:w-[72px]';

  if (isGeneric) {
    return (
      <span className={boxClass} title={name}>
        <Globe className="h-7 w-7 text-muted-foreground sm:h-8 sm:w-8" />
      </span>
    );
  }

  if (error) {
    return (
      <span
        className={`${boxClass} text-[10px] font-medium text-muted-foreground/80 sm:text-xs`}
        title={name}
      >
        {name}
      </span>
    );
  }

  return (
    <a
      href={`https://${domain}`}
      target="_blank"
      rel="noopener noreferrer"
      className={boxClass}
      title={name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoSrc}
        alt=""
        width={64}
        height={56}
        className="h-8 max-h-8 w-full max-w-[56px] object-contain object-center opacity-90 hover:opacity-100 sm:h-9 sm:max-h-9 sm:max-w-[64px]"
        loading="lazy"
        onError={() => setError(true)}
      />
    </a>
  );
}

export interface ApiEcosystemBarProps {
  providers: ApiProvider[];
  /** Enable infinite marquee on desktop. Default true. */
  marquee?: boolean;
}

export function ApiEcosystemBar({ providers, marquee = true }: ApiEcosystemBarProps) {
  const duplicated = [...providers, ...providers];

  return (
    <div className="w-full overflow-hidden">
      {/* Desktop: marquee container with pause on hover */}
      <div
        className="group relative hidden md:block"
        style={{ maskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)' }}
      >
        <div
          className={`flex w-max gap-8 py-4 sm:gap-10 ${marquee ? 'animate-api-marquee group-hover:[animation-play-state:paused]' : ''}`}
        >
          {duplicated.map((p, i) => (
            <EcosystemLogoItem key={`${p.domain}-${i}`} name={p.name} domain={p.domain} />
          ))}
        </div>
      </div>

      {/* Mobile: single scrollable row, no animation */}
      <div className="flex gap-6 overflow-x-auto pb-2 pt-2 scrollbar-none md:hidden [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
        {providers.map((p) => (
          <EcosystemLogoItem key={p.domain} name={p.name} domain={p.domain} />
        ))}
      </div>
    </div>
  );
}

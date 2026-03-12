'use client';

import Link from 'next/link';
import { captureEvent, type AnalyticsEventName } from '@/lib/posthog';

type Props = {
  href: string;
  eventName: AnalyticsEventName;
  eventProperties?: Record<string, string | number | boolean | undefined | null>;
  children: React.ReactNode;
  className?: string;
};

/** Link that captures a single analytics event on click (before navigation). */
export function TrackedLink({ href, eventName, eventProperties, children, className }: Props) {
  return (
    <Link href={href} className={className} onClick={() => captureEvent(eventName, eventProperties)}>
      {children}
    </Link>
  );
}

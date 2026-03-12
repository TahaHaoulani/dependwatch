'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Global top progress bar for route transitions (Linear/Vercel-style).
 * Appears only when pathname changes (client-side navigation), not on initial mount.
 * Lightweight, non-blocking, fixed at top of viewport.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const completing = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPathname = useRef<string | null>(null);

  useEffect(() => {
    const isNavigation = prevPathname.current !== null && prevPathname.current !== pathname;
    prevPathname.current = pathname;

    if (!isNavigation) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    completing.current = false;

    setVisible(true);
    setWidth(0);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setWidth(72);
      });
    });

    const complete = () => {
      if (completing.current) return;
      completing.current = true;
      setWidth(100);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setWidth(0);
        timerRef.current = null;
      }, 180);
    };

    const t1 = setTimeout(complete, 400);

    return () => {
      clearTimeout(t1);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname]);

  if (!visible && width === 0) return null;

  return (
    <div
      className="fixed left-0 top-0 z-[9999] h-0.5 bg-primary shadow-sm shadow-primary/30"
      role="progressbar"
      aria-hidden="true"
      style={{
        width: `${width}%`,
        transition: width === 100 ? 'width 0.18s ease-out' : 'width 0.35s ease-out',
      }}
    />
  );
}

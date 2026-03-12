'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AnimateInViewProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
  rootMargin?: string;
};

export function AnimateInView({
  children,
  className,
  delay = 0,
  once = true,
  rootMargin = '0px 0px -8% 0px',
}: AnimateInViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
      },
      { threshold: 0.1, rootMargin, root: null }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  const style = visible && delay > 0 ? { animationDelay: `${delay}ms` } : undefined;

  return (
    <div
      ref={ref}
      className={cn(
        !visible && 'opacity-0 translate-y-3',
        visible && 'animate-fade-in-up',
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}

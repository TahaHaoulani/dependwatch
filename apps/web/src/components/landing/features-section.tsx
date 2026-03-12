'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimateInView } from '@/components/landing/animate-in-view';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlertTriangle,
  CreditCard,
  LayoutDashboard,
  Bell,
  Code2,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  activity: Activity,
  alert: AlertTriangle,
  credit: CreditCard,
  dashboard: LayoutDashboard,
  bell: Bell,
  code: Code2,
};

export type FeatureItem = { iconKey: string; title: string; desc: string };

export function FeaturesSection({ features }: { features: FeatureItem[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {features.map(({ iconKey, title, desc }, i) => {
        const Icon = ICONS[iconKey] ?? Activity;
        return (
          <AnimateInView key={title} delay={i * 80}>
            <Card className="group h-full border-border bg-card transition-all duration-300 hover:border-border hover:bg-muted/5">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary/20">
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-base font-semibold tracking-tight md:text-lg">
                  {title}
                </CardTitle>
                <CardDescription className="mt-1 leading-relaxed">
                  {desc}
                </CardDescription>
              </CardHeader>
            </Card>
          </AnimateInView>
        );
      })}
    </div>
  );
}

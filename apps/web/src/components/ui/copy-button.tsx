'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export function CopyButton({
  text,
  className,
  label,
  labelText,
  toastMessage = 'Copied to clipboard',
  variant = 'outline',
  onCopy,
}: {
  text: string;
  className?: string;
  label?: boolean;
  labelText?: string;
  toastMessage?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  /** Called after successful copy (e.g. for analytics). Never receives the copied value. */
  onCopy?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copy = async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: toastMessage });
    onCopy?.();
    setTimeout(() => setCopied(false), 2500);
  };

  if (label) {
    const displayLabel = labelText ?? 'Copy key';
    return (
      <Button
        type="button"
        variant={variant}
        size="sm"
        className={className}
        onClick={copy}
        disabled={!text}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 mr-2 text-primary" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-4 w-4 mr-2" />
            {displayLabel}
          </>
        )}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('shrink-0 transition-colors', className)}
      onClick={copy}
      aria-label="Copy"
      disabled={!text}
    >
      <span className="relative inline-flex h-4 w-4 items-center justify-center">
        <Copy className={`h-4 w-4 transition-opacity duration-200 ${copied ? 'absolute opacity-0' : 'opacity-100'}`} />
        <Check className={`h-4 w-4 text-primary transition-opacity duration-200 ${copied ? 'opacity-100' : 'absolute opacity-0'}`} />
      </span>
    </Button>
  );
}

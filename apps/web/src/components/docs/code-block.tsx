'use client';

import { useEffect, useRef } from 'react';
import { CopyButton } from '@/components/ui/copy-button';
import { SyntaxCodeBlock } from '@/components/ui/syntax-code-block';

const LANGUAGE_LABELS: Record<string, string> = {
  typescript: 'TypeScript',
  ts: 'TypeScript',
  javascript: 'JavaScript',
  js: 'JavaScript',
  bash: 'Bash',
  shell: 'Shell',
};

export function CodeBlock({ code, language }: { code: string; language: string }) {
  const preRef = useRef<HTMLPreElement>(null);
  const useSyntax = language === 'typescript' || language === 'javascript' || language === 'ts' || language === 'js';
  const label = LANGUAGE_LABELS[language] ?? language;

  // Prevent code block from appearing selected (clear stray selection when block is in view)
  useEffect(() => {
    const pre = preRef.current;
    if (!pre) return;
    const sel = window.getSelection();
    if (sel?.containsNode(pre, true)) {
      sel.removeAllRanges();
    }
  }, [code]);

  return (
    <div className="docs-code-block relative group rounded-xl border border-code-border bg-code-background overflow-hidden shadow-sm">
      <div className="flex items-center justify-between border-b border-border-subtle bg-black/20 px-4 py-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <CopyButton
          text={code}
          className="h-8 w-8 shrink-0 rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground"
          toastMessage="Copied"
        />
      </div>
      <pre
        ref={preRef}
        className="overflow-x-auto px-5 py-5 text-[13px] font-mono leading-relaxed select-text bg-transparent"
      >
        {useSyntax ? (
          <SyntaxCodeBlock code={code} />
        ) : (
          <code className="text-foreground/90">{code}</code>
        )}
      </pre>
    </div>
  );
}

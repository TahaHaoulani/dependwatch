'use client';

import { SyntaxCodeBlock } from '@/components/ui/syntax-code-block';

export function SdkExampleBlock({ code }: { code: string }) {
  return (
    <pre className="p-4 overflow-x-auto text-[13px] font-mono leading-relaxed whitespace-pre">
      <SyntaxCodeBlock code={code} />
    </pre>
  );
}

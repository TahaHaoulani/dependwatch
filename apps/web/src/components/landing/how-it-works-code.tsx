/* Light mode = dark text on light terminal; dark mode = light text on dark terminal */
const k = 'text-blue-700 dark:text-[#79c0ff]';
const s = 'text-emerald-700 dark:text-[#7ee787]';
const p = 'text-amber-800 dark:text-[#ffa657]';
const b = 'text-rose-600 dark:text-[#ff7b72]';
const n = 'text-amber-600 dark:text-[#79c0ff]';
const d = 'text-foreground/90 dark:text-[#c9d1d9]';

export function HowItWorksCode() {
  return (
    <div className="overflow-hidden rounded-xl border border-code-border bg-code-background font-mono text-sm shadow-lg ring-1 ring-border/20">
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500/70" />
          <span className="h-2 w-2 rounded-full bg-amber-500/70" />
          <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
          <span className="ml-2 text-xs text-muted-foreground">api/chat.ts</span>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">TypeScript</span>
      </div>
      <pre className="overflow-x-auto p-5 text-[13px] leading-relaxed whitespace-pre-wrap">
        <code>
          <span className={k}>import</span>
          <span className={b}> {'{ init, wrap }'}</span>
          <span className={k}> from</span>
          <span className={s}> &apos;@dependwatch/sdk-node&apos;</span>
          <span className={d}>;</span>
          {'\n'}
          <span className={k}>import</span>
          <span className={b}> OpenAI</span>
          <span className={k}> from</span>
          <span className={s}> &apos;openai&apos;</span>
          <span className={d}>;</span>
          {'\n\n'}
          <span className={p}>init</span>
          <span className={d}>(</span>
          <span className={d}>&#123; ingestKey: process.env.</span>
          <span className={n}>DEPENDWATCH_INGEST_KEY</span>
          <span className={d}> &#125;);</span>
          {'\n'}
          <span className={b}>const</span>
          <span className={d}> openai</span>
          <span className={d}> =</span>
          <span className={d}> new</span>
          <span className={p}> OpenAI</span>
          <span className={d}>();</span>
          {'\n\n'}
          <span className={b}>const</span>
          <span className={d}> result</span>
          <span className={d}> =</span>
          <span className={k}> await</span>
          <span className={d}> </span>
          <span className={p}>wrap</span>
          <span className={d}>(</span>
          {'\n'}
          <span className={d}>  &#123; provider: </span>
          <span className={s}> &apos;openai&apos;</span>
          <span className={d}>, endpoint: </span>
          <span className={s}> &apos;chat.completions&apos;</span>
          <span className={d}>, estimated_cost_usd: </span>
          <span className={n}> 0.002</span>
          <span className={d}> &#125;,</span>
          {'\n'}
          <span className={d}>  async () =&gt; openai.chat.completions.create(</span>
          {'\n'}
          <span className={d}>    &#123; model: </span>
          <span className={s}> &apos;gpt-4&apos;</span>
          <span className={d}>, messages &#125;)</span>
          {'\n'}
          <span className={d}>  );</span>
          {'\n'}
          <span className={d}>);</span>
        </code>
      </pre>
    </div>
  );
}

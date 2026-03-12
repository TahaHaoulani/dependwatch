export function DocSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-32 py-12 first:pt-6">
      <h2 className="border-b border-border/50 pb-3 text-2xl font-bold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="mt-6 max-w-prose space-y-4 text-muted-foreground [&_strong]:text-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm [&_.docs-code-block_code]:bg-transparent [&_.docs-code-block_code]:p-0">
        {children}
      </div>
    </section>
  );
}

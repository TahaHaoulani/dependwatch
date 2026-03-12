import Link from 'next/link';

const productLinks = [
  { href: '/#features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
];

const companyLinks = [
  { href: '/contact', label: 'Contact' },
  { href: '/support', label: 'Support' },
  { href: '/about', label: 'About' },
  { href: '/security', label: 'Security' },
  { href: '/status', label: 'Status' },
];

const legalLinks = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/acceptable-use', label: 'Acceptable Use' },
  { href: '/cookies', label: 'Cookies' },
];

const footerLinkClass =
  'text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm py-0.5';

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/50 bg-muted/20" role="contentinfo">
      <div className="container mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
        {/* Mobile: single column. Desktop: logo left, then Product → Company → Legal. */}
        <div className="flex flex-col gap-10 sm:gap-12 md:flex-row md:items-start md:justify-between md:gap-16">
          {/* Brand */}
          <div className="min-w-0 md:max-w-[200px]">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-semibold tracking-tight text-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
            >
              <span className="text-lg text-primary" aria-hidden>◇</span>
              DependWatch
            </Link>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Observability for every API and tool your software depends on—including the ones your AI agents call.
            </p>
          </div>

          <nav aria-label="Product">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Product
            </h3>
            <ul className="mt-3.5 space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={footerLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Company">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Company
            </h3>
            <ul className="mt-3.5 space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={footerLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Legal">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Legal
            </h3>
            <ul className="mt-3.5 space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={footerLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 border-t border-border/50 pt-8">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} DependWatch. Observability for external APIs and tools. SaaS. Integrations. The APIs your AI agents call.
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground/90 leading-relaxed">
            No lock-in. Ingest keys hashed; we never log request bodies.
          </p>
        </div>
      </div>
    </footer>
  );
}

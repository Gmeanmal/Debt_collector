import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-base-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(201,169,97,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(107,31,26,0.16),transparent_55%)]" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-[420px] w-[420px] rounded-full border border-pink-primary/15" />
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-[260px] w-[260px] rounded-full border border-pink-primary/10" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full border border-pink-primary/40 bg-pink-primary/10 flex items-center justify-center">
            <span className="font-display text-lg text-pink-primary">G</span>
          </div>
          <span className="font-display text-lg tracking-[0.3em] text-base-text-muted uppercase">
            Mean Mal
          </span>
        </div>

        <div className="relative z-10 max-w-md">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-pink-primary/80">
            Private quarters
          </p>
          <h1 className="mt-4 font-display text-5xl italic leading-[1.05] text-base-text">
            Owed,
            <br />
            owned,
            <br />
            <span className="text-pink-primary">remembered.</span>
          </h1>
          <p className="mt-6 text-base text-base-text-muted">
            The ledger keeps every tribute, every promise, every late minute. You only need to
            arrive.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-base-text-subtle">
          <span>est. 2026</span>
          <span>·</span>
          <span>collection · contracts · ceremony</span>
        </div>
      </aside>

      <section className="flex flex-col items-center justify-center bg-base-bg p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <span className="font-display text-2xl tracking-[0.3em] text-pink-primary uppercase">
              Mean Mal
            </span>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-4xl text-base-text">{title ?? "Welcome back."}</h2>
            {subtitle && <p className="mt-2 text-sm text-base-text-muted">{subtitle}</p>}
          </div>

          {children}
        </div>
      </section>
    </div>
  );
}

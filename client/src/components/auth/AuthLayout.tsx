import type { ReactNode } from "react";
import { BrandLockup } from "@/components/layout/BrandMark";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="relative grid min-h-screen grid-cols-1 bg-bg lg:grid-cols-[1.1fr_1fr]">
      <div className="absolute right-4 top-4 z-20">
        <div className="rounded-full border border-line bg-bg-elev/60 p-0.5">
          <ThemeToggle />
        </div>
      </div>

      <aside className="relative hidden overflow-hidden bg-bg-elev border-r border-line lg:flex lg:flex-col lg:justify-between lg:p-12">
        <BrandLockup />

        <div className="max-w-xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent-deep">
            Private quarters · Vol. IV
          </p>
          <h1 className="mt-7 font-display text-[48px] italic leading-[1.02] tracking-[-0.02em] text-text xl:text-[56px]">
            Owed.
            <br />
            Owned.
            <br />
            <span className="text-accent-deep">Remembered.</span>
          </h1>
          <p className="mt-8 max-w-md text-[14.5px] leading-relaxed text-text-mute">
            The ledger keeps every tribute, every promise, every late minute. You only need to
            arrive.
          </p>
        </div>

        <div className="border-t border-line pt-6">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint">
            <span>Est. mmxxvi</span>
            <span>Collection · Contracts · Ceremony</span>
            <span>UK · £</span>
          </div>
        </div>
      </aside>

      <section className="flex flex-col items-center justify-center bg-bg p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-faint">
              Mean Mal · The Ledger
            </span>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-[32px] italic leading-[1] tracking-[-0.02em] text-text">
              {title ?? "Welcome back."}
            </h2>
            {subtitle && <p className="mt-3 text-sm text-text-mute">{subtitle}</p>}
          </div>

          {children}
        </div>
      </section>
    </div>
  );
}

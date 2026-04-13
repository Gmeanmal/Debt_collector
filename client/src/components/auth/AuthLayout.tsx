import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-base-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-pink-primary tracking-wider">
            Debt Collector
          </h1>
        </div>
        <div className="bg-base-surface border border-base-border rounded-lg p-8 shadow-[var(--shadow-card)]">
          {children}
        </div>
      </div>
    </div>
  );
}

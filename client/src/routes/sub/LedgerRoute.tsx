import { LedgerAccordion } from "@/components/ledger/LedgerAccordion";

export function LedgerRoute() {
  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Your ledger
          </h1>
          <p className="text-sm text-base-text-muted mt-1">
            Everything your goddess sees about you, gathered in one place. Read-only — use the
            dedicated pages to make changes.
          </p>
        </div>

        <LedgerAccordion />
      </div>
    </div>
  );
}

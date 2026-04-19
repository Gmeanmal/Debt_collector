import { PageHeader } from "@/components/ui/page-header";
import { LedgerAccordion } from "@/components/ledger/LedgerAccordion";

export function LedgerRoute() {
  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <PageHeader
          crumbs={["Home · Ledger"]}
          title="Your ledger"
          description="Everything your goddess sees about you, gathered in one place. Read-only — use the dedicated pages to make changes."
        />

        <LedgerAccordion />
      </div>
    </div>
  );
}

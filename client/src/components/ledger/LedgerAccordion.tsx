import { IdentitySection } from "@/components/ledger/sections/IdentitySection";
import { GenderSection } from "@/components/ledger/sections/GenderSection";
import { KinksSection } from "@/components/ledger/sections/KinksSection";
import { LimitsSection } from "@/components/ledger/sections/LimitsSection";
import { JournalSection } from "@/components/ledger/sections/JournalSection";
import { PaymentsSection } from "@/components/ledger/sections/PaymentsSection";
import { MeritsSection } from "@/components/ledger/sections/MeritsSection";
import { RitualsSection } from "@/components/ledger/sections/RitualsSection";
import { ContractsSection } from "@/components/ledger/sections/ContractsSection";
import { AftercareSection } from "@/components/ledger/sections/AftercareSection";

export function LedgerAccordion() {
  return (
    <div className="flex flex-col gap-4">
      <IdentitySection />
      <GenderSection />
      <KinksSection />
      <LimitsSection />
      <JournalSection />
      <PaymentsSection />
      <MeritsSection />
      <RitualsSection />
      <ContractsSection />
      <AftercareSection />
    </div>
  );
}

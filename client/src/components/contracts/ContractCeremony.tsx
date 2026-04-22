import { useEffect, useMemo, useRef, useState } from "react";
import type { components } from "@/types/api.generated";
import { Button } from "@/components/ui/button";
import { SignaturePad } from "@/components/signature/SignaturePad";
import { formatGBP } from "@/services/format/currency";

type DebtContractOut = components["schemas"]["DebtContractOut"];
type ClauseOut = components["schemas"]["ContractClauseOut"];

const SECONDS_PER_CLAUSE = 8;

interface Props {
  contract: DebtContractOut;
  pending: boolean;
  error: string | null;
  onSign: (signaturePngB64: string) => void;
  onAbort: () => void;
}

function useCountdown(seconds: number, resetKey: string): number {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    setRemaining(seconds);
    const interval = window.setInterval(() => {
      setRemaining((r) => (r <= 1 ? 0 : r - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [seconds, resetKey]);
  return remaining;
}

function ContractHeaderPanel({ contract }: { contract: DebtContractOut }) {
  return (
    <div className="flex flex-col gap-4 text-center">
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-text-faint">
        A contract between
      </p>
      <h1 className="font-display italic text-4xl md:text-5xl text-text leading-tight">
        The Goddess &amp; Her Sub
      </h1>
      <p className="text-text-mute text-sm max-w-md mx-auto">
        Read each clause in its own time. The words bind you as much as the signature.
      </p>
      <dl className="mt-6 grid grid-cols-3 gap-4 max-w-md mx-auto text-sm">
        <div>
          <dt className="text-text-faint text-xs uppercase tracking-widest">Principal</dt>
          <dd className="font-display italic text-lg text-text mt-1 tabular-nums">
            {formatGBP(contract.principal)}
          </dd>
        </div>
        <div>
          <dt className="text-text-faint text-xs uppercase tracking-widest">Rate</dt>
          <dd className="font-display italic text-lg text-text mt-1 tabular-nums">
            {(Number(contract.interest_rate) * 100).toFixed(2)}%
          </dd>
        </div>
        <div>
          <dt className="text-text-faint text-xs uppercase tracking-widest">Periods</dt>
          <dd className="font-display italic text-lg text-text mt-1 tabular-nums">
            {contract.duration_periods}
          </dd>
        </div>
      </dl>
    </div>
  );
}

interface ClausePanelProps {
  clause: ClauseOut;
  index: number;
  total: number;
  onNext: () => void;
}

function ClausePanel({ clause, index, total, onNext }: ClausePanelProps) {
  const remaining = useCountdown(SECONDS_PER_CLAUSE, clause.id);
  const ready = remaining === 0;

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <p
        className="font-mono text-[11px] tracking-[0.2em] uppercase text-text-faint text-center"
        aria-live="polite"
      >
        Clause {index + 1} of {total}
      </p>
      <h2 className="font-display italic text-3xl text-text text-center">{clause.label}</h2>
      <p className="text-text text-lg leading-relaxed whitespace-pre-wrap">{clause.body}</p>
      <div className="flex items-center justify-center gap-4 mt-4">
        <Button
          variant="primary"
          size="md"
          disabled={!ready}
          onClick={onNext}
          aria-label={
            ready
              ? "Continue to next clause"
              : `Read — continues in ${remaining} second${remaining === 1 ? "" : "s"}`
          }
        >
          {ready ? "I read this — continue" : `Read — ${remaining}s`}
        </Button>
      </div>
    </div>
  );
}

function SignaturePanel({ pending, onSign }: { pending: boolean; onSign: Props["onSign"] }) {
  const handleReady = (dataUrl: string) => {
    const prefix = "data:image/png;base64,";
    onSign(dataUrl.startsWith(prefix) ? dataUrl.slice(prefix.length) : dataUrl);
  };
  return (
    <div className="flex flex-col gap-4 max-w-xl mx-auto">
      <h2 className="font-display italic text-3xl text-text text-center">Your signature</h2>
      <p className="text-text-mute text-sm text-center">
        Draw below. This binds you to every clause you just read.
      </p>
      <SignaturePad onReady={handleReady} disabled={pending} />
      {pending && <p className="text-xs text-text-mute text-center">Committing signature…</p>}
    </div>
  );
}

export function ContractCeremony({ contract, pending, error, onSign, onAbort }: Props) {
  const clauses = useMemo(
    () => (contract.clauses ?? []).slice().sort((a, b) => a.sort_order - b.sort_order),
    [contract.clauses],
  );
  // Steps: 0 = header, 1..N = clauses, N+1 = signature.
  const [step, setStep] = useState(0);
  const total = clauses.length;
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onAbort();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onAbort]);

  const onSigningStep = step === total + 1;

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Contract signing ceremony"
      className="fixed inset-0 z-40 bg-bg-sunken overflow-y-auto focus:outline-none"
    >
      <div className="min-h-full flex flex-col px-6 py-10 md:px-10 md:py-14">
        <div className="flex items-center justify-between max-w-3xl mx-auto w-full">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-text-faint">
            Ceremony mode
          </p>
          <Button variant="ghost" size="sm" onClick={onAbort} aria-label="Exit ceremony">
            Esc · Exit
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center py-12">
          <div className="w-full">
            {step === 0 && <ContractHeaderPanel contract={contract} />}
            {step > 0 && step <= total && clauses[step - 1] && (
              <ClausePanel
                clause={clauses[step - 1]!}
                index={step - 1}
                total={total}
                onNext={() => setStep(step + 1)}
              />
            )}
            {onSigningStep && <SignaturePanel pending={pending} onSign={onSign} />}
          </div>
        </div>

        {error && (
          <p
            role="status"
            className="max-w-md mx-auto text-sm rounded-md px-4 py-2 bg-bad-bg text-bad-ink border border-line"
          >
            {error}
          </p>
        )}

        {step === 0 && (
          <div className="flex justify-center mt-6">
            <Button variant="primary" size="md" onClick={() => setStep(1)}>
              {total > 0 ? "Begin reading" : "Proceed to signature"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

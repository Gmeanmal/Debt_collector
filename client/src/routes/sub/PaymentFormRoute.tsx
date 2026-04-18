import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/services/auth/useAuth";
import {
  DeclarePaymentHttpError,
  declarePaymentMultipartApi,
  listSubPaymentMethodsApi,
  type PaymentCategory,
} from "@/services/payments/paymentsApi";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { CategoryRadioGroup } from "@/components/payments/CategoryRadioGroup";
import { MethodPicker } from "@/components/payments/MethodPicker";
import { ProofUploadField } from "@/components/payments/ProofUploadField";
import { queryKeys } from "@/lib/queryKeys";
import { getSafeword, safewordKey } from "@/services/safeword/safewordApi";

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;

function nowLondonIsoNaive(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const hour = pick("hour") === "24" ? "00" : pick("hour");
  return `${pick("year")}-${pick("month")}-${pick("day")}T${hour}:${pick("minute")}`;
}

function normaliseNaiveIso(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return `${raw}:00`;
  return raw;
}

function toAmountDefault(raw: string | null | undefined): string {
  if (raw == null) return "";
  const n = Number(raw);
  return Number.isFinite(n) ? n.toFixed(2) : "";
}

// TODO(DECLARE-2): surface the sub's own rolling amount via a dedicated `/sub/me/rolling`
// read-model endpoint and prefill here. UserOut does not carry `rolling_amount` today.
function rollingDefault(): string {
  return "";
}

export function PaymentFormRoute() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const isActive = user?.status === "active";
  const pendingEntry = user?.status === "pending_entry_tribute";
  const forcedEntryTribute = searchParams.get("kind") === "entry_tribute";

  const initialCategory: PaymentCategory = isActive && !forcedEntryTribute ? "tribute" : "entry";

  const [category, setCategory] = useState<PaymentCategory>(initialCategory);
  const [amount, setAmount] = useState<string>(() => {
    if (forcedEntryTribute || pendingEntry) return toAmountDefault(user?.entry_tribute_amount);
    if (initialCategory === "rolling") return rollingDefault();
    return "";
  });
  const [userEditedAmount, setUserEditedAmount] = useState(false);
  const [methodId, setMethodId] = useState("");
  const [externalTs, setExternalTs] = useState<string>(() => nowLondonIsoNaive());
  const [note, setNote] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [amountErr, setAmountErr] = useState("");

  useEffect(() => {
    if (userEditedAmount) return;
    if (category === "entry" && (forcedEntryTribute || pendingEntry)) {
      setAmount(toAmountDefault(user?.entry_tribute_amount));
      return;
    }
    if (category === "rolling") {
      setAmount(rollingDefault());
      return;
    }
    setAmount("");
  }, [category, forcedEntryTribute, pendingEntry, user?.entry_tribute_amount, userEditedAmount]);

  const { data: safeword } = useQuery({
    queryKey: [...safewordKey],
    queryFn: getSafeword,
    retry: false,
    throwOnError: false,
  });

  const { data: methods = [], isLoading: methodsLoading } = useQuery({
    queryKey: queryKeys.sub.paymentMethods(),
    queryFn: listSubPaymentMethodsApi,
  });

  const declareMutation = useMutation({
    mutationFn: declarePaymentMultipartApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sub.payments() });
      navigate(forcedEntryTribute ? "/porch" : "/sub/payments");
    },
  });

  const submitError = useMemo(() => {
    const err = declareMutation.error;
    if (!err) return "";
    if (err instanceof DeclarePaymentHttpError) return err.message;
    return "Failed to submit. Please try again.";
  }, [declareMutation.error]);

  function validateAmount(): boolean {
    if (!AMOUNT_RE.test(amount)) {
      setAmountErr("Enter a valid amount (e.g. 30.00)");
      return false;
    }
    setAmountErr("");
    return true;
  }

  function handleAmountChange(next: string) {
    setUserEditedAmount(true);
    setAmount(next);
  }

  function handleCategoryChange(next: PaymentCategory) {
    setCategory(next);
    setUserEditedAmount(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateAmount()) return;
    if (!methodId || !proof) return;

    declareMutation.mutate({
      amount,
      method_id: methodId,
      category,
      proof,
      external_timestamp: externalTs ? normaliseNaiveIso(externalTs) : undefined,
      note: note || undefined,
    });
  }

  const safewordMissing = category === "entry" && !safeword?.word?.trim();
  const canSubmit =
    !!proof && !!methodId && !amountErr && !declareMutation.isPending && !safewordMissing;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-lg mx-auto flex flex-col gap-6">
        <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
          Declare Payment
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-base-surface border border-base-border rounded-lg p-6 flex flex-col gap-5"
        >
          <CategoryRadioGroup
            value={category}
            onChange={handleCategoryChange}
            isActive={!!isActive}
            forcedEntryTribute={forcedEntryTribute}
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="amount" className="text-sm font-semibold text-base-text">
              Amount (£)
            </label>
            <input
              id="amount"
              type="text"
              inputMode="decimal"
              placeholder="30.00"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              onBlur={validateAmount}
              className="bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-base-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
            />
            {amountErr && <p className="text-xs text-status-danger">{amountErr}</p>}
          </div>

          <MethodPicker
            methods={methods}
            value={methodId}
            onChange={setMethodId}
            loading={methodsLoading}
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="externalTs" className="text-sm font-semibold text-base-text">
              When did you pay?
            </label>
            <DateTimePicker
              id="externalTs"
              value={externalTs || null}
              onChange={setExternalTs}
              placeholder="Pick a date & time"
            />
            <p className="text-xs text-base-text-subtle">Defaults to now in Europe/London.</p>
          </div>

          <ProofUploadField file={proof} onChange={setProof} disabled={declareMutation.isPending} />

          <div className="flex flex-col gap-1">
            <label htmlFor="note" className="text-sm font-semibold text-base-text">
              Note <span className="text-base-text-subtle font-normal">(optional)</span>
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="An offering note for your goddess (optional)."
              className="bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-base-text text-sm resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
            />
          </div>

          {safewordMissing && (
            <p className="text-sm text-status-warning rounded-md border border-status-warning/40 bg-status-warning/10 px-4 py-3">
              Set a safeword on the Limits &amp; Triggers page before paying your entry tribute.
            </p>
          )}

          {submitError && (
            <p className="text-xs text-status-danger" role="alert">
              {submitError}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(forcedEntryTribute ? "/porch" : "/sub/payments")}
              disabled={declareMutation.isPending}
              className="w-full sm:w-auto px-4 py-2 text-sm text-base-text-muted border border-base-border rounded-md hover:text-base-text transition-colors focus-visible:ring-2 focus-visible:ring-pink-primary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm bg-pink-primary text-pink-foreground font-semibold rounded-md hover:bg-pink-primary-hover transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-pink-primary"
            >
              {declareMutation.isPending && (
                <span
                  aria-hidden="true"
                  className="h-4 w-4 rounded-full border-2 border-pink-foreground/40 border-t-pink-foreground animate-spin"
                />
              )}
              {declareMutation.isPending ? "Uploading…" : "Submit declaration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

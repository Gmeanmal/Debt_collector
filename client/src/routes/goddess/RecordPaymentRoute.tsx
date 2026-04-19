import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listGoddessSubsApi,
  recordPaymentApi,
  type GoddessSub,
  type PaymentCategory,
  type PaymentOut,
  type RecordPaymentIn,
} from "@/services/payments/paymentsApi";
import { listPaymentMethodsApi } from "@/services/paymentMethods/paymentMethodsApi";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { MethodPicker } from "@/components/payments/MethodPicker";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/profile/Avatar";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { queryKeys } from "@/lib/queryKeys";
import { formatGBP } from "@/services/format/currency";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

const CATEGORIES: { value: PaymentCategory; label: string }[] = [
  { value: "entry", label: "Entry tribute" },
  { value: "tribute", label: "Tribute" },
];

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;

type SubmitMode = "keep-open" | "close";

export function RecordPaymentRoute() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [selectedSub, setSelectedSub] = useState<GoddessSub | null>(null);
  const [category, setCategory] = useState<PaymentCategory>("tribute");
  const [amount, setAmount] = useState("");
  const [methodId, setMethodId] = useState("");
  const [externalTs, setExternalTs] = useState("");
  const [note, setNote] = useState("");
  const [amountErr, setAmountErr] = useState("");

  const submitModeRef = useRef<SubmitMode>("keep-open");
  const toastCtxRef = useRef<{ subDisplayName: string; amountLabel: string } | null>(null);
  const subTriggerRef = useRef<HTMLButtonElement | null>(null);

  const { data: subs = [] } = useQuery({
    queryKey: queryKeys.goddess.subs(),
    queryFn: listGoddessSubsApi,
  });

  const { data: methods = [] } = useQuery({
    queryKey: queryKeys.payments.methods("goddess"),
    queryFn: () => listPaymentMethodsApi(true),
  });

  const recordMutation = useMutation<PaymentOut, Error, RecordPaymentIn>({
    mutationFn: recordPaymentApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.goddess.pendingPayments() });
      const ctx = toastCtxRef.current;
      if (ctx) {
        toast.success(
          <span className="flex items-center gap-3 w-full">
            <span className="flex-1 min-w-0 truncate">
              Recorded {ctx.amountLabel} for {ctx.subDisplayName}
            </span>
            <Badge variant="debt" className="shrink-0">
              Goddess-recorded
            </Badge>
          </span>,
          { duration: 5000 },
        );
      }
      if (submitModeRef.current === "close") {
        navigate("/goddess/validations");
        return;
      }
      setAmount("");
      setExternalTs("");
      setNote("");
      setAmountErr("");
      requestAnimationFrame(() => subTriggerRef.current?.focus());
    },
    onError: () => toast.error("Failed to record payment. Check the form and retry."),
  });

  function validateAmount(): boolean {
    if (!AMOUNT_RE.test(amount)) {
      setAmountErr("Enter a valid amount (e.g. 30.00)");
      return false;
    }
    setAmountErr("");
    return true;
  }

  function submitWithMode(mode: SubmitMode) {
    if (!validateAmount()) return;
    if (!selectedSub || !methodId) return;
    submitModeRef.current = mode;
    const numericAmount = Number(amount);
    toastCtxRef.current = {
      subDisplayName: selectedSub.display_name,
      amountLabel: formatGBP(numericAmount),
    };
    recordMutation.mutate({
      sub_id: selectedSub.id,
      amount: numericAmount,
      method_id: methodId,
      category,
      external_timestamp: externalTs || undefined,
      note: note || undefined,
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitWithMode("keep-open");
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-lg mx-auto flex flex-col gap-6">
        <PageHeader
          crumbs={["Home · Money · Record payment"]}
          title={<span className="italic">Record a tribute</span>}
          description="Log a validated payment on behalf of a sub. This creates an already-validated declaration and emits an allocation immediately."
        />

        <form
          onSubmit={handleSubmit}
          className="bg-bg-elev border border-line rounded-[10px] p-[18px] flex flex-col gap-5"
        >
          {/* Sub */}
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-text">Sub</span>
            <SearchableSelect<GoddessSub>
              options={subs}
              value={selectedSub}
              onChange={setSelectedSub}
              getLabel={(s) => `${s.display_name} @${s.username}`}
              getValue={(s) => s.id}
              placeholder="Select a sub"
              triggerRef={subTriggerRef}
              ariaLabel="Select a sub"
              renderOption={(s) => (
                <span className="flex items-center gap-2 min-w-0">
                  <Avatar user={s} size="sm" className="shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate font-medium text-text">
                      {s.display_name}
                    </span>
                    <span className="block truncate text-xs text-text-mute">
                      @{s.username}
                    </span>
                  </span>
                  <Badge variant="default" className="shrink-0 ml-auto">
                    {s.status.replace(/_/g, " ")}
                  </Badge>
                </span>
              )}
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1">
            <label htmlFor="category" className="text-sm font-semibold text-text">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as PaymentCategory)}
              className="bg-bg-sunken border border-line rounded-md px-3 py-2 text-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {CATEGORIES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1">
            <label htmlFor="amount" className="text-sm font-semibold text-text">
              Amount (£)
            </label>
            <input
              id="amount"
              type="text"
              inputMode="decimal"
              placeholder="30.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={validateAmount}
              className="bg-bg-sunken border border-line rounded-md px-3 py-2 text-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            {amountErr && <p className="text-xs text-bad-ink">{amountErr}</p>}
          </div>

          {/* Method */}
          <MethodPicker methods={methods} value={methodId} onChange={setMethodId} loading={false} />

          {/* External timestamp */}
          <div className="flex flex-col gap-1">
            <label htmlFor="externalTs" className="text-sm font-semibold text-text">
              Payment date <span className="text-text-faint font-normal">(optional)</span>
            </label>
            <DateTimePicker
              id="externalTs"
              value={externalTs || null}
              onChange={setExternalTs}
              placeholder="Pick a date & time"
            />
          </div>

          {/* Note */}
          <div className="flex flex-col gap-1">
            <label htmlFor="note" className="text-sm font-semibold text-text">
              Note <span className="text-text-faint font-normal">(optional)</span>
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="bg-bg-sunken border border-line rounded-md px-3 py-2 text-text text-sm resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/goddess/validations")}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => submitWithMode("close")}
              disabled={recordMutation.isPending}
              className="w-full sm:w-auto"
            >
              Record & close
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={recordMutation.isPending}
              aria-label="Record payment and keep form open to add another"
              className="w-full sm:w-auto"
            >
              {recordMutation.isPending ? "Recording…" : "Record & add another"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

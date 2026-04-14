import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listGoddessSubsApi,
  recordPaymentApi,
  type PaymentCategory,
} from "@/services/payments/paymentsApi";
import { listPaymentMethodsApi } from "@/services/paymentMethods/paymentMethodsApi";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { MethodIcon, METHOD_LABELS } from "@/components/paymentMethods/MethodIcon";
import { cn } from "@/lib/utils";

const CATEGORIES: { value: PaymentCategory; label: string }[] = [
  { value: "entry", label: "Entry tribute" },
  { value: "tribute", label: "Tribute" },
];

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;

export function RecordPaymentRoute() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [subId, setSubId] = useState("");
  const [category, setCategory] = useState<PaymentCategory>("tribute");
  const [amount, setAmount] = useState("");
  const [methodId, setMethodId] = useState("");
  const [externalTs, setExternalTs] = useState("");
  const [note, setNote] = useState("");
  const [amountErr, setAmountErr] = useState("");

  const { data: subs = [] } = useQuery({
    queryKey: ["goddessSubs"],
    queryFn: listGoddessSubsApi,
  });

  const { data: methods = [] } = useQuery({
    queryKey: ["paymentMethods", "goddess"],
    queryFn: () => listPaymentMethodsApi(true),
  });

  const recordMutation = useMutation({
    mutationFn: recordPaymentApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pendingPayments"] });
      navigate("/goddess/validations");
    },
  });

  function validateAmount(): boolean {
    if (!AMOUNT_RE.test(amount)) {
      setAmountErr("Enter a valid amount (e.g. 30.00)");
      return false;
    }
    setAmountErr("");
    return true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateAmount()) return;
    if (!subId || !methodId) return;

    recordMutation.mutate({
      sub_id: subId,
      amount: Number(amount) as unknown as string & number,
      method_id: methodId,
      category,
      external_timestamp: externalTs || undefined,
      note: note || undefined,
    });
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-lg mx-auto flex flex-col gap-6">
        <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
          Record Payment
        </h1>
        <p className="text-sm text-base-text-muted">
          Log a validated payment on behalf of a sub. This creates an already-validated declaration
          and emits an allocation immediately.
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-base-surface border border-base-border rounded-lg p-6 flex flex-col gap-5"
        >
          {/* Sub */}
          <div className="flex flex-col gap-1">
            <label htmlFor="sub" className="text-sm font-semibold text-base-text">
              Sub
            </label>
            <select
              id="sub"
              value={subId}
              onChange={(e) => setSubId(e.target.value)}
              required
              className="bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-base-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
            >
              <option value="">Select a sub</option>
              {subs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name} ({s.username})
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1">
            <label htmlFor="category" className="text-sm font-semibold text-base-text">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as PaymentCategory)}
              className="bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-base-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
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
            <label htmlFor="amount" className="text-sm font-semibold text-base-text">
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
              className="bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-base-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
            />
            {amountErr && <p className="text-xs text-status-danger">{amountErr}</p>}
          </div>

          {/* Method */}
          <fieldset>
            <legend className="text-sm font-semibold text-base-text mb-2">Payment method</legend>
            {methods.length === 0 ? (
              <p className="text-xs text-base-text-muted">No enabled payment methods.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {methods.map((m) => {
                  const selected = methodId === m.id;
                  return (
                    <label
                      key={m.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors",
                        selected
                          ? "border-pink-primary bg-pink-primary/10"
                          : "border-base-border hover:border-base-border/80 hover:bg-base-surface-raised",
                      )}
                    >
                      <input
                        type="radio"
                        name="method"
                        value={m.id}
                        checked={selected}
                        onChange={() => setMethodId(m.id)}
                        className="sr-only"
                      />
                      <MethodIcon type={m.type} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-base-text truncate">{m.name}</p>
                        <p className="text-xs text-base-text-muted truncate">
                          {METHOD_LABELS[m.type]}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>

          {/* External timestamp */}
          <div className="flex flex-col gap-1">
            <label htmlFor="externalTs" className="text-sm font-semibold text-base-text">
              Payment date <span className="text-base-text-subtle font-normal">(optional)</span>
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
            <label htmlFor="note" className="text-sm font-semibold text-base-text">
              Note <span className="text-base-text-subtle font-normal">(optional)</span>
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-base-text text-sm resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
            />
          </div>

          {recordMutation.isError && (
            <p className="text-xs text-status-danger">Failed to record. Please try again.</p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate("/goddess/validations")}
              className="w-full sm:w-auto px-4 py-2 text-sm text-base-text-muted border border-base-border rounded-md hover:text-base-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={recordMutation.isPending}
              className="w-full sm:w-auto px-4 py-2 text-sm bg-pink-primary text-pink-foreground font-semibold rounded-md hover:bg-pink-primary-hover transition-colors disabled:opacity-50"
            >
              {recordMutation.isPending ? "Recording…" : "Record payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

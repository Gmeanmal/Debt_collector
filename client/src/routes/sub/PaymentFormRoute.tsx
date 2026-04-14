import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/services/auth/useAuth";
import {
  declarePaymentApi,
  listSubPaymentMethodsApi,
  type PaymentCategory,
} from "@/services/payments/paymentsApi";
import { DateTimePicker } from "@/components/ui/date-time-picker";

const ACTIVE_CATEGORIES: { value: PaymentCategory; label: string }[] = [
  { value: "entry", label: "Entry tribute" },
  { value: "tribute", label: "Tribute" },
  { value: "rolling", label: "Rolling tribute" },
];

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;

export function PaymentFormRoute() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const isActive = user?.status === "active";

  const [category, setCategory] = useState<PaymentCategory>(isActive ? "tribute" : "entry");
  const [amount, setAmount] = useState("");
  const [methodId, setMethodId] = useState("");
  const [externalTs, setExternalTs] = useState("");
  const [note, setNote] = useState("");
  const [amountErr, setAmountErr] = useState("");

  const { data: methods = [], isLoading: methodsLoading } = useQuery({
    queryKey: ["subPaymentMethods"],
    queryFn: listSubPaymentMethodsApi,
  });

  const declareMutation = useMutation({
    mutationFn: declarePaymentApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myPayments"] });
      navigate("/sub/payments");
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
    if (!methodId) return;

    declareMutation.mutate({
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
          Declare Payment
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-base-surface border border-base-border rounded-lg p-6 flex flex-col gap-5"
        >
          {/* Category */}
          <fieldset>
            <legend className="text-sm font-semibold text-base-text mb-2">Category</legend>
            <div className="flex flex-col gap-2">
              {ACTIVE_CATEGORIES.map(({ value, label }) => {
                const disabled = value === "entry" && isActive;
                return (
                  <label
                    key={value}
                    className={`flex items-center gap-2 text-sm cursor-pointer ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={value}
                      checked={category === value}
                      disabled={disabled}
                      onChange={() => setCategory(value)}
                      className="accent-pink-primary"
                    />
                    <span className="text-base-text">{label}</span>
                  </label>
                );
              })}
              <p className="text-xs text-base-text-subtle mt-1">
                Contract payments (weekly debt, buyout, …) are declared from the contract page.
              </p>
            </div>
          </fieldset>

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
          <div className="flex flex-col gap-1">
            <label htmlFor="method" className="text-sm font-semibold text-base-text">
              Payment method
            </label>
            {methodsLoading ? (
              <p className="text-xs text-base-text-muted">Loading methods…</p>
            ) : (
              <select
                id="method"
                value={methodId}
                onChange={(e) => setMethodId(e.target.value)}
                required
                className="bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-base-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
              >
                <option value="">Select a method</option>
                {methods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* External timestamp */}
          <div className="flex flex-col gap-1">
            <label htmlFor="externalTs" className="text-sm font-semibold text-base-text">
              When did you pay?{" "}
              <span className="text-base-text-subtle font-normal">(optional)</span>
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
              placeholder="Any details you want Goddess to see"
              className="bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-base-text text-sm resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
            />
          </div>

          {declareMutation.isError && (
            <p className="text-xs text-status-danger">Failed to submit. Please try again.</p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate("/sub/payments")}
              className="w-full sm:w-auto px-4 py-2 text-sm text-base-text-muted border border-base-border rounded-md hover:text-base-text transition-colors focus-visible:ring-2 focus-visible:ring-pink-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={declareMutation.isPending}
              className="w-full sm:w-auto px-4 py-2 text-sm bg-pink-primary text-pink-foreground font-semibold rounded-md hover:bg-pink-primary-hover transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-pink-primary"
            >
              {declareMutation.isPending ? "Submitting…" : "Submit declaration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

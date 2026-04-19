import type {
  DebtContractCreate,
  InterestPeriod,
  PaymentFrequency,
  LatePenaltySeverity,
  MidContractAdditionMode,
} from "@/services/debtContracts/debtContractsApi";

export const INPUT_CLASS =
  "bg-bg-sunken border border-line rounded-md px-3 py-2 text-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent w-full";

export const LABEL_CLASS = "text-sm font-semibold text-text";

interface Props {
  values: DebtContractCreate;
  onChange: (patch: Partial<DebtContractCreate>) => void;
  disabled?: boolean;
}

function pctToFraction(pct: string): number {
  const n = parseFloat(pct);
  return isNaN(n) ? 0 : n / 100;
}

function fractionToPct(frac: number | string): string {
  const n = typeof frac === "string" ? parseFloat(frac) : frac;
  if (isNaN(n)) return "";
  return (n * 100).toFixed(4).replace(/\.?0+$/, "");
}

function MonetaryField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: number | string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={LABEL_CLASS}>
        {label} <span className="text-text-faint font-normal">(£)</span>
      </label>
      <input
        id={id}
        type="number"
        step="0.01"
        min="0"
        required
        disabled={disabled}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLASS}
      />
    </div>
  );
}

function PercentField({
  id,
  label,
  fractionValue,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  fractionValue: number | string;
  onChange: (fraction: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={LABEL_CLASS}>
        {label} <span className="text-text-faint font-normal">(%)</span>
      </label>
      <input
        id={id}
        type="number"
        step="0.01"
        min="0"
        max="100"
        required
        disabled={disabled}
        value={fractionToPct(fractionValue)}
        onChange={(e) => onChange(pctToFraction(e.target.value))}
        className={INPUT_CLASS}
      />
    </div>
  );
}

export function ContractFormFields({ values, onChange, disabled }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <MonetaryField
          id="principal"
          label="Principal"
          value={values.principal}
          onChange={(v) => onChange({ principal: v })}
          disabled={disabled}
        />
        <MonetaryField
          id="minimum_payment"
          label="Minimum payment / period"
          value={values.minimum_payment}
          onChange={(v) => onChange({ minimum_payment: v })}
          disabled={disabled}
        />
        <MonetaryField
          id="exit_amount"
          label="Exit / buyout amount"
          value={values.exit_amount}
          onChange={(v) => onChange({ exit_amount: v })}
          disabled={disabled}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="duration_periods" className={LABEL_CLASS}>
            Duration (periods)
          </label>
          <input
            id="duration_periods"
            type="number"
            step="1"
            min="1"
            required
            disabled={disabled}
            value={values.duration_periods}
            onChange={(e) => onChange({ duration_periods: parseInt(e.target.value, 10) || 1 })}
            className={INPUT_CLASS}
          />
        </div>

        <PercentField
          id="interest_rate"
          label="Interest rate"
          fractionValue={values.interest_rate}
          onChange={(v) => onChange({ interest_rate: v })}
          disabled={disabled}
        />

        <PercentField
          id="late_penalty_percent"
          label="Late penalty"
          fractionValue={values.late_penalty_percent}
          onChange={(v) => onChange({ late_penalty_percent: v })}
          disabled={disabled}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="interest_period" className={LABEL_CLASS}>
            Interest period
          </label>
          <select
            id="interest_period"
            disabled={disabled}
            value={values.interest_period}
            onChange={(e) => onChange({ interest_period: e.target.value as InterestPeriod })}
            className={INPUT_CLASS}
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly (AER)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="payment_frequency" className={LABEL_CLASS}>
            Payment frequency
          </label>
          <select
            id="payment_frequency"
            disabled={disabled}
            value={values.payment_frequency}
            onChange={(e) => onChange({ payment_frequency: e.target.value as PaymentFrequency })}
            className={INPUT_CLASS}
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="late_penalty_severity" className={LABEL_CLASS}>
            Late penalty severity
          </label>
          <select
            id="late_penalty_severity"
            disabled={disabled}
            value={values.late_penalty_severity}
            onChange={(e) =>
              onChange({ late_penalty_severity: e.target.value as LatePenaltySeverity })
            }
            className={INPUT_CLASS}
          >
            <option value="light">Light</option>
            <option value="medium">Medium</option>
            <option value="severe">Severe</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="mid_contract_addition_mode" className={LABEL_CLASS}>
            Mid-contract additions
          </label>
          <select
            id="mid_contract_addition_mode"
            disabled={disabled}
            value={values.mid_contract_addition_mode}
            onChange={(e) =>
              onChange({
                mid_contract_addition_mode: e.target.value as MidContractAdditionMode,
              })
            }
            className={INPUT_CLASS}
          >
            <option value="disabled">Disabled</option>
            <option value="dom_controlled">Goddess controlled</option>
            <option value="sub_approval_required">Sub approval required</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          id="dom_can_add_surprise_penalty"
          type="checkbox"
          disabled={disabled}
          checked={values.dom_can_add_surprise_penalty}
          onChange={(e) => onChange({ dom_can_add_surprise_penalty: e.target.checked })}
          className="w-4 h-4 rounded border-line accent-accent focus-visible:ring-2 focus-visible:ring-accent"
        />
        <label htmlFor="dom_can_add_surprise_penalty" className={LABEL_CLASS}>
          Allow surprise penalty
        </label>
      </div>
    </div>
  );
}

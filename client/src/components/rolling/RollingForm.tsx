import { useState } from "react";
import type {
  RollingTributeIn,
  RollingTributeOut,
  DeadlineDay,
} from "@/services/rolling/rollingApi";
import { Modal } from "@/components/ui/Modal";

const DEADLINE_DAYS: { value: DeadlineDay; label: string }[] = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
];

const INPUT_CLASS =
  "bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-base-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary";

interface Props {
  initial: RollingTributeOut | null;
  onSave: (data: RollingTributeIn) => void;
  onClear: () => void;
  isSaving: boolean;
  isClearing: boolean;
  error: string | null;
}

export function RollingForm({ initial, onSave, onClear, isSaving, isClearing, error }: Props) {
  const [clearOpen, setClearOpen] = useState(false);

  function buildDefaults(): RollingTributeIn {
    if (initial) {
      return {
        amount: Number(initial.amount),
        deadline_day: initial.deadline_day,
        deadline_time: initial.deadline_time.slice(0, 5),
        late_multiplier_per_day: initial.late_multiplier_per_day,
        paused: initial.paused,
        notes: initial.notes ?? "",
      };
    }
    return {
      amount: 0,
      deadline_day: "mon",
      deadline_time: "18:00",
      late_multiplier_per_day: 1,
      paused: false,
      notes: "",
    };
  }

  const defaults = buildDefaults();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: RollingTributeIn = {
      amount: Number(fd.get("amount")),
      deadline_day: fd.get("deadline_day") as DeadlineDay,
      deadline_time: String(fd.get("deadline_time")),
      late_multiplier_per_day: Number(fd.get("late_multiplier_per_day")),
      paused: fd.get("paused") === "on",
      notes: String(fd.get("notes") ?? "").trim() || null,
    };
    onSave(payload);
  }

  function handleClear() {
    setClearOpen(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-base-surface border border-base-border rounded-lg p-6 flex flex-col gap-5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="flex flex-col gap-1">
          <label htmlFor="amount" className="text-sm font-semibold text-base-text">
            Amount (£)
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={defaults.amount}
            className={INPUT_CLASS}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="deadline_day" className="text-sm font-semibold text-base-text">
            Deadline day
          </label>
          <select
            id="deadline_day"
            name="deadline_day"
            defaultValue={defaults.deadline_day}
            className={INPUT_CLASS}
          >
            {DEADLINE_DAYS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="deadline_time" className="text-sm font-semibold text-base-text">
            Deadline time (London)
          </label>
          <input
            id="deadline_time"
            name="deadline_time"
            type="time"
            required
            defaultValue={defaults.deadline_time}
            className={INPUT_CLASS}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="late_multiplier_per_day" className="text-sm font-semibold text-base-text">
            Late multiplier / day
          </label>
          <input
            id="late_multiplier_per_day"
            name="late_multiplier_per_day"
            type="number"
            step="0.1"
            min="0"
            max="30"
            required
            defaultValue={defaults.late_multiplier_per_day}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          id="paused"
          name="paused"
          type="checkbox"
          defaultChecked={defaults.paused}
          className="w-4 h-4 rounded border-base-border accent-pink-primary focus-visible:ring-2 focus-visible:ring-pink-primary"
        />
        <label htmlFor="paused" className="text-sm font-semibold text-base-text">
          Paused
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="notes" className="text-sm font-semibold text-base-text">
          Notes <span className="text-base-text-subtle font-normal">(optional, max 500)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={500}
          defaultValue={defaults.notes ?? ""}
          className={`${INPUT_CLASS} resize-none`}
        />
      </div>

      {error && <p className="text-xs text-status-danger">{error}</p>}

      <div className="flex gap-3 justify-between flex-wrap">
        {initial && (
          <button
            type="button"
            onClick={handleClear}
            disabled={isClearing}
            className="px-4 py-2 text-sm text-status-danger border border-debt-ring rounded-md hover:bg-debt-muted transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-debt-primary"
          >
            {isClearing ? "Clearing…" : "Clear rolling"}
          </button>
        )}
        {clearOpen && (
          <Modal title="Clear rolling tribute" onClose={() => setClearOpen(false)} size="sm">
            <p className="text-sm text-base-text">
              Clear rolling tribute for this sub? The cycle will be paused.
            </p>
            <div className="flex gap-3 justify-end mt-2">
              <button
                type="button"
                onClick={() => setClearOpen(false)}
                className="px-4 py-2 text-sm border border-base-border rounded-md text-base-text-muted hover:text-base-text transition-colors focus-visible:ring-2 focus-visible:ring-base-border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setClearOpen(false);
                  onClear();
                }}
                className="px-4 py-2 text-sm bg-debt-primary text-pink-foreground font-semibold rounded-md hover:bg-debt-primary-hover transition-colors focus-visible:ring-2 focus-visible:ring-debt-primary"
              >
                Clear
              </button>
            </div>
          </Modal>
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="ml-auto px-4 py-2 text-sm bg-pink-primary text-pink-foreground font-semibold rounded-md hover:bg-pink-primary-hover transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-pink-primary"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

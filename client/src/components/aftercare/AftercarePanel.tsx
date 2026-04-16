import { useQuery } from "@tanstack/react-query";
import { clearSession } from "@/services/aftercare/sessionCompleteCookie";
import { getOwnAftercare, aftercareKey, type Aftercare } from "@/services/aftercare/aftercareApi";
import { Button } from "@/components/ui/button";

interface Props {
  subId: string;
}

function AftercareField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-semibold uppercase tracking-wider text-base-text-muted">
        {label}
      </dt>
      <dd className="text-base text-base-text leading-relaxed">{value}</dd>
    </div>
  );
}

function AftercareContent({ aftercare }: { aftercare: Aftercare }) {
  const hasContent =
    aftercare.needs || aftercare.comfort_items || aftercare.contact_phrase || aftercare.notes;

  if (!hasContent) {
    return (
      <p className="text-base-text-muted text-sm">
        No aftercare preferences saved yet. Visit your{" "}
        <a href="/profile/aftercare" className="text-pink-primary underline underline-offset-2">
          aftercare profile
        </a>{" "}
        to add them.
      </p>
    );
  }

  return (
    <dl className="flex flex-col gap-4">
      <AftercareField label="What I need" value={aftercare.needs} />
      <AftercareField label="Comfort items" value={aftercare.comfort_items} />
      <AftercareField label="Ready phrase" value={aftercare.contact_phrase} />
      <AftercareField label="Notes" value={aftercare.notes} />
    </dl>
  );
}

export function AftercarePanel({ subId }: Props) {
  const { data: aftercare, isLoading } = useQuery({
    queryKey: aftercareKey,
    queryFn: getOwnAftercare,
  });

  function dismiss() {
    clearSession(subId);
    window.location.reload();
  }

  return (
    <section
      aria-live="polite"
      className="bg-pink-primary/10 border border-pink-primary/30 rounded-xl p-6 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-pink-primary">
            Aftercare reminder
          </h2>
          <p className="text-sm text-base-text-muted mt-0.5">
            Your Goddess has marked a session complete. Take care of yourself.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={dismiss}
          aria-label="Dismiss aftercare reminder"
          className="shrink-0"
        >
          Dismiss
        </Button>
      </div>

      {isLoading ? (
        <p className="text-base-text-muted text-sm">Loading your aftercare profile…</p>
      ) : aftercare ? (
        <AftercareContent aftercare={aftercare} />
      ) : null}
    </section>
  );
}

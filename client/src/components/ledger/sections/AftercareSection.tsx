import { useQuery } from "@tanstack/react-query";
import { aftercareKey, getOwnAftercare } from "@/services/aftercare/aftercareApi";
import { formatLondon } from "@/services/format/datetime";
import { Badge } from "@/components/ui/badge";
import {
  LedgerSection,
  LedgerEmpty,
  LedgerError,
  LedgerLoading,
} from "@/components/ledger/LedgerSection";

function isEmpty(aftercare: Awaited<ReturnType<typeof getOwnAftercare>>): boolean {
  return (
    !aftercare.needs &&
    !aftercare.comfort_items &&
    !aftercare.contact_phrase &&
    !aftercare.notes
  );
}

export function AftercareSection() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: aftercareKey,
    queryFn: getOwnAftercare,
    retry: false,
  });

  return (
    <LedgerSection title="Aftercare" updatedAt={data?.updated_at}>
      {isLoading && <LedgerLoading />}
      {isError && <LedgerError message={(error as Error | undefined)?.message} />}
      {!isLoading && !isError && data && isEmpty(data) && (
        <LedgerEmpty message="No aftercare preferences recorded yet." />
      )}
      {data && !isEmpty(data) && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="info">Intensity {data.intensity} / 5</Badge>
            {data.read_by_goddess_at && (
              <span className="text-xs text-status-success">
                Read on {formatLondon(data.read_by_goddess_at, "datetime")}
              </span>
            )}
          </div>

          {data.needs && (
            <div>
              <p className="text-xs text-base-text-muted uppercase tracking-wide">Needs</p>
              <p className="text-sm text-base-text whitespace-pre-wrap">{data.needs}</p>
            </div>
          )}
          {data.comfort_items && (
            <div>
              <p className="text-xs text-base-text-muted uppercase tracking-wide">Comfort items</p>
              <p className="text-sm text-base-text whitespace-pre-wrap">{data.comfort_items}</p>
            </div>
          )}
          {data.contact_phrase && (
            <div>
              <p className="text-xs text-base-text-muted uppercase tracking-wide">
                Contact phrase
              </p>
              <p className="text-sm text-base-text whitespace-pre-wrap">{data.contact_phrase}</p>
            </div>
          )}
          {data.notes && (
            <div>
              <p className="text-xs text-base-text-muted uppercase tracking-wide">Notes</p>
              <p className="text-sm text-base-text whitespace-pre-wrap">{data.notes}</p>
            </div>
          )}
        </div>
      )}
    </LedgerSection>
  );
}

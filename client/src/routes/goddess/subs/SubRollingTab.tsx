import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RollingReadonlyPanel } from "@/components/rolling/RollingReadonlyPanel";
import { RollingForm } from "@/components/rolling/RollingForm";
import {
  clearRollingApi,
  getRollingApi,
  upsertRollingApi,
  type RollingTributeIn,
} from "@/services/rolling/rollingApi";
import { queryKeys } from "@/lib/queryKeys";

interface Props {
  subId: string;
}

type Banner = { kind: "success" | "error"; message: string };

export function SubRollingTab({ subId }: Props) {
  const qc = useQueryClient();
  const [banner, setBanner] = useState<Banner | null>(null);

  const {
    data: tribute,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.rolling.bySubId(subId),
    queryFn: () => getRollingApi(subId),
    enabled: subId.length > 0,
  });

  const upsertMutation = useMutation({
    mutationFn: (body: RollingTributeIn) => upsertRollingApi(subId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.rolling.bySubId(subId) });
      setBanner({ kind: "success", message: "Rolling tribute saved." });
    },
    onError: (err: Error) => {
      setBanner({ kind: "error", message: err.message });
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => clearRollingApi(subId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.rolling.bySubId(subId) });
      setBanner({ kind: "success", message: "Rolling tribute cleared." });
    },
    onError: (err: Error) => {
      setBanner({ kind: "error", message: err.message });
    },
  });

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {banner && (
        <p
          role="status"
          className={`text-sm rounded-md px-4 py-2 ${
            banner.kind === "success"
              ? "bg-status-success/10 text-status-success border border-status-success/30"
              : "bg-debt-muted text-status-danger border border-debt-ring"
          }`}
        >
          {banner.message}
        </p>
      )}

      {isLoading && <p className="text-base-text-muted text-sm">Loading…</p>}
      {isError && (
        <p className="text-status-danger text-sm">Failed to load rolling tribute config.</p>
      )}

      {!isLoading && !isError && tribute && <RollingReadonlyPanel tribute={tribute} />}

      {!isLoading && !isError && (
        <RollingForm
          initial={tribute ?? null}
          onSave={(data) => {
            setBanner(null);
            upsertMutation.mutate(data);
          }}
          onClear={() => {
            setBanner(null);
            clearMutation.mutate();
          }}
          isSaving={upsertMutation.isPending}
          isClearing={clearMutation.isPending}
          error={null}
        />
      )}
    </div>
  );
}

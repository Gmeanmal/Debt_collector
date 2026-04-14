import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RollingReadonlyPanel } from "@/components/rolling/RollingReadonlyPanel";
import { RollingForm } from "@/components/rolling/RollingForm";
import {
  clearRollingApi,
  getRollingApi,
  upsertRollingApi,
  type RollingTributeIn,
} from "@/services/rolling/rollingApi";

export function RollingEditorRoute() {
  const { subId } = useParams<{ subId: string }>();
  const qc = useQueryClient();
  const [banner, setBanner] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const safeSubId = subId ?? "";

  const {
    data: tribute,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["rolling", safeSubId],
    queryFn: () => getRollingApi(safeSubId),
    enabled: safeSubId.length > 0,
  });

  const upsertMutation = useMutation({
    mutationFn: (body: RollingTributeIn) => upsertRollingApi(safeSubId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rolling", safeSubId] });
      setBanner({ kind: "success", message: "Rolling tribute saved." });
    },
    onError: (err: Error) => {
      setBanner({ kind: "error", message: err.message });
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => clearRollingApi(safeSubId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rolling", safeSubId] });
      setBanner({ kind: "success", message: "Rolling tribute cleared." });
    },
    onError: (err: Error) => {
      setBanner({ kind: "error", message: err.message });
    },
  });

  if (!safeSubId) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-status-danger text-sm">No sub ID in route.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Rolling Tribute
          </h1>
          <p className="text-sm text-base-text-muted mt-1">Sub: {safeSubId}</p>
        </div>

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
    </div>
  );
}

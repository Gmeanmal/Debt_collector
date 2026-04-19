import { useQuery } from "@tanstack/react-query";
import { Avatar } from "@/components/profile/Avatar";
import { Badge } from "@/components/ui/badge";
import { queryKeys } from "@/lib/queryKeys";
import { getSubTopApprovedPhoto } from "@/services/goddessSubDetail/goddessSubDetailApi";

// TODO(backend): GoddessSub from listGoddessSubsApi does not expose real_name.
// When the backend exposes it, add it to the identity strip below (goddess-only mask).

type StatusBadgeVariant = "ok" | "bad" | "warn" | "default";

const STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  active: "ok",
  blacklisted: "bad",
  pending_entry_tribute: "warn",
};

function statusVariant(status: string): StatusBadgeVariant {
  return STATUS_VARIANT[status] ?? "default";
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

interface SubProfileCardProps {
  sub: {
    id?: string;
    display_name: string;
    username: string;
    status: string;
    avatar_key?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  };
  isLoading?: boolean;
}

interface PhotoAvatarProps {
  subId: string;
  displayName: string;
  fallback: React.ReactNode;
}

function PhotoAvatar({ subId, displayName, fallback }: PhotoAvatarProps) {
  const { data: photo } = useQuery({
    queryKey: queryKeys.subPhotos.topApproved(subId),
    queryFn: () => getSubTopApprovedPhoto(subId),
    enabled: subId.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  if (photo) {
    return (
      <div className="relative h-16 w-16 shrink-0">
        <img
          src={photo.presigned_get_url}
          alt={displayName}
          loading="lazy"
          className="h-16 w-16 rounded-full object-cover border-2 border-line"
        />
      </div>
    );
  }

  return <>{fallback}</>;
}

export function SubProfileCard({ sub, isLoading = false }: SubProfileCardProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-4 bg-bg-elev border border-line rounded-[10px] p-[18px]">
        <div className="h-16 w-16 rounded-full bg-bg-inset animate-pulse" />
        <div className="flex flex-col gap-2">
          <div className="h-6 w-40 rounded bg-bg-inset animate-pulse" />
          <div className="h-4 w-24 rounded bg-bg-inset animate-pulse" />
        </div>
      </div>
    );
  }

  const avatarFallback = <Avatar user={sub} size="lg" />;

  return (
    <div className="flex items-start gap-4 bg-bg-elev border border-line rounded-[10px] p-[18px]">
      {sub.id ? (
        <PhotoAvatar subId={sub.id} displayName={sub.display_name} fallback={avatarFallback} />
      ) : (
        avatarFallback
      )}
      <div className="flex flex-col gap-1.5 min-w-0">
        <h2 className="font-serif italic text-2xl text-text truncate">
          {sub.display_name}
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[11px] tracking-[0.08em] text-text-faint">
            @{sub.username}
          </span>
          <Badge variant={statusVariant(sub.status)}>{statusLabel(sub.status)}</Badge>
        </div>
        {(sub.first_name ?? sub.last_name) && (
          <p className="text-sm text-text-mute">
            {[sub.first_name, sub.last_name].filter(Boolean).join(" ")}
          </p>
        )}
      </div>
    </div>
  );
}

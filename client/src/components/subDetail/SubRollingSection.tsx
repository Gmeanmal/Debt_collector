import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { RollingReadonlyPanel } from "@/components/rolling/RollingReadonlyPanel";
import { getRollingApi } from "@/services/rolling/rollingApi";
import { queryKeys } from "@/lib/queryKeys";

interface Props {
  subId: string;
  username: string;
}

export function SubRollingSection({ subId, username }: Props) {
  const {
    data: tribute,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.rolling.bySubId(subId),
    queryFn: () => getRollingApi(subId),
  });

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-pink-primary">Rolling tribute</h2>
        <Link
          to={`/goddess/subs/${username}/rolling`}
          className="text-xs text-pink-primary hover:text-pink-primary-hover underline focus-visible:ring-2 focus-visible:ring-pink-primary rounded"
        >
          Edit
        </Link>
      </div>
      {isLoading && <p className="text-base-text-muted text-sm">Loading…</p>}
      {isError && (
        <p className="text-base-text-muted text-sm italic">No rolling tribute configured.</p>
      )}
      {!isLoading && !isError && tribute && <RollingReadonlyPanel tribute={tribute} />}
    </section>
  );
}

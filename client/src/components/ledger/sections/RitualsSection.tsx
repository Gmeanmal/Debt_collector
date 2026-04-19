import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { fetchOwnRituals } from "@/api/today";
import { RitualSchema, type Ritual } from "@/services/today/todayApi";
import { queryKeys } from "@/lib/queryKeys";
import { Badge } from "@/components/ui/badge";
import {
  LedgerSection,
  LedgerEmpty,
  LedgerError,
  LedgerLoading,
} from "@/components/ledger/LedgerSection";

async function fetchOwnRitualsParsed(): Promise<Ritual[]> {
  const raw = await fetchOwnRituals();
  return z.array(RitualSchema).parse(raw);
}

const FREQUENCY_LABEL: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  custom: "Custom days",
};

function formatFrequency(frequency: string): string {
  return FREQUENCY_LABEL[frequency] ?? frequency;
}

function RitualRow({ ritual }: { ritual: Ritual }) {
  return (
    <li className="flex flex-col gap-1 py-2 border-b border-line/40 last:border-b-0">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm text-text font-semibold">{ritual.title}</span>
        <div className="flex items-center gap-2">
          <Badge variant="neutral">{formatFrequency(ritual.frequency)}</Badge>
          {ritual.paused && <Badge variant="warn">Paused</Badge>}
        </div>
      </div>
      {ritual.description && <p className="text-xs text-text-mute">{ritual.description}</p>}
      <div className="flex items-center gap-3 text-xs text-text-mute flex-wrap">
        {ritual.deadline_time && <span>Deadline {ritual.deadline_time}</span>}
        <span>
          Reward {ritual.points_on_complete} pt
          {ritual.points_on_complete === 1 ? "" : "s"}
        </span>
        <span>
          Penalty {ritual.points_on_miss} pt
          {ritual.points_on_miss === 1 ? "" : "s"}
        </span>
      </div>
    </li>
  );
}

export function RitualsSection() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.today.ritualsList(),
    queryFn: fetchOwnRitualsParsed,
  });

  const rituals = data ?? [];

  return (
    <LedgerSection title="Rituals">
      {isLoading && <LedgerLoading />}
      {isError && <LedgerError message={(error as Error | undefined)?.message} />}
      {!isLoading && !isError && rituals.length === 0 && (
        <LedgerEmpty message="No rituals assigned." />
      )}
      {rituals.length > 0 && (
        <ul className="flex flex-col">
          {rituals.map((r) => (
            <RitualRow key={r.id} ritual={r} />
          ))}
        </ul>
      )}
    </LedgerSection>
  );
}

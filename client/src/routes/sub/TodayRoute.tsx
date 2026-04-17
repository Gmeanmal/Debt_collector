import { useQuery } from "@tanstack/react-query";
import { RitualCard } from "@/components/today/RitualCard";
import { TaskCard } from "@/components/today/TaskCard";
import { JournalCTA } from "@/components/today/JournalCTA";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  getTodayOccurrences,
  getOpenTasks,
  todayRitualsKey,
  todayTasksKey,
} from "@/services/today/todayApi";

function TodayDate() {
  const label = new Date().toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return <p className="text-sm text-base-text-muted mt-1">{label}</p>;
}

export function TodayRoute() {
  const ritualsQuery = useQuery({
    queryKey: todayRitualsKey,
    queryFn: getTodayOccurrences,
  });

  const tasksQuery = useQuery({
    queryKey: todayTasksKey,
    queryFn: getOpenTasks,
  });

  const occurrences = ritualsQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Today
          </h1>
          <TodayDate />
        </div>

        <section aria-labelledby="rituals-heading" className="flex flex-col gap-3">
          <h2 id="rituals-heading" className="font-display text-lg text-pink-primary">
            Rituals
          </h2>

          {ritualsQuery.isLoading && <ListSkeleton rows={2} />}

          {ritualsQuery.isError && (
            <ErrorState
              title="Failed to load rituals"
              message={(ritualsQuery.error as Error).message}
            />
          )}

          {!ritualsQuery.isLoading && !ritualsQuery.isError && occurrences.length === 0 && (
            <EmptyState title="No ritual tonight — rest. Tomorrow she remembers." />
          )}

          {occurrences.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {occurrences.map((item) => (
                <RitualCard key={item.occurrence.id} data={item} />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="tasks-heading" className="flex flex-col gap-3">
          <h2 id="tasks-heading" className="font-display text-lg text-pink-primary">
            Open tasks
          </h2>

          {tasksQuery.isLoading && <ListSkeleton rows={2} />}

          {tasksQuery.isError && (
            <ErrorState
              title="Failed to load tasks"
              message={(tasksQuery.error as Error).message}
            />
          )}

          {!tasksQuery.isLoading && !tasksQuery.isError && tasks.length === 0 && (
            <EmptyState
              title="No open tasks"
              message="You have no tasks pending completion right now."
            />
          )}

          {tasks.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="journal-heading" className="flex flex-col gap-3">
          <h2 id="journal-heading" className="font-display text-lg text-pink-primary">
            Journal
          </h2>
          <JournalCTA />
        </section>
      </div>
    </div>
  );
}

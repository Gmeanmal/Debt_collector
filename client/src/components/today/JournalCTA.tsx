import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function JournalCTA() {
  return (
    <div className="bg-base-surface border border-base-border rounded-lg p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-base-text text-sm">Today's journal</p>
        <p className="text-xs text-base-text-muted">
          Record your thoughts, reflections, and devotion for today.
        </p>
      </div>
      <Button variant="secondary" size="sm" asChild>
        <Link to="/profile/journal/new" aria-label="Write today's journal entry">
          Write entry
        </Link>
      </Button>
    </div>
  );
}

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function JournalCTA() {
  return (
    <div className="bg-bg-elev border border-line rounded-[10px] p-[18px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <p className="font-serif italic text-text text-sm">Today's journal</p>
        <p className="text-xs text-text-mute">
          Record your thoughts, reflections, and devotion for today.
        </p>
      </div>
      <Button variant="ghost" size="sm" asChild>
        <Link to="/profile/journal/new" aria-label="Write today's journal entry">
          Write entry
        </Link>
      </Button>
    </div>
  );
}

import { useState } from "react";
import { markSessionComplete } from "@/services/aftercare/sessionCompleteCookie";
import { Button } from "@/components/ui/button";

interface Props {
  subId: string;
}

export function SessionCompleteToggle({ subId }: Props) {
  const [marked, setMarked] = useState(false);

  function handleMark() {
    markSessionComplete(subId);
    setMarked(true);
  }

  if (marked) {
    return (
      <p className="text-sm text-status-success font-medium">
        Session marked complete. Aftercare reminder active for 30 minutes.
      </p>
    );
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleMark}>
      Mark session complete
    </Button>
  );
}

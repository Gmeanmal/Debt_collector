import type { ReactNode } from "react";

interface Props {
  title?: string;
  message?: ReactNode;
  cta?: ReactNode;
}

export function ErrorState({ title = "Something went wrong", message, cta }: Props) {
  return (
    <div
      role="alert"
      className="bg-bad-bg/40 border border-bad-ink/30 rounded-[10px] p-6 flex flex-col items-center text-center gap-3"
    >
      <p className="font-display italic text-[20px] text-bad-ink">{title}</p>
      {message && <p className="text-sm text-text-mute max-w-md break-words">{message}</p>}
      {cta && <div className="mt-1">{cta}</div>}
    </div>
  );
}

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
      className="bg-debt-muted border border-debt-ring rounded-lg p-5 flex flex-col gap-2"
    >
      <p className="text-status-danger font-semibold text-sm">{title}</p>
      {message && <p className="text-status-danger/90 text-sm break-words">{message}</p>}
      {cta && <div className="mt-1">{cta}</div>}
    </div>
  );
}

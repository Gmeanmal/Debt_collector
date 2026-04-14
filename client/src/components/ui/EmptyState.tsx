import type { ReactNode } from "react";

interface Props {
  title: string;
  message?: ReactNode;
  icon?: ReactNode;
  cta?: ReactNode;
}

export function EmptyState({ title, message, icon, cta }: Props) {
  return (
    <div className="bg-base-surface border border-base-border border-dashed rounded-lg p-8 flex flex-col items-center text-center gap-3">
      {icon && (
        <div className="text-3xl text-base-text-subtle" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="text-base-text font-semibold text-sm">{title}</p>
      {message && <p className="text-base-text-muted text-sm max-w-md">{message}</p>}
      {cta && <div className="mt-1">{cta}</div>}
    </div>
  );
}

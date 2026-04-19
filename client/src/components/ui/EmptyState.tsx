import type { ReactNode } from "react";

interface Props {
  title: string;
  message?: ReactNode;
  icon?: ReactNode;
  cta?: ReactNode;
}

export function EmptyState({ title, message, icon, cta }: Props) {
  return (
    <div className="bg-bg-elev border border-line rounded-[10px] p-8 flex flex-col items-center text-center gap-3">
      {icon && (
        <div className="text-text-faint" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="font-display italic text-[20px] text-text">{title}</p>
      {message && <p className="text-sm text-text-mute max-w-md">{message}</p>}
      {cta && <div className="mt-1">{cta}</div>}
    </div>
  );
}

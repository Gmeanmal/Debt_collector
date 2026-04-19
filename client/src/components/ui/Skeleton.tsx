interface Props {
  className?: string;
  label?: string;
}

export function Skeleton({ className = "h-4 w-full", label = "Loading" }: Props) {
  return (
    <div
      role="status"
      aria-label={label}
      className={`animate-pulse rounded-[6px] bg-bg-inset ${className}`}
    />
  );
}

interface ListSkeletonProps {
  rows?: number;
}

export function ListSkeleton({ rows = 3 }: ListSkeletonProps) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Loading list">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="bg-bg-elev border border-line rounded-[10px] p-4 animate-pulse flex flex-col gap-2"
        >
          <div className="h-4 w-1/3 rounded-[6px] bg-bg-inset" />
          <div className="h-3 w-2/3 rounded-[6px] bg-bg-inset" />
        </div>
      ))}
    </div>
  );
}

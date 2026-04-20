import { Button } from "@/components/ui/button";

interface Props {
  label: string;
  total: number;
  qDraft: string;
  onQDraftChange: (v: string) => void;
  onSearch: (e: React.FormEvent) => void;
  onExportCsv: () => void;
  canCreate: boolean;
  onNew: () => void;
  isUsers: boolean;
  roleFilter: string;
  onRoleFilter: (v: string) => void;
  statusFilter: string;
  onStatusFilter: (v: string) => void;
}

const USER_ROLES = ["all", "sub", "goddess", "admin"] as const;
const USER_STATUSES = ["all", "active", "pending_entry_tribute", "blacklisted", "deleted"] as const;

const selectClass =
  "px-3 py-1.5 text-sm bg-bg-sunken border border-line rounded-md text-text focus-visible:ring-2 focus-visible:ring-accent";

export function AdminTableToolbar({
  label,
  total,
  qDraft,
  onQDraftChange,
  onSearch,
  onExportCsv,
  canCreate,
  onNew,
  isUsers,
  roleFilter,
  onRoleFilter,
  statusFilter,
  onStatusFilter,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <h2 className="font-serif italic text-xl text-text tracking-tight">{label}</h2>
        <span className="font-mono text-[10px] text-text-faint uppercase tracking-[0.14em]">
          {total} total
        </span>
        <form onSubmit={onSearch} className="flex items-center gap-2 sm:ml-auto flex-wrap">
          <input
            type="search"
            placeholder="Search…"
            value={qDraft}
            onChange={(e) => onQDraftChange(e.target.value)}
            className="flex-1 min-w-0 px-3 py-1.5 text-sm bg-bg-sunken border border-line rounded-md text-text focus-visible:ring-2 focus-visible:ring-accent"
          />
          <Button type="submit" variant="ghost" size="sm">
            Search
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onExportCsv}
            aria-label="Export CSV"
          >
            Export CSV
          </Button>
          {canCreate && (
            <Button type="button" variant="primary" size="sm" onClick={onNew}>
              + New
            </Button>
          )}
        </form>
      </div>
      {isUsers && (
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={roleFilter}
            onChange={(e) => onRoleFilter(e.target.value)}
            aria-label="Filter by role"
            className={selectClass}
          >
            {USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {r === "all" ? "All roles" : r}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className={selectClass}
          >
            {USER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

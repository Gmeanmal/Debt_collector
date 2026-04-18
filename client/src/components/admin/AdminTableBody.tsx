import type { ColumnDef } from "@/services/admin/entitySchemas";
import { StatusPill } from "@/components/admin/StatusPill";
import { isStatusColumn } from "@/components/admin/statusUtils";
import { formatGBP } from "@/services/format/currency";

interface Props {
  columns: ColumnDef[];
  items: Record<string, unknown>[];
  isLoading: boolean;
  isReadonly: boolean;
  isUsers: boolean;
  onRowClick: (row: Record<string, unknown>) => void;
  onImpersonate: (row: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}

function formatCell(value: unknown, format?: string): string {
  if (value == null) return "—";
  if (format === "currency") return formatGBP(value as number | string);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  const str = String(value);
  return str.length > 60 ? `${str.slice(0, 57)}…` : str;
}

export function AdminTableBody({
  columns,
  items,
  isLoading,
  isReadonly,
  isUsers,
  onRowClick,
  onImpersonate,
  onDelete,
}: Props) {
  return (
    <tbody>
      {isLoading && (
        <tr>
          <td colSpan={columns.length + 1} className="px-3 py-4 text-center text-base-text-subtle">
            Loading…
          </td>
        </tr>
      )}
      {items.map((row) => {
        const id = String(row.id ?? "");
        return (
          <tr
            key={id}
            className={`border-b border-base-border hover:bg-base-surface-raised ${isReadonly ? "" : "cursor-pointer"}`}
            onClick={() => {
              if (!isReadonly) onRowClick(row);
            }}
          >
            {columns.map((col) => (
              <td key={col.key} className="px-3 py-2 text-base-text align-top">
                {col.isStatus || isStatusColumn(col.key) ? (
                  <StatusPill value={row[col.key]} />
                ) : (
                  formatCell(row[col.key], col.format)
                )}
              </td>
            ))}
            <td className="px-3 py-2 text-right">
              <div className="flex items-center justify-end gap-3">
                {isUsers && row.role !== "admin" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onImpersonate(row);
                    }}
                    aria-label={`Impersonate ${String(row.display_name ?? row.username ?? "user")}`}
                    className="text-xs text-pink-primary hover:underline"
                  >
                    Impersonate
                  </button>
                )}
                {!isReadonly && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(id);
                    }}
                    aria-label="Delete row"
                    className="text-xs text-status-danger hover:underline"
                  >
                    Delete
                  </button>
                )}
              </div>
            </td>
          </tr>
        );
      })}
      {!isLoading && items.length === 0 && (
        <tr>
          <td colSpan={columns.length + 1} className="px-3 py-4 text-center text-base-text-subtle">
            No rows.
          </td>
        </tr>
      )}
    </tbody>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminList, adminDelete } from "@/services/admin/adminApi";
import type { EntitySchema } from "@/services/admin/entitySchemas";
import { AdminForm } from "@/components/admin/AdminForm";
import { useAuth } from "@/services/auth/useAuth";

interface AdminTableProps {
  schema: EntitySchema;
}

const PAGE_SIZE = 25;

const USER_ROLES = ["all", "sub", "goddess", "admin"] as const;
const USER_STATUSES = ["all", "active", "pending_entry_tribute", "blacklisted", "deleted"] as const;

function formatCell(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  const str = String(value);
  return str.length > 60 ? `${str.slice(0, 57)}…` : str;
}

const selectClass =
  "px-3 py-1.5 text-sm bg-base-surface-raised border border-base-border rounded-md text-base-text focus-visible:ring-2 focus-visible:ring-violet-primary";

export function AdminTable({ schema }: AdminTableProps) {
  const [q, setQ] = useState("");
  const [qDraft, setQDraft] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [creating, setCreating] = useState(false);
  const [roleFilter, setRoleFilter] = useState<(typeof USER_ROLES)[number]>("all");
  const [statusFilter, setStatusFilter] = useState<(typeof USER_STATUSES)[number]>("all");

  const queryClient = useQueryClient();
  const { impersonate } = useAuth();
  const queryKey = ["admin", schema.entity, q, page] as const;
  const isUsers = schema.entity === "users";
  const isReadonly = schema.readonly === true;

  const query = useQuery({
    queryKey,
    queryFn: () => adminList(schema.entity, { q: q || undefined, page, page_size: PAGE_SIZE }),
  });

  const filteredItems = (query.data?.items ?? []).filter((row) => {
    if (!isUsers) return true;
    const roleOk = roleFilter === "all" || row.role === roleFilter;
    const statusOk = statusFilter === "all" || row.status === statusFilter;
    return roleOk && statusOk;
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDelete(schema.entity, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", schema.entity] }),
  });

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setQ(qDraft.trim());
  }

  function handleDelete(id: string) {
    if (!window.confirm("Delete this row?")) return;
    deleteMutation.mutate(id);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="font-display text-xl font-bold text-violet-primary tracking-wider">
          {schema.label}
        </h2>
        <span className="text-xs text-base-text-subtle">{total} total</span>
        <form onSubmit={submitSearch} className="flex items-center gap-2 ml-auto">
          <input
            type="search"
            placeholder="Search…"
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            className="px-3 py-1.5 text-sm bg-base-surface-raised border border-base-border rounded-md text-base-text focus-visible:ring-2 focus-visible:ring-violet-primary"
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-sm bg-base-surface-raised border border-base-border rounded-md text-base-text hover:bg-base-surface"
          >
            Search
          </button>
          {!isReadonly && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="px-3 py-1.5 text-sm bg-violet-primary text-violet-foreground font-semibold rounded-md hover:bg-violet-primary-hover"
            >
              + New
            </button>
          )}
        </form>
      </div>

      {isUsers && (
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as (typeof USER_ROLES)[number])}
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
            onChange={(e) => setStatusFilter(e.target.value as (typeof USER_STATUSES)[number])}
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

      {query.isError && (
        <p className="text-sm text-status-danger">{(query.error as Error).message}</p>
      )}

      <div className="overflow-x-auto border border-base-border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-base-surface-raised">
            <tr>
              {schema.columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-3 py-2 font-semibold text-base-text-muted border-b border-base-border"
                >
                  {col.label}
                </th>
              ))}
              <th className="px-3 py-2 border-b border-base-border w-40"></th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading && (
              <tr>
                <td
                  colSpan={schema.columns.length + 1}
                  className="px-3 py-4 text-center text-base-text-subtle"
                >
                  Loading…
                </td>
              </tr>
            )}
            {filteredItems.map((row) => {
              const id = String(row.id ?? "");
              return (
                <tr
                  key={id}
                  className={`border-b border-base-border hover:bg-base-surface-raised ${isReadonly ? "" : "cursor-pointer"}`}
                  onClick={() => { if (!isReadonly) setEditing(row); }}
                >
                  {schema.columns.map((col) => (
                    <td key={col.key} className="px-3 py-2 text-base-text align-top">
                      {formatCell(row[col.key])}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {isUsers && row.role !== "admin" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void impersonate(id);
                          }}
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
                            handleDelete(id);
                          }}
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
            {query.data && filteredItems.length === 0 && (
              <tr>
                <td
                  colSpan={schema.columns.length + 1}
                  className="px-3 py-4 text-center text-base-text-subtle"
                >
                  No rows.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-3 py-1.5 bg-base-surface-raised border border-base-border rounded-md disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-base-text-muted">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1.5 bg-base-surface-raised border border-base-border rounded-md disabled:opacity-40"
        >
          Next
        </button>
      </div>

      {!isReadonly && editing && (
        <AdminForm
          schema={schema}
          mode="edit"
          initialData={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ["admin", schema.entity] });
          }}
        />
      )}
      {!isReadonly && creating && (
        <AdminForm
          schema={schema}
          mode="create"
          initialData={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            queryClient.invalidateQueries({ queryKey: ["admin", schema.entity] });
          }}
        />
      )}
    </div>
  );
}

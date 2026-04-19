import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminList, adminDelete, adminExportCsv } from "@/services/admin/adminApi";
import type { EntitySchema } from "@/services/admin/entitySchemas";
import { ImpersonateConfirmModal } from "@/components/admin/ImpersonateConfirmModal";
import { DeleteConfirmModal } from "@/components/admin/DeleteConfirmModal";
import { AdminTableBody } from "@/components/admin/AdminTableBody";
import { AdminTableToolbar } from "@/components/admin/AdminTableToolbar";
import { AdminForm } from "@/components/admin/AdminForm";
import { useAuth } from "@/services/auth/useAuth";
import { queryKeys } from "@/lib/queryKeys";

interface AdminTableProps {
  schema: EntitySchema;
}

type SortDir = "asc" | "desc" | null;

const PAGE_SIZE = 25;

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "en-GB");
}

export function AdminTable({ schema }: AdminTableProps) {
  const [q, setQ] = useState("");
  const [qDraft, setQDraft] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [creating, setCreating] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [impersonateTarget, setImpersonateTarget] = useState<Record<string, unknown> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const queryClient = useQueryClient();
  const { impersonate } = useAuth();
  const queryKey = queryKeys.admin.list(schema.entity, q, page);
  const isUsers = schema.entity === "users";
  const isReadonly = schema.readonly === true;
  const canCreate = schema.canCreate !== false && !isReadonly;

  const query = useQuery({
    queryKey,
    queryFn: () => adminList(schema.entity, { q: q || undefined, page, page_size: PAGE_SIZE }),
  });

  const rawItems = (query.data?.items ?? []).filter((row) => {
    if (!isUsers) return true;
    return (
      (roleFilter === "all" || row.role === roleFilter) &&
      (statusFilter === "all" || row.status === statusFilter)
    );
  });

  const filteredItems =
    sortKey && sortDir
      ? [...rawItems].sort((a, b) => {
          const cmp = compareValues(a[sortKey], b[sortKey]);
          return sortDir === "asc" ? cmp : -cmp;
        })
      : rawItems;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDelete(schema.entity, id),
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.entity(schema.entity) });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setQ(qDraft.trim());
  }

  function handleSortClick(key: string) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortKey(null);
      setSortDir(null);
    }
  }

  async function handleImpersonateConfirm() {
    if (!impersonateTarget) return;
    setIsImpersonating(true);
    try {
      await impersonate(String(impersonateTarget.id ?? ""));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impersonation failed");
    } finally {
      setIsImpersonating(false);
      setImpersonateTarget(null);
    }
  }

  async function handleExportCsv() {
    try {
      const blob = await adminExportCsv(schema.entity);
      const date = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${schema.entity}-${date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export ready");
    } catch {
      toast.error("Export failed");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminTableToolbar
        label={schema.label}
        total={total}
        qDraft={qDraft}
        onQDraftChange={setQDraft}
        onSearch={submitSearch}
        onExportCsv={() => void handleExportCsv()}
        canCreate={canCreate}
        onNew={() => setCreating(true)}
        isUsers={isUsers}
        roleFilter={roleFilter}
        onRoleFilter={setRoleFilter}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
      />

      {query.isError && (
        <p className="text-sm text-status-danger">{(query.error as Error).message}</p>
      )}

      <div className="overflow-x-auto border border-base-border rounded-md">
        <table className="min-w-[640px] w-full text-sm">
          <thead className="bg-base-surface-raised">
            <tr>
              {schema.columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-3 py-2 font-semibold text-base-text-muted border-b border-base-border"
                >
                  {col.sortable !== false ? (
                    <button
                      type="button"
                      onClick={() => handleSortClick(col.key)}
                      aria-label={`Sort by ${col.label}`}
                      className="flex items-center gap-1 hover:text-base-text focus-visible:ring-1 focus-visible:ring-violet-primary rounded"
                    >
                      {col.label}
                      <span className="text-xs w-3 inline-block text-center">
                        {sortKey === col.key ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </span>
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
              <th className="px-3 py-2 border-b border-base-border w-40"></th>
            </tr>
          </thead>
          <AdminTableBody
            columns={schema.columns}
            items={filteredItems}
            isLoading={query.isLoading}
            isReadonly={isReadonly}
            isUsers={isUsers}
            onRowClick={setEditing}
            onImpersonate={setImpersonateTarget}
            onDelete={setDeleteTarget}
          />
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

      {impersonateTarget && (
        <ImpersonateConfirmModal
          displayName={String(
            impersonateTarget.display_name ?? impersonateTarget.username ?? "user",
          )}
          onConfirm={() => void handleImpersonateConfirm()}
          onCancel={() => setImpersonateTarget(null)}
          isPending={isImpersonating}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          onConfirm={() => deleteMutation.mutate(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
          isPending={deleteMutation.isPending}
        />
      )}

      {!isReadonly && editing && (
        <AdminForm
          schema={schema}
          mode="edit"
          initialData={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.entity(schema.entity) });
          }}
        />
      )}
      {canCreate && creating && (
        <AdminForm
          schema={schema}
          mode="create"
          initialData={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.entity(schema.entity) });
          }}
        />
      )}
    </div>
  );
}

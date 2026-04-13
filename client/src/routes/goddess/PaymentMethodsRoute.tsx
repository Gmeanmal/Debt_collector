import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PaymentMethodForm } from "@/components/paymentMethods/PaymentMethodForm";
import {
  createPaymentMethodApi,
  deletePaymentMethodApi,
  listPaymentMethodsApi,
  reorderPaymentMethodsApi,
  updatePaymentMethodApi,
  type PaymentMethodCreate,
  type PaymentMethodOut,
} from "@/services/paymentMethods/paymentMethodsApi";

const TYPE_COLOURS: Record<string, string> = {
  throne: "bg-pink-muted text-pink-primary",
  paypal: "bg-base-surface-raised text-status-info",
  bank: "bg-base-surface-raised text-status-success",
  other: "bg-base-surface-raised text-base-text-muted",
};

interface SortableCardProps {
  method: PaymentMethodOut;
  onEdit: (m: PaymentMethodOut) => void;
  onDelete: (id: string) => void;
}

function SortableCard({ method, onEdit, onDelete }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: method.id,
  });

  const transformStr = CSS.Transform.toString(transform);

  const applyDragVars = useCallback(
    (el: HTMLDivElement | null) => {
      setNodeRef(el);
      if (el) {
        el.style.setProperty("--dnd-transform", transformStr ?? "none");
        el.style.setProperty("--dnd-transition", transition ?? "");
      }
    },
    [setNodeRef, transformStr, transition],
  );

  return (
    <div
      ref={applyDragVars}
      className="bg-base-surface border border-base-border rounded-lg p-4 flex items-center gap-3 [transform:var(--dnd-transform)] [transition:var(--dnd-transition)]"
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="text-base-text-subtle cursor-grab active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-pink-primary rounded"
      >
        ⠿
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-base-text text-sm truncate">{method.name}</span>
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${TYPE_COLOURS[method.type] ?? ""}`}
          >
            {method.type}
          </span>
          {!method.enabled && (
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-debt-muted text-status-danger">
              disabled
            </span>
          )}
        </div>
        <p className="text-xs text-base-text-muted mt-0.5 truncate">{method.handle_or_link}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onEdit(method)}
          aria-label={`Edit ${method.name}`}
          className="text-xs text-base-text-muted hover:text-base-text px-2 py-1 rounded border border-base-border transition-colors focus-visible:ring-2 focus-visible:ring-pink-primary"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(method.id)}
          aria-label={`Delete ${method.name}`}
          className="text-xs text-status-danger hover:text-debt-primary-hover px-2 py-1 rounded border border-debt-muted transition-colors focus-visible:ring-2 focus-visible:ring-debt-primary"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-base-bg/80 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-base-surface border border-base-border rounded-lg w-full max-w-md p-6 shadow-[var(--shadow-card)]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-base-text">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-base-text-muted hover:text-base-text transition-colors focus-visible:ring-2 focus-visible:ring-pink-primary rounded"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PaymentMethodsRoute() {
  const qc = useQueryClient();
  const [editTarget, setEditTarget] = useState<PaymentMethodOut | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const {
    data: methods = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["paymentMethods", "goddess"],
    queryFn: () => listPaymentMethodsApi(false),
  });

  const [localOrder, setLocalOrder] = useState<PaymentMethodOut[]>([]);
  const ordered = localOrder.length > 0 ? localOrder : methods;

  const sensors = useSensors(useSensor(PointerSensor));

  const createMutation = useMutation({
    mutationFn: createPaymentMethodApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["paymentMethods", "goddess"] });
      setLocalOrder([]);
      setShowAdd(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: PaymentMethodCreate }) =>
      updatePaymentMethodApi(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["paymentMethods", "goddess"] });
      setLocalOrder([]);
      setEditTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePaymentMethodApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["paymentMethods", "goddess"] });
      setLocalOrder([]);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: reorderPaymentMethodsApi,
    onError: () => {
      setLocalOrder([]);
    },
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const base = localOrder.length > 0 ? localOrder : methods;
    const oldIndex = base.findIndex((m) => m.id === active.id);
    const newIndex = base.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(base, oldIndex, newIndex);
    setLocalOrder(reordered);
    reorderMutation.mutate(reordered.map((m) => m.id));
  }

  function handleCreate(data: PaymentMethodCreate) {
    createMutation.mutate(data);
  }

  function handleUpdate(data: PaymentMethodCreate) {
    if (!editTarget) return;
    updateMutation.mutate({ id: editTarget.id, patch: data });
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id);
  }

  return (
    <div className="min-h-screen bg-base-bg p-4 md:p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Payment Methods
          </h1>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 text-sm rounded bg-pink-primary text-pink-foreground font-semibold hover:bg-pink-primary-hover transition-colors focus-visible:ring-2 focus-visible:ring-pink-primary"
          >
            Add method
          </button>
        </div>

        {isLoading && <p className="text-base-text-muted text-sm">Loading…</p>}
        {isError && <p className="text-status-danger text-sm">Failed to load payment methods.</p>}

        {!isLoading && !isError && ordered.length === 0 && (
          <p className="text-base-text-muted text-sm">No payment methods yet. Add one above.</p>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ordered.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {ordered.map((method) => (
                <SortableCard
                  key={method.id}
                  method={method}
                  onEdit={setEditTarget}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {showAdd && (
          <Modal title="Add payment method" onClose={() => setShowAdd(false)}>
            <PaymentMethodForm
              onSubmit={handleCreate}
              onCancel={() => setShowAdd(false)}
              isSubmitting={createMutation.isPending}
            />
          </Modal>
        )}

        {editTarget && (
          <Modal title="Edit payment method" onClose={() => setEditTarget(null)}>
            <PaymentMethodForm
              initial={editTarget}
              onSubmit={handleUpdate}
              onCancel={() => setEditTarget(null)}
              isSubmitting={updateMutation.isPending}
            />
          </Modal>
        )}
      </div>
    </div>
  );
}

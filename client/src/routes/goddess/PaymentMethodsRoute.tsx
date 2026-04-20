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
import { MethodIcon } from "@/components/paymentMethods/MethodIcon";
import { METHOD_LABELS } from "@/components/paymentMethods/methodMetadata";
import {
  createPaymentMethodApi,
  deletePaymentMethodApi,
  listPaymentMethodsApi,
  reorderPaymentMethodsApi,
  updatePaymentMethodApi,
  type PaymentMethodCreate,
  type PaymentMethodOut,
  type PaymentMethodUpdate,
} from "@/services/paymentMethods/paymentMethodsApi";
import { queryKeys } from "@/lib/queryKeys";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

interface SortableCardProps {
  method: PaymentMethodOut;
  onEdit: (m: PaymentMethodOut) => void;
  onDisable: (id: string) => void;
  onEnable: (id: string) => void;
}

function SortableCard({ method, onEdit, onDisable, onEnable }: SortableCardProps) {
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
      className="bg-bg-elev border border-line rounded-[10px] p-[18px] flex flex-wrap items-center gap-3 [transform:var(--dnd-transform)] [transition:var(--dnd-transition)]"
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="text-text-faint cursor-grab active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-accent rounded"
      >
        ⠿
      </button>

      <MethodIcon type={method.type} size="lg" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-text text-sm truncate">{method.name}</span>
          <span className="text-xs text-text-faint">{METHOD_LABELS[method.type]}</span>
          {!method.enabled && (
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-bad-bg text-bad-ink">
              disabled
            </span>
          )}
        </div>
        <p className="text-xs text-text-mute mt-0.5 truncate">{method.handle_or_link}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(method)}
          aria-label={`Edit ${method.name}`}
        >
          Edit
        </Button>
        {method.enabled ? (
          <Button
            variant="danger"
            size="sm"
            onClick={() => onDisable(method.id)}
            aria-label={`Disable ${method.name}`}
          >
            Disable
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEnable(method.id)}
            aria-label={`Enable ${method.name}`}
            className="text-ok-ink hover:text-ok-ink"
          >
            Enable
          </Button>
        )}
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-bg-elev border border-line rounded-[10px] w-full max-w-md p-6 shadow-[var(--shadow-card)]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-text">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close modal">
            ✕
          </Button>
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
    queryKey: queryKeys.payments.methods("goddess"),
    queryFn: () => listPaymentMethodsApi(false),
  });

  const [localOrder, setLocalOrder] = useState<PaymentMethodOut[]>([]);
  const ordered = localOrder.length > 0 ? localOrder : methods;

  const sensors = useSensors(useSensor(PointerSensor));

  const createMutation = useMutation({
    mutationFn: createPaymentMethodApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payments.methods("goddess") });
      setLocalOrder([]);
      setShowAdd(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: PaymentMethodUpdate }) =>
      updatePaymentMethodApi(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payments.methods("goddess") });
      setLocalOrder([]);
      setEditTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePaymentMethodApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payments.methods("goddess") });
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

  function handleDisable(id: string) {
    deleteMutation.mutate(id);
  }

  function handleEnable(id: string) {
    updateMutation.mutate({ id, patch: { enabled: true } });
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <PageHeader
          crumbs={["Home · Money · Payment methods"]}
          title={<span className="italic">Payment methods</span>}
          description="Manage the payment methods shown to subs on their dashboard."
          actions={
            <Button variant="primary" onClick={() => setShowAdd(true)}>
              Add method
            </Button>
          }
        />

        {isLoading && <p className="text-text-mute text-sm">Loading…</p>}
        {isError && <p className="text-bad-ink text-sm">Failed to load payment methods.</p>}

        {!isLoading && !isError && ordered.length === 0 && (
          <p className="text-text-mute text-sm">No payment methods yet. Add one above.</p>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ordered.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {ordered.map((method) => (
                <SortableCard
                  key={method.id}
                  method={method}
                  onEdit={setEditTarget}
                  onDisable={handleDisable}
                  onEnable={handleEnable}
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

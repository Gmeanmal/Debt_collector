import { ToyCard } from "@/components/toys/ToyCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ToyItem, ToyCategory } from "@/services/toys/toysApi";

const CATEGORY_ORDER: ToyCategory[] = [
  "collar",
  "restraint",
  "impact",
  "cage",
  "vibrator",
  "plug",
  "gag",
  "clothing",
  "other",
];

const CATEGORY_LABELS: Record<ToyCategory, string> = {
  collar: "Collar",
  restraint: "Restraint",
  impact: "Impact",
  cage: "Cage",
  vibrator: "Vibrator",
  plug: "Plug",
  gag: "Gag",
  clothing: "Clothing",
  other: "Other",
};

interface Props {
  toys: ToyItem[];
  goddessContext?: boolean;
  subId?: string;
  onEdit?: (toy: ToyItem) => void;
  onDelete?: (toyId: string) => void;
}

export function InventoryGrid({ toys, goddessContext = false, subId, onEdit, onDelete }: Props) {
  if (toys.length === 0) {
    return (
      <EmptyState
        title="No toys in inventory"
        message={
          goddessContext
            ? "Add a toy or wait for sub proposals."
            : "No approved toys yet. Propose one for your goddess to review."
        }
      />
    );
  }

  const byCategory = new Map<ToyCategory, ToyItem[]>();
  for (const toy of toys) {
    const bucket = byCategory.get(toy.category) ?? [];
    bucket.push(toy);
    byCategory.set(toy.category, bucket);
  }

  const sectionsInOrder = CATEGORY_ORDER.filter((cat) => byCategory.has(cat));

  return (
    <div className="flex flex-col gap-8">
      {sectionsInOrder.map((category) => {
        const items = byCategory.get(category) ?? [];
        return (
          <section key={category} aria-label={`${CATEGORY_LABELS[category]} toys`}>
            <h3 className="text-xs font-semibold text-base-text-muted uppercase tracking-widest mb-3">
              {CATEGORY_LABELS[category]}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((toy) => (
                <ToyCard
                  key={toy.id}
                  toy={toy}
                  goddessContext={goddessContext}
                  subId={subId}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

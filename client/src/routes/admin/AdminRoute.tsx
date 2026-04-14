import { useState } from "react";
import { AdminTable } from "@/components/admin/AdminTable";
import { ENTITY_SCHEMAS } from "@/services/admin/entitySchemas";

export function AdminRoute() {
  const [active, setActive] = useState<string>(ENTITY_SCHEMAS[0]?.entity ?? "users");
  const schema = ENTITY_SCHEMAS.find((s) => s.entity === active);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6">
        <aside className="md:w-56 flex-shrink-0">
          <h1 className="font-display text-2xl font-bold text-violet-primary tracking-wider mb-4">
            Admin
          </h1>
          <nav className="flex flex-col gap-1">
            {ENTITY_SCHEMAS.map((s) => (
              <button
                key={s.entity}
                type="button"
                onClick={() => setActive(s.entity)}
                className={`text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active === s.entity
                    ? "bg-violet-primary text-violet-foreground"
                    : "text-base-text-muted hover:bg-base-surface-raised hover:text-base-text"
                }`}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </aside>
        <section className="flex-1 min-w-0">
          {schema ? (
            <AdminTable key={schema.entity} schema={schema} />
          ) : (
            <p className="text-base-text-muted">Unknown entity</p>
          )}
        </section>
      </div>
    </div>
  );
}

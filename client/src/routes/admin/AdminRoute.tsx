import { useState } from "react";
import { AdminTable } from "@/components/admin/AdminTable";
import { PageHeader } from "@/components/ui/page-header";
import { ENTITY_SCHEMAS } from "@/services/admin/entitySchemas";

export function AdminRoute() {
  const [active, setActive] = useState<string>(ENTITY_SCHEMAS[0]?.entity ?? "users");
  const schema = ENTITY_SCHEMAS.find((s) => s.entity === active);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <PageHeader crumbs={["Home · Admin"]} title="Admin" />
        <div className="flex flex-col md:flex-row gap-6">
          <aside className="md:w-56 flex-shrink-0">
            <nav className="flex flex-col gap-1">
              {ENTITY_SCHEMAS.map((s) => (
                <button
                  key={s.entity}
                  type="button"
                  onClick={() => setActive(s.entity)}
                  className={`text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active === s.entity
                      ? "bg-accent text-accent-ink"
                      : "text-text-mute hover:bg-bg-sunken hover:text-text"
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
              <p className="text-text-faint">Unknown entity</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

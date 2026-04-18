export type FieldKind = "text" | "number" | "boolean" | "json" | "password";
export type ColumnFormat = "currency";

export interface ColumnDef {
  key: string;
  label: string;
  sortable?: boolean;
  format?: ColumnFormat;
  isStatus?: boolean;
}

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  createOnly?: boolean;
  editOnly?: boolean;
  required?: boolean;
}

export interface EntitySchema {
  entity: string;
  label: string;
  columns: ColumnDef[];
  fields: FieldDef[];
  readonly?: boolean;
  canCreate?: boolean;
}

const commonText = (key: string, label: string): FieldDef => ({ key, label, kind: "text" });

export const ENTITY_SCHEMAS: EntitySchema[] = [
  {
    entity: "users",
    label: "Users",
    canCreate: true,
    columns: [
      { key: "id", label: "ID", sortable: true },
      { key: "username", label: "Username", sortable: true },
      { key: "email", label: "Email", sortable: true },
      { key: "role", label: "Role", sortable: true },
      { key: "status", label: "Status", sortable: true, isStatus: true },
    ],
    fields: [
      commonText("username", "Username"),
      commonText("email", "Email"),
      commonText("role", "Role (admin|goddess|sub)"),
      commonText("status", "Status"),
      commonText("first_name", "First name"),
      commonText("last_name", "Last name"),
      commonText("goddess_id", "Goddess ID"),
      { key: "password", label: "Password (plain)", kind: "password" },
    ],
  },
  {
    entity: "goddesses",
    label: "Goddesses",
    canCreate: true,
    columns: [
      { key: "id", label: "ID", sortable: true },
      { key: "display_name", label: "Display name", sortable: true },
      { key: "email", label: "Email", sortable: true },
    ],
    fields: [
      commonText("display_name", "Display name"),
      commonText("email", "Email"),
      { key: "password", label: "Password (plain)", kind: "password" },
    ],
  },
  {
    entity: "invitations",
    label: "Invitations",
    canCreate: true,
    columns: [
      { key: "id", label: "ID", sortable: true },
      { key: "token", label: "Token", sortable: true },
      { key: "entry_tribute_amount", label: "Entry tribute", sortable: true, format: "currency" },
      { key: "expires_at", label: "Expires", sortable: true },
    ],
    fields: [
      commonText("token", "Token"),
      commonText("goddess_id", "Goddess ID"),
      { key: "entry_tribute_amount", label: "Entry tribute amount", kind: "number" },
      commonText("note", "Note"),
      commonText("expires_at", "Expires at (ISO)"),
    ],
  },
  {
    entity: "payment_methods",
    label: "Payment methods",
    canCreate: true,
    columns: [
      { key: "id", label: "ID", sortable: true },
      { key: "name", label: "Name", sortable: true },
      { key: "type", label: "Type", sortable: true },
      { key: "enabled", label: "Enabled", sortable: true },
    ],
    fields: [
      commonText("goddess_id", "Goddess ID"),
      commonText("name", "Name"),
      commonText("type", "Type"),
      commonText("handle_or_link", "Handle or link"),
      { key: "enabled", label: "Enabled", kind: "boolean" },
      { key: "sort_order", label: "Sort order", kind: "number" },
    ],
  },
  {
    entity: "payment_declarations",
    label: "Payment declarations",
    canCreate: true,
    columns: [
      { key: "id", label: "ID", sortable: true },
      { key: "sub_id", label: "Sub", sortable: true },
      { key: "amount", label: "Amount", sortable: true, format: "currency" },
      { key: "category", label: "Category", sortable: true },
      { key: "status", label: "Status", sortable: true, isStatus: true },
    ],
    fields: [
      commonText("sub_id", "Sub ID"),
      commonText("goddess_id", "Goddess ID"),
      commonText("method_id", "Method ID"),
      { key: "amount", label: "Amount", kind: "number" },
      commonText("category", "Category"),
      commonText("status", "Status"),
      commonText("note", "Note"),
    ],
  },
  {
    entity: "rolling_tributes",
    label: "Rolling tributes",
    canCreate: true,
    columns: [
      { key: "id", label: "ID", sortable: true },
      { key: "sub_id", label: "Sub", sortable: true },
      { key: "amount", label: "Amount", sortable: true, format: "currency" },
      { key: "deadline_day", label: "Day", sortable: true },
      { key: "paused", label: "Paused", sortable: true },
    ],
    fields: [
      commonText("sub_id", "Sub ID"),
      { key: "amount", label: "Amount", kind: "number" },
      commonText("deadline_day", "Deadline day (mon|tue|…)"),
      commonText("deadline_time", "Deadline time (HH:MM:SS)"),
      { key: "late_multiplier_per_day", label: "Late multiplier per day", kind: "number" },
      { key: "paused", label: "Paused", kind: "boolean" },
    ],
  },
  {
    entity: "debt_contracts",
    label: "Debt contracts",
    // Debt contracts are goddess-authored via /goddess/contracts; admin console is read/patch only.
    canCreate: false,
    columns: [
      { key: "id", label: "ID", sortable: true },
      { key: "sub_id", label: "Sub", sortable: true },
      { key: "principal", label: "Principal", sortable: true, format: "currency" },
      { key: "balance", label: "Balance", sortable: true, format: "currency" },
      { key: "status", label: "Status", sortable: true, isStatus: true },
    ],
    fields: [
      { key: "balance", label: "Balance", kind: "number" },
      commonText("status", "Status"),
      { key: "exit_amount", label: "Exit amount", kind: "number" },
    ],
  },
  {
    entity: "blacklist_entries",
    label: "Blacklist",
    canCreate: true,
    columns: [
      { key: "id", label: "ID", sortable: true },
      { key: "sub_id", label: "Sub", sortable: true },
      { key: "balance_snapshot", label: "Balance snapshot", sortable: true, format: "currency" },
      { key: "reason", label: "Reason", sortable: true },
      { key: "forgiven_at", label: "Forgiven", sortable: true },
    ],
    fields: [
      commonText("sub_id", "Sub ID"),
      commonText("goddess_id", "Goddess ID"),
      { key: "balance_snapshot", label: "Balance snapshot", kind: "number" },
      commonText("reason", "Reason"),
      commonText("forgiven_at", "Forgiven at (ISO)"),
    ],
  },
  {
    entity: "notifications",
    label: "Notifications",
    canCreate: true,
    columns: [
      { key: "id", label: "ID", sortable: true },
      { key: "user_id", label: "User", sortable: true },
      { key: "type", label: "Type", sortable: true },
      { key: "title", label: "Title", sortable: true },
      { key: "read_at", label: "Read at", sortable: true },
    ],
    fields: [
      commonText("user_id", "User ID"),
      commonText("type", "Type"),
      commonText("title", "Title"),
      commonText("body", "Body"),
      commonText("link", "Link"),
    ],
  },
  {
    entity: "debt_events",
    label: "Debt events",
    canCreate: true,
    columns: [
      { key: "id", label: "ID", sortable: true },
      { key: "contract_id", label: "Contract", sortable: true },
      { key: "event_type", label: "Event", sortable: true },
      { key: "amount", label: "Amount", sortable: true, format: "currency" },
      { key: "period_index", label: "Period", sortable: true },
    ],
    fields: [
      commonText("contract_id", "Contract ID"),
      commonText("event_type", "Event type"),
      { key: "amount", label: "Amount", kind: "number" },
      { key: "period_index", label: "Period index", kind: "number" },
      commonText("note", "Note"),
    ],
  },
  {
    entity: "contract_adjustments",
    label: "Contract adjustments",
    canCreate: true,
    columns: [
      { key: "id", label: "ID", sortable: true },
      { key: "contract_id", label: "Contract", sortable: true },
      { key: "amount", label: "Amount", sortable: true, format: "currency" },
      { key: "status", label: "Status", sortable: true, isStatus: true },
    ],
    fields: [
      commonText("contract_id", "Contract ID"),
      commonText("proposed_by", "Proposed by (user ID)"),
      { key: "amount", label: "Amount", kind: "number" },
      commonText("reason", "Reason"),
      commonText("status", "Status"),
    ],
  },
  {
    entity: "admin_actions",
    label: "Audit log",
    readonly: true,
    canCreate: false,
    columns: [
      { key: "created_at", label: "Created at", sortable: true },
      { key: "action", label: "Action", sortable: true },
      { key: "entity", label: "Entity", sortable: true },
      { key: "entity_id", label: "Entity ID", sortable: false },
      { key: "admin_id", label: "Admin ID", sortable: false },
      { key: "acting_as_user_id", label: "Acting as", sortable: false },
    ],
    fields: [{ key: "payload_json", label: "Payload", kind: "json" }],
  },
];

export function findSchema(entity: string): EntitySchema | undefined {
  return ENTITY_SCHEMAS.find((s) => s.entity === entity);
}

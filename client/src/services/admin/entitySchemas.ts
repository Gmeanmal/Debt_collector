export type FieldKind = "text" | "number" | "boolean" | "json" | "password";

export interface ColumnDef {
  key: string;
  label: string;
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
}

const commonText = (key: string, label: string): FieldDef => ({ key, label, kind: "text" });

export const ENTITY_SCHEMAS: EntitySchema[] = [
  {
    entity: "users",
    label: "Users",
    columns: [
      { key: "id", label: "ID" },
      { key: "username", label: "Username" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role" },
      { key: "status", label: "Status" },
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
    columns: [
      { key: "id", label: "ID" },
      { key: "display_name", label: "Display name" },
      { key: "email", label: "Email" },
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
    columns: [
      { key: "id", label: "ID" },
      { key: "token", label: "Token" },
      { key: "entry_tribute_amount", label: "Entry tribute" },
      { key: "expires_at", label: "Expires" },
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
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
      { key: "type", label: "Type" },
      { key: "enabled", label: "Enabled" },
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
    columns: [
      { key: "id", label: "ID" },
      { key: "sub_id", label: "Sub" },
      { key: "amount", label: "Amount" },
      { key: "category", label: "Category" },
      { key: "status", label: "Status" },
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
    columns: [
      { key: "id", label: "ID" },
      { key: "sub_id", label: "Sub" },
      { key: "amount", label: "Amount" },
      { key: "deadline_day", label: "Day" },
      { key: "paused", label: "Paused" },
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
    columns: [
      { key: "id", label: "ID" },
      { key: "sub_id", label: "Sub" },
      { key: "principal", label: "Principal" },
      { key: "balance", label: "Balance" },
      { key: "status", label: "Status" },
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
    columns: [
      { key: "id", label: "ID" },
      { key: "sub_id", label: "Sub" },
      { key: "balance_snapshot", label: "Balance snapshot" },
      { key: "reason", label: "Reason" },
      { key: "forgiven_at", label: "Forgiven" },
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
    columns: [
      { key: "id", label: "ID" },
      { key: "user_id", label: "User" },
      { key: "type", label: "Type" },
      { key: "title", label: "Title" },
      { key: "read_at", label: "Read at" },
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
    columns: [
      { key: "id", label: "ID" },
      { key: "contract_id", label: "Contract" },
      { key: "event_type", label: "Event" },
      { key: "amount", label: "Amount" },
      { key: "period_index", label: "Period" },
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
    columns: [
      { key: "id", label: "ID" },
      { key: "contract_id", label: "Contract" },
      { key: "amount", label: "Amount" },
      { key: "status", label: "Status" },
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
    columns: [
      { key: "created_at", label: "Created at" },
      { key: "action", label: "Action" },
      { key: "entity", label: "Entity" },
      { key: "entity_id", label: "Entity ID" },
      { key: "admin_id", label: "Admin ID" },
      { key: "acting_as_user_id", label: "Acting as" },
    ],
    fields: [
      { key: "payload_json", label: "Payload", kind: "json" },
    ],
  },
];

export function findSchema(entity: string): EntitySchema | undefined {
  return ENTITY_SCHEMAS.find((s) => s.entity === entity);
}

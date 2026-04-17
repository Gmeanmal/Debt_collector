import type { WeeklyPaymentDetail } from "@/services/goddess/weeklyApi";

const HEADER = ["date", "sub", "method", "category", "amount", "source"] as const;

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatCsvDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const hours = pad2(d.getHours());
  const mins = pad2(d.getMinutes());
  return `${year}-${month}-${day} ${hours}:${mins}`;
}

function formatAmount(amount: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  return n.toFixed(2);
}

function subLabel(payment: WeeklyPaymentDetail): string {
  const display = payment.sub_display_name?.trim();
  return display && display.length > 0 ? display : "sub";
}

function rowFor(payment: WeeklyPaymentDetail): string {
  const cells = [
    formatCsvDate(payment.validated_at ?? payment.declared_at),
    subLabel(payment),
    payment.method_name ?? "",
    payment.category,
    formatAmount(payment.amount),
    payment.source,
  ];
  return cells.map(escapeCsvField).join(",");
}

export function buildWeeklyCsv(payments: WeeklyPaymentDetail[]): string {
  const lines = [HEADER.join(","), ...payments.map(rowFor)];
  return `${lines.join("\n")}\n`;
}

export function buildWeeklyCsvBlob(payments: WeeklyPaymentDetail[]): Blob {
  return new Blob([buildWeeklyCsv(payments)], { type: "text/csv;charset=utf-8" });
}

export function weeklyCsvFilename(weekStart: string): string {
  return `weekly-payments-${weekStart}.csv`;
}

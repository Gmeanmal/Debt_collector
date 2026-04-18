import { formatGBP } from "@/services/format/currency";

export { formatGBP };

const LONG_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const MS_PER_DAY = 86_400_000;

function splitDecimal(value: string): { sign: 1n | -1n; whole: string; frac: string } {
  const trimmed = value.trim();
  const sign: 1n | -1n = trimmed.startsWith("-") ? -1n : 1n;
  const unsigned = trimmed.replace(/^[+-]/, "");
  const [wholeRaw = "0", fracRaw = ""] = unsigned.split(".");
  return { sign, whole: wholeRaw || "0", frac: fracRaw };
}

function toPennies(value: string): bigint {
  const { sign, whole, frac } = splitDecimal(value);
  const fracPadded = (frac + "00").slice(0, 2);
  const combined = `${whole}${fracPadded}`.replace(/^0+(?=\d)/, "");
  return sign * BigInt(combined || "0");
}

function fromPennies(pennies: bigint): string {
  const negative = pennies < 0n;
  const absPennies = negative ? -pennies : pennies;
  const str = absPennies.toString().padStart(3, "0");
  const whole = str.slice(0, -2);
  const frac = str.slice(-2);
  return `${negative ? "-" : ""}${whole}.${frac}`;
}

export function addGBPDecimalStrings(a: string, b: string): string {
  return fromPennies(toPennies(a) + toPennies(b));
}

function parseUtc(dueAt: string): Date {
  const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(dueAt);
  return new Date(hasTimezone ? dueAt : `${dueAt}Z`);
}

export function formatNextPaymentDue(dueAt: string | null): string | null {
  if (!dueAt) return null;

  const due = parseUtc(dueAt);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / MS_PER_DAY);

  if (diffDays <= 0) return "due today";
  if (diffDays <= 30) return `in ${diffDays} d`;
  return `on ${LONG_DATE_FORMATTER.format(due)}`;
}

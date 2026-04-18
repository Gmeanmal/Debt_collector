const formatter = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

export function formatGBP(amount: number | string | null | undefined): string {
  if (amount == null) return "—";
  const n = typeof amount === "number" ? amount : Number(amount);
  if (Number.isNaN(n)) return "—";
  return formatter.format(n);
}

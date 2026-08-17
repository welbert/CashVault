export function fmt(n: number): string {
  return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function fmtPct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${Math.round(n)}%`;
}

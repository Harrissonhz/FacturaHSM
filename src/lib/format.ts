// Helpers de formato para toda la app (Fase 1).

/** Formatea un numero como pesos colombianos (sin decimales). */
export function money(n: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n ?? 0);
}

/** Formatea una fecha ISO a formato local dd/mm/aaaa. */
export function fecha(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

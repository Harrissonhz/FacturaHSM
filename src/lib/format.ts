// Helpers de formato para toda la app.
// Zona horaria fija: Colombia (America/Bogota, UTC-5) para evitar
// desfases (una venta de las 7 PM no debe mostrarse como del día siguiente).

const TZ = "America/Bogota";

/** Formatea un numero como pesos colombianos (sin decimales). */
export function money(n: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n ?? 0);
}

/**
 * Formatea una fecha a dd/mm/aaaa en hora de Colombia.
 * Acepta:
 *  - "2026-09-01" (date puro): se interpreta como ese día calendario.
 *  - "2026-09-01T00:14:05+00" (timestamptz): se convierte a hora Colombia.
 */
export function fecha(iso: string | null | undefined): string {
  if (!iso) return "-";

  // Caso date puro (YYYY-MM-DD): mostrarlo tal cual, sin desfase de zona.
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(iso.trim());
  if (soloFecha) {
    const [y, m, d] = iso.trim().split("-");
    return `${d}/${m}/${y}`;
  }

  // Caso timestamp: convertir a hora Colombia.
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("es-CO", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Formatea fecha y hora (dd/mm/aaaa hh:mm) en hora de Colombia.
 * Útil para mostrar el momento exacto de una operación.
 */
export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return "-";
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return "-";
  return dt.toLocaleString("es-CO", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

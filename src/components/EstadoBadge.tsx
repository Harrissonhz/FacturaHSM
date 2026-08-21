// Badge de estado semantico (cartera, procesos).
// Mapea el estado a la clase de color del design system.

const MAP: Record<string, string> = {
  // Cartera
  PENDIENTE: "badge-warning",
  PARCIAL: "badge-info",
  PAGADA: "badge-success",
  VENCIDA: "badge-danger",
  // Inventario / procesos
  LISTO: "badge-success",
  DISPONIBLE: "badge-success",
  CRUDO: "badge-muted",
  EN_PRODUCCION: "badge-info",
  TERMINADO: "badge-info",
  // Compras
  RECIBIDA: "badge-success",
  // Calidades
  PRIMERA: "badge-success",
  SEGUNDA: "badge-warning",
  MERMA: "badge-danger",
};

export default function EstadoBadge({ estado }: { estado: string }) {
  const cls = MAP[estado] ?? "badge-muted";
  return <span className={`badge ${cls}`}>{estado}</span>;
}

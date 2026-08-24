// Índice de Reportes (Fase 6).
export const dynamic = "force-dynamic";

export default function ReportesPage() {
  const items = [
    { href: "/reportes/inventario", icon: "📦", label: "Inventario por vendedor", desc: "Qué tiene cada vendedor por referencia, talla, color y calidad." },
    { href: "/reportes/ventas", icon: "🗺️", label: "Ventas por municipio", desc: "Ventas agregadas por municipio y vendedor." },
    { href: "/reportes/cartera", icon: "💰", label: "Cartera", desc: "Saldos por cliente, vendedor y factura." },
    { href: "/reportes/trazabilidad", icon: "🔎", label: "Trazabilidad", desc: "Sigue una variante de la compra al pago." },
  ];

  return (
    <main>
      <h1>Reportes</h1>
      <p className="muted">Visibilidad del negocio: inventario, ventas, cartera y trazabilidad.</p>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        {items.map((it) => (
          <a key={it.href} href={it.href} className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ fontSize: "2rem" }}>{it.icon}</div>
            <h3 style={{ marginTop: 8 }}>{it.label}</h3>
            <p className="muted" style={{ margin: 0 }}>{it.desc}</p>
          </a>
        ))}
      </div>
    </main>
  );
}

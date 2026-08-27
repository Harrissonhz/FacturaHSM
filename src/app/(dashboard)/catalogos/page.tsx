// Índice de Catálogos (con catálogos base agregados).
export const dynamic = "force-dynamic";

export default function CatalogosPage() {
  const grupos = [
    {
      titulo: "Productos y ventas",
      items: [
        { href: "/catalogos/productos", icon: "👕", label: "Productos", desc: "Crea productos (nombre, tipo, género)." },
        { href: "/catalogos/variantes", icon: "🏷️", label: "Variantes", desc: "Referencia, color, talla y precios." },
        { href: "/catalogos/vendedores", icon: "🧑‍💼", label: "Vendedores", desc: "Crea y gestiona vendedores." },
      ],
    },
    {
      titulo: "Catálogos base",
      items: [
        { href: "/catalogos/colores", icon: "🎨", label: "Colores", desc: "Gestiona los colores disponibles." },
        { href: "/catalogos/tallas", icon: "📏", label: "Tallas", desc: "Gestiona las tallas disponibles." },
        { href: "/catalogos/tipos", icon: "🏷️", label: "Tipos de producto", desc: "Ej: camisa, pantalón, buzo." },
        { href: "/catalogos/procesos", icon: "🏭", label: "Procesos", desc: "Ej: estampación, bordado, empaque." },
      ],
    },
  ];

  return (
    <main>
      <h1>Catálogos</h1>
      <p className="muted">Gestiona productos, variantes, vendedores y los catálogos base del sistema.</p>

      {grupos.map((g) => (
        <div key={g.titulo} style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: "1rem", color: "var(--color-text-muted)" }}>{g.titulo}</h2>
          <div className="grid grid-2">
            {g.items.map((it) => (
              <a key={it.href} href={it.href} className="card" style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ fontSize: "2rem" }}>{it.icon}</div>
                <h3 style={{ marginTop: 8 }}>{it.label}</h3>
                <p className="muted" style={{ margin: 0 }}>{it.desc}</p>
              </a>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}

// Índice de Catálogos (Bloque 1).
export const dynamic = "force-dynamic";

export default function CatalogosPage() {
  return (
    <main>
      <h1>Catálogos</h1>
      <p className="muted">Gestiona productos, variantes y vendedores sin usar SQL.</p>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <a href="/catalogos/productos" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ fontSize: "2rem" }}>👕</div>
          <h3 style={{ marginTop: 8 }}>Productos</h3>
          <p className="muted" style={{ margin: 0 }}>Crea productos (camisas, tipo, género).</p>
        </a>

        <a href="/catalogos/variantes" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ fontSize: "2rem" }}>🏷️</div>
          <h3 style={{ marginTop: 8 }}>Variantes</h3>
          <p className="muted" style={{ margin: 0 }}>Referencia, color, talla y precios.</p>
        </a>

        <a href="/catalogos/vendedores" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ fontSize: "2rem" }}>🧑‍💼</div>
          <h3 style={{ marginTop: 8 }}>Vendedores</h3>
          <p className="muted" style={{ margin: 0 }}>Crea y gestiona vendedores.</p>
        </a>
      </div>
    </main>
  );
}

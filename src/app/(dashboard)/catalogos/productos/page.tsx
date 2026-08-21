// Pantalla de Productos: lista + crear.
import { createClient } from "@/lib/supabase/server";
import ProductoForm from "./ProductoForm";

export const dynamic = "force-dynamic";

export default async function ProductosPage() {
  const supabase = createClient();

  const { data: productos } = await supabase
    .from("productos")
    .select("id, nombre, genero, activo, tipos_producto(nombre)")
    .order("nombre");

  const { data: tipos } = await supabase
    .from("tipos_producto")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lista = (productos ?? []) as any[];

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Productos</h1>
          <p className="muted" style={{ margin: 0 }}>
            <a href="/catalogos">← Catálogos</a>
          </p>
        </div>
        <ProductoForm tipos={tipos ?? []} />
      </div>

      {lista.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">👕</span>
          Aún no hay productos. Crea el primero con “+ Nuevo producto”.
        </div>
      ) : (
        <div className="list-cards" style={{ marginTop: 16 }}>
          {lista.map((p) => (
            <div className="list-item" key={p.id}>
              <div className="row">
                <div>
                  <div className="title">{p.nombre}</div>
                  <div className="sub">
                    {p.tipos_producto?.nombre ?? "-"} · {p.genero}
                  </div>
                </div>
                <span className={`badge ${p.activo ? "badge-success" : "badge-muted"}`}>
                  {p.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

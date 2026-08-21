// Pantalla de Proveedores: lista + crear.
import { createClient } from "@/lib/supabase/server";
import ProveedorForm from "./ProveedorForm";

export const dynamic = "force-dynamic";

export default async function ProveedoresPage() {
  const supabase = createClient();

  const { data: proveedores } = await supabase
    .from("proveedores")
    .select("id, nombre, nit, telefono, activo")
    .order("nombre");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lista = (proveedores ?? []) as any[];

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Proveedores</h1>
          <p className="muted" style={{ margin: 0 }}>
            <a href="/compras">← Compras</a>
          </p>
        </div>
        <ProveedorForm />
      </div>

      {lista.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">🏭</span>
          Aún no hay proveedores. Crea el primero con “+ Nuevo proveedor”.
        </div>
      ) : (
        <div className="list-cards" style={{ marginTop: 16 }}>
          {lista.map((p) => (
            <div className="list-item" key={p.id}>
              <div className="row">
                <div>
                  <div className="title">{p.nombre}</div>
                  <div className="sub">
                    {p.nit ? `NIT: ${p.nit}` : "Sin NIT"}
                    {p.telefono ? ` · ${p.telefono}` : ""}
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

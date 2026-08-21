// Pantalla de Vendedores: lista + crear.
import { createClient } from "@/lib/supabase/server";
import VendedorForm from "./VendedorForm";

export const dynamic = "force-dynamic";

export default async function VendedoresPage() {
  const supabase = createClient();

  const { data: vendedores } = await supabase
    .from("vendedores")
    .select("id, nombre, documento, telefono, municipio, activo")
    .order("nombre");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lista = (vendedores ?? []) as any[];

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Vendedores</h1>
          <p className="muted" style={{ margin: 0 }}>
            <a href="/catalogos">← Catálogos</a>
          </p>
        </div>
        <VendedorForm />
      </div>

      {lista.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">🧑‍💼</span>
          Aún no hay vendedores. Crea el primero con “+ Nuevo vendedor”.
        </div>
      ) : (
        <div className="list-cards" style={{ marginTop: 16 }}>
          {lista.map((v) => (
            <div className="list-item" key={v.id}>
              <div className="row">
                <div>
                  <div className="title">{v.nombre}</div>
                  <div className="sub">
                    {v.municipio ?? "Sin municipio"}
                    {v.telefono ? ` · ${v.telefono}` : ""}
                  </div>
                </div>
                <span className={`badge ${v.activo ? "badge-success" : "badge-muted"}`}>
                  {v.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

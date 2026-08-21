// Pantalla de Variantes: lista + crear.
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/format";
import VarianteForm from "./VarianteForm";

export const dynamic = "force-dynamic";

export default async function VariantesPage() {
  const supabase = createClient();

  const { data: variantes } = await supabase
    .from("variantes")
    .select("id, sku, referencia, precio_base, activo, productos(nombre), colores(nombre), tallas(nombre)")
    .order("sku");

  const { data: productos } = await supabase.from("productos").select("id, nombre").eq("activo", true).order("nombre");
  const { data: colores } = await supabase.from("colores").select("id, nombre").eq("activo", true).order("nombre");
  const { data: tallas } = await supabase.from("tallas").select("id, nombre").eq("activo", true).order("orden");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lista = (variantes ?? []) as any[];

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Variantes</h1>
          <p className="muted" style={{ margin: 0 }}>
            <a href="/catalogos">← Catálogos</a>
          </p>
        </div>
        <VarianteForm productos={productos ?? []} colores={colores ?? []} tallas={tallas ?? []} />
      </div>

      {lista.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">🏷️</span>
          Aún no hay variantes. Crea la primera con “+ Nueva variante”.
        </div>
      ) : (
        <div className="list-cards" style={{ marginTop: 16 }}>
          {lista.map((v) => (
            <div className="list-item" key={v.id}>
              <div className="row">
                <div>
                  <div className="title">{v.sku}</div>
                  <div className="sub">
                    {v.productos?.nombre ?? "-"} · {v.colores?.nombre ?? "-"} · {v.tallas?.nombre ?? "-"}
                  </div>
                </div>
                <div className="amount">{money(Number(v.precio_base))}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

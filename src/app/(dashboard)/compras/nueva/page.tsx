// Pantalla "Nueva compra": carga proveedores y variantes, delega en el form.
import { createClient } from "@/lib/supabase/server";
import NuevaCompraForm from "./NuevaCompraForm";

export const dynamic = "force-dynamic";

export default async function NuevaCompraPage() {
  const supabase = createClient();

  const { data: proveedores } = await supabase
    .from("proveedores")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre");

  const { data: variantes } = await supabase
    .from("variantes")
    .select("id, sku, precio_base")
    .eq("activo", true)
    .order("sku");

  return (
    <main>
      <h1 style={{ marginBottom: 4 }}>Nueva compra</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        <a href="/compras">← Compras</a>
      </p>

      {(proveedores ?? []).length === 0 || (variantes ?? []).length === 0 ? (
        <div className="empty-state">
          <span className="emoji">⚠️</span>
          <p>
            Necesitas al menos un <strong>proveedor</strong> y una{" "}
            <strong>variante</strong>.
            <br />
            Crea proveedores en <a href="/compras/proveedores">Proveedores</a> y
            variantes en <a href="/catalogos/variantes">Catálogos</a>.
          </p>
        </div>
      ) : (
        <NuevaCompraForm
          proveedores={proveedores ?? []}
          variantes={variantes ?? []}
        />
      )}
    </main>
  );
}

// Pantalla "Nueva compra": proveedores + variantes enriquecidas (producto[img]/talla/color).
import { createClient } from "@/lib/supabase/server";
import NuevaCompraForm from "./NuevaCompraForm";

export const dynamic = "force-dynamic";

export default async function NuevaCompraPage() {
  const supabase = createClient();

  const { data: proveedores } = await supabase
    .from("proveedores").select("id, nombre").eq("activo", true).order("nombre");

  const { data: variantes } = await supabase
    .from("variantes")
    .select("id, sku, precio_base, productos(nombre, imagen_url), colores(nombre), tallas(nombre, orden)")
    .eq("activo", true)
    .order("sku");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vars = (variantes ?? []).map((v: any) => ({
    key: v.id,
    variante_id: v.id,
    producto: v.productos?.nombre ?? "Producto",
    productoImg: v.productos?.imagen_url ?? null,
    talla: v.tallas?.nombre ?? "-",
    tallaOrden: v.tallas?.orden ?? 0,
    color: v.colores?.nombre ?? "-",
    sku: v.sku,
    precio: Number(v.precio_base ?? 0),
  }));

  return (
    <main>
      <h1 style={{ marginBottom: 4 }}>Nueva compra</h1>
      <p className="muted" style={{ marginTop: 0 }}><a href="/compras">← Compras</a></p>

      {(proveedores ?? []).length === 0 || vars.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">⚠️</span>
          <p>
            Necesitas al menos un <strong>proveedor</strong> y una <strong>variante</strong>.
            <br />Crea proveedores en <a href="/compras/proveedores">Proveedores</a> y variantes en <a href="/catalogos/variantes">Catálogos</a>.
          </p>
        </div>
      ) : (
        <NuevaCompraForm proveedores={proveedores ?? []} variantes={vars} />
      )}
    </main>
  );
}

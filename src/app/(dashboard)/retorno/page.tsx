// Retorno de inventario: lo no vendido regresa del vendedor al central.
import { createClient } from "@/lib/supabase/server";
import RetornoForm from "./RetornoForm";

export const dynamic = "force-dynamic";

export default async function RetornoPage() {
  const supabase = createClient();

  // Vendedores con ubicación
  const { data: vendedores } = await supabase
    .from("vendedores")
    .select("id, nombre, municipio, ubicacion_id")
    .eq("activo", true)
    .not("ubicacion_id", "is", null)
    .order("nombre");

  // Inventario LISTO en TODAS las ubicaciones de vendedores (se filtra en cliente)
  const { data: inv } = await supabase
    .from("inventario")
    .select("ubicacion_id, variante_id, calidad_id, cantidad, variantes(sku), calidades(codigo), ubicaciones!inner(tipo), estados_inventario!inner(codigo)")
    .eq("ubicaciones.tipo", "VENDEDOR")
    .eq("estados_inventario.codigo", "LISTO")
    .gt("cantidad", 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inventario = (inv ?? []).map((r: any) => ({
    ubicacion_id: r.ubicacion_id,
    variante_id: r.variante_id,
    calidad_id: r.calidad_id,
    sku: r.variantes?.sku ?? "SKU",
    calidad: r.calidades?.codigo ?? "-",
    disponible: r.cantidad,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vends = (vendedores ?? []) as any[];

  return (
    <main>
      <h1 style={{ marginBottom: 4 }}>Retorno de inventario</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Regresa al inventario central lo que el vendedor no logró vender.
      </p>

      {vends.length === 0 || inventario.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">↩️</span>
          <p>
            {inventario.length === 0
              ? "Ningún vendedor tiene inventario para retornar en este momento."
              : "No hay vendedores con ubicación."}
          </p>
        </div>
      ) : (
        <RetornoForm vendedores={vends} inventario={inventario} />
      )}
    </main>
  );
}

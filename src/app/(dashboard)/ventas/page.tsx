// ---------------------------------------------------------------------
// Pantalla de Ventas (Server Component) - Fase 2.
// Carga vendedor, cliente e inventario disponible (LISTO) y los pasa
// al formulario cliente rediseñado.
// ---------------------------------------------------------------------
import { createClient } from "@/lib/supabase/server";
import VentaForm from "./VentaForm";

export const dynamic = "force-dynamic";

export default async function VentasPage() {
  const supabase = createClient();

  const { data: vendedor } = await supabase
    .from("vendedores")
    .select("id, nombre, municipio, ubicacion_id")
    .not("ubicacion_id", "is", null)
    .limit(1)
    .single();

  const { data: cliente } = vendedor
    ? await supabase
        .from("clientes")
        .select("id, nombre, municipio")
        .eq("vendedor_id", vendedor.id)
        .limit(1)
        .single()
    : { data: null };

  type ItemDisponible = {
    variante_id: string;
    calidad_id: string;
    sku: string;
    calidad: string;
    cantidad: number;
    precio: number;
  };
  let items: ItemDisponible[] = [];

  if (vendedor?.ubicacion_id) {
    const { data: inv } = await supabase
      .from("inventario")
      .select(
        "variante_id, calidad_id, cantidad, " +
          "variantes(sku, precio_base), " +
          "calidades(codigo), " +
          "estados_inventario!inner(codigo)"
      )
      .eq("ubicacion_id", vendedor.ubicacion_id)
      .eq("estados_inventario.codigo", "LISTO")
      .gt("cantidad", 0);

    const { data: precios } = await supabase
      .from("precios")
      .select("variante_id, calidad_id, precio");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items = (inv ?? []).map((r: any) => {
      const precioRow = (precios ?? []).find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) => p.variante_id === r.variante_id && p.calidad_id === r.calidad_id
      );
      return {
        variante_id: r.variante_id,
        calidad_id: r.calidad_id,
        sku: r.variantes?.sku ?? "SKU",
        calidad: r.calidades?.codigo ?? "",
        cantidad: r.cantidad,
        precio: precioRow?.precio ?? r.variantes?.precio_base ?? 0,
      };
    });
  }

  const listo = vendedor && cliente && items.length > 0;

  return (
    <main>
      <h1>Registrar venta</h1>
      <p className="muted">Vende a crédito, genera factura y cuenta por cobrar.</p>

      {!listo ? (
        <div className="empty-state">
          <span className="emoji">🛒</span>
          <p>
            No se encontró un vendedor, cliente o inventario disponible.
            <br />
            Ejecuta el script <code>datos_prueba.sql</code> en Supabase y recarga.
          </p>
        </div>
      ) : (
        <VentaForm
          vendedor={{ id: vendedor.id, nombre: vendedor.nombre, municipio: vendedor.municipio }}
          cliente={{ id: cliente.id, nombre: cliente.nombre }}
          items={items}
        />
      )}
    </main>
  );
}

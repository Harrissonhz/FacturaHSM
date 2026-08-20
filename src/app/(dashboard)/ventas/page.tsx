// ---------------------------------------------------------------------
// Pantalla de Ventas (Server Component).
// Carga automaticamente el primer vendedor, un cliente y su inventario
// disponible (LISTO) desde Supabase, y los pasa al formulario cliente.
// Requiere haber ejecutado el script de datos de prueba (datos_prueba.sql).
// ---------------------------------------------------------------------
import { createClient } from "@/lib/supabase/server";
import VentaForm from "./VentaForm";

export const dynamic = "force-dynamic";

export default async function VentasPage() {
  const supabase = createClient();

  // 1. Primer vendedor con ubicacion asignada
  const { data: vendedor } = await supabase
    .from("vendedores")
    .select("id, nombre, municipio, ubicacion_id")
    .not("ubicacion_id", "is", null)
    .limit(1)
    .single();

  // 2. Un cliente de ese vendedor
  const { data: cliente } = vendedor
    ? await supabase
        .from("clientes")
        .select("id, nombre, municipio")
        .eq("vendedor_id", vendedor.id)
        .limit(1)
        .single()
    : { data: null };

  // 3. Inventario disponible (LISTO) en la ubicacion del vendedor
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

    // Precios por calidad
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
      <h1>Ventas</h1>
      <p className="muted">
        Registra una venta a credito. Descuenta inventario del vendedor,
        genera factura y cuenta por cobrar de forma atomica.
      </p>

      {!listo ? (
        <div className="card">
          <h3>Faltan datos de prueba</h3>
          <p>
            No se encontro un vendedor, cliente o inventario disponible.
            Ejecuta el script <code>datos_prueba.sql</code> en Supabase y
            recarga esta pagina.
          </p>
          <ul className="muted">
            <li>Vendedor: {vendedor ? vendedor.nombre : "no encontrado"}</li>
            <li>Cliente: {cliente ? cliente.nombre : "no encontrado"}</li>
            <li>Items disponibles: {items.length}</li>
          </ul>
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

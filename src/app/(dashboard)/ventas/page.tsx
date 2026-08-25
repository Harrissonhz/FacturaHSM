// ---------------------------------------------------------------------
// Pantalla de Ventas (Server Component) - POS.
// Resuelve el vendedor (usuario logueado o el primero si es admin),
// carga TODOS los clientes activos del tenant (clientes = de la empresa;
// cualquier vendedor puede venderle a cualquiera), y el inventario del vendedor.
// ---------------------------------------------------------------------
import { createClient } from "@/lib/supabase/server";
import { getPerfil } from "@/lib/auth/session";
import VentaPOS from "./VentaPOS";

export const dynamic = "force-dynamic";

export default async function VentasPage() {
  const supabase = createClient();
  const perfil = await getPerfil();

  // 1. Vendedor: si el usuario ES vendedor, usa su vendedor_id; si es admin,
  //    toma el primer vendedor con ubicación (para pruebas/operación).
  let vendedor:
    | { id: string; nombre: string; municipio: string | null; ubicacion_id: string }
    | null = null;

  if (perfil?.vendedor_id) {
    const { data } = await supabase
      .from("vendedores")
      .select("id, nombre, municipio, ubicacion_id")
      .eq("id", perfil.vendedor_id)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vendedor = (data as any) ?? null;
  }
  if (!vendedor) {
    const { data } = await supabase
      .from("vendedores")
      .select("id, nombre, municipio, ubicacion_id")
      .not("ubicacion_id", "is", null)
      .limit(1)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vendedor = (data as any) ?? null;
  }

  // 2. TODOS los clientes activos del tenant (ya no se filtra por vendedor).
  type Cliente = { id: string; nombre: string; municipio: string | null };
  const { data: clientesData } = await supabase
    .from("clientes")
    .select("id, nombre, municipio")
    .eq("activo", true)
    .order("nombre");
  const clientes = (clientesData ?? []) as Cliente[];

  // 3. Inventario disponible (LISTO) del vendedor + precios por calidad
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

  return (
    <main>
      <h1>Registrar venta</h1>
      <p className="muted">Vende a crédito, genera factura y cuenta por cobrar.</p>

      {!vendedor ? (
        <div className="empty-state">
          <span className="emoji">🛒</span>
          <p>
            No hay un vendedor con inventario asignado. Asigna inventario a un
            vendedor en Distribución.
          </p>
        </div>
      ) : (
        <VentaPOS
          vendedor={{ id: vendedor.id, nombre: vendedor.nombre, municipio: vendedor.municipio }}
          clientesIniciales={clientes}
          items={items}
        />
      )}
    </main>
  );
}

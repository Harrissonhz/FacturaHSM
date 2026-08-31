// ---------------------------------------------------------------------
// Pantalla de Ventas (Server Component) - INVENTARIO CENTRAL COMPARTIDO.
// Fase 1: no hay distribución. El inventario vendible es el de la BODEGA
// CENTRAL (LISTO), compartido por todos los vendedores. Al empacar, el
// producto queda disponible aquí de inmediato.
// El vendedor se resuelve del usuario logueado (o el primero, si admin),
// y queda registrado como quién realiza la venta.
// ---------------------------------------------------------------------
import { createClient } from "@/lib/supabase/server";
import { getPerfil } from "@/lib/auth/session";
import VentaPOS from "./VentaPOS";

export const dynamic = "force-dynamic";

export default async function VentasPage() {
  const supabase = createClient();
  const perfil = await getPerfil();

  // 1. Vendedor que registra la venta (usuario logueado o el primero).
  let vendedor: { id: string; nombre: string; municipio: string | null } | null = null;
  if (perfil?.vendedor_id) {
    const { data } = await supabase
      .from("vendedores").select("id, nombre, municipio").eq("id", perfil.vendedor_id).single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vendedor = (data as any) ?? null;
  }
  if (!vendedor) {
    const { data } = await supabase
      .from("vendedores").select("id, nombre, municipio").eq("activo", true).order("nombre").limit(1).single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vendedor = (data as any) ?? null;
  }

  // 2. Todos los clientes activos (clientes de la empresa).
  type Cliente = { id: string; nombre: string; municipio: string | null };
  const { data: clientesData } = await supabase
    .from("clientes").select("id, nombre, municipio").eq("activo", true).order("nombre");
  const clientes = (clientesData ?? []) as Cliente[];

  // 3. Inventario LISTO de la BODEGA CENTRAL (compartido) + precios.
  type ItemDisponible = {
    variante_id: string; calidad_id: string; sku: string; calidad: string; cantidad: number; precio: number;
  };
  let items: ItemDisponible[] = [];

  const { data: central } = await supabase
    .from("ubicaciones").select("id").eq("tipo", "CENTRAL").single();

  if (central?.id) {
    const { data: inv } = await supabase
      .from("inventario")
      .select(
        "variante_id, calidad_id, cantidad, " +
          "variantes(sku, precio_base), " +
          "calidades(codigo), " +
          "estados_inventario!inner(codigo)"
      )
      .eq("ubicacion_id", central.id)
      .eq("estados_inventario.codigo", "LISTO")
      .gt("cantidad", 0);

    const { data: precios } = await supabase
      .from("precios").select("variante_id, calidad_id, precio");

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
          <p>No hay vendedores registrados. Crea uno en Catálogos → Vendedores.</p>
        </div>
      ) : (
        <VentaPOS
          vendedor={vendedor}
          clientesIniciales={clientes}
          items={items}
        />
      )}
    </main>
  );
}

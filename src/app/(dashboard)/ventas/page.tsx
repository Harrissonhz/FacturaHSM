// ---------------------------------------------------------------------
// Pantalla de Ventas (Server Component) - inventario central compartido.
// Enriquece cada unidad con producto/imagen/talla/color para la cascada.
// ---------------------------------------------------------------------
import { createClient } from "@/lib/supabase/server";
import { getPerfil } from "@/lib/auth/session";
import VentaPOS from "./VentaPOS";

export const dynamic = "force-dynamic";

export default async function VentasPage() {
  const supabase = createClient();
  const perfil = await getPerfil();

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

  type Cliente = { id: string; nombre: string; municipio: string | null };
  const { data: clientesData } = await supabase
    .from("clientes").select("id, nombre, municipio").eq("activo", true).order("nombre");
  const clientes = (clientesData ?? []) as Cliente[];

  type Item = {
    key: string; variante_id: string; calidad_id: string; calidad: string;
    producto: string; productoImg: string | null; talla: string; tallaOrden: number; color: string;
    sku: string; cantidad: number; precio: number;
  };
  let items: Item[] = [];

  const { data: central } = await supabase.from("ubicaciones").select("id").eq("tipo", "CENTRAL").single();

  if (central?.id) {
    const { data: inv } = await supabase
      .from("inventario")
      .select(
        "variante_id, calidad_id, cantidad, " +
          "variantes(sku, precio_base, productos(nombre, imagen_url), colores(nombre), tallas(nombre, orden)), " +
          "calidades(codigo), estados_inventario!inner(codigo)"
      )
      .eq("ubicacion_id", central.id)
      .eq("estados_inventario.codigo", "LISTO")
      .gt("cantidad", 0);

    const { data: precios } = await supabase.from("precios").select("variante_id, calidad_id, precio");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items = (inv ?? []).map((r: any) => {
      const precioRow = (precios ?? []).find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) => p.variante_id === r.variante_id && p.calidad_id === r.calidad_id
      );
      return {
        key: r.variante_id + r.calidad_id,
        variante_id: r.variante_id,
        calidad_id: r.calidad_id,
        calidad: r.calidades?.codigo ?? "",
        producto: r.variantes?.productos?.nombre ?? "Producto",
        productoImg: r.variantes?.productos?.imagen_url ?? null,
        talla: r.variantes?.tallas?.nombre ?? "-",
        tallaOrden: r.variantes?.tallas?.orden ?? 0,
        color: r.variantes?.colores?.nombre ?? "-",
        sku: r.variantes?.sku ?? "SKU",
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
        <VentaPOS vendedor={vendedor} clientesIniciales={clientes} items={items} />
      )}
    </main>
  );
}

// ---------------------------------------------------------------------
// Pantalla de Inventario (Server Component).
// Muestra descripción larga y delega en InventarioClient la lista +
// las opciones de descarga (PDF/Imprimir y CSV) para conteo físico.
// ---------------------------------------------------------------------
import { createClient } from "@/lib/supabase/server";
import InventarioClient from "./InventarioClient";

export const dynamic = "force-dynamic";

export type FilaInv = {
  descripcion: string;
  producto: string;
  color: string;
  talla: string;
  ubicacion: string;
  estado: string;
  calidad: string;
  cantidad: number;
};

export default async function InventarioPage() {
  const supabase = createClient();

  const { data } = await supabase
    .from("inventario")
    .select(
      "cantidad, " +
        "variantes(sku, productos(nombre), colores(nombre), tallas(nombre, orden)), " +
        "ubicaciones(nombre, tipo), calidades(codigo), estados_inventario(codigo)"
    )
    .gt("cantidad", 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filas: FilaInv[] = (data ?? []).map((r: any) => {
    const producto = r.variantes?.productos?.nombre ?? r.variantes?.sku ?? "Producto";
    const color = r.variantes?.colores?.nombre ?? "";
    const talla = r.variantes?.tallas?.nombre ?? "";
    return {
      descripcion: [producto, color, talla].filter(Boolean).join(" / "),
      producto,
      color,
      talla,
      ubicacion: r.ubicaciones?.nombre ?? "-",
      estado: r.estados_inventario?.codigo ?? "-",
      calidad: r.calidades?.codigo ?? "-",
      cantidad: r.cantidad,
    };
  })
  // Ordenar por producto, luego talla, luego color (más legible para conteo)
  .sort((a, b) =>
    a.producto.localeCompare(b.producto) ||
    a.talla.localeCompare(b.talla) ||
    a.color.localeCompare(b.color)
  );

  return (
    <main>
      <InventarioClient filas={filas} />
    </main>
  );
}

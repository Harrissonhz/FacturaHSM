// Pantalla de Productos (delega en ProductosClient).
import { createClient } from "@/lib/supabase/server";
import ProductosClient from "./ProductosClient";

export const dynamic = "force-dynamic";

export default async function ProductosPage() {
  const supabase = createClient();

  const { data: productos } = await supabase
    .from("productos")
    .select("id, nombre, genero, activo, tipo_producto_id, tipos_producto(nombre)")
    .order("nombre");

  const { data: tipos } = await supabase
    .from("tipos_producto")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lista = (productos ?? []).map((p: any) => ({
    id: p.id,
    nombre: p.nombre,
    genero: p.genero,
    activo: p.activo,
    tipo_producto_id: p.tipo_producto_id,
    tipoNombre: p.tipos_producto?.nombre ?? "-",
  }));

  return (
    <main>
      <ProductosClient productos={lista} tipos={tipos ?? []} />
    </main>
  );
}

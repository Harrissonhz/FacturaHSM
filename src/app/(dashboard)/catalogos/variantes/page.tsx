// Pantalla de Variantes (delega en VariantesClient).
import { createClient } from "@/lib/supabase/server";
import VariantesClient from "./VariantesClient";

export const dynamic = "force-dynamic";

export default async function VariantesPage() {
  const supabase = createClient();

  const { data: variantes } = await supabase
    .from("variantes")
    .select("id, sku, referencia, precio_base, activo, productos(nombre), colores(nombre), tallas(nombre), precios(precio, calidades(codigo))")
    .order("sku");

  const { data: productos } = await supabase.from("productos").select("id, nombre").eq("activo", true).order("nombre");
  const { data: colores } = await supabase.from("colores").select("id, nombre").eq("activo", true).order("nombre");
  const { data: tallas } = await supabase.from("tallas").select("id, nombre").eq("activo", true).order("orden");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lista = (variantes ?? []).map((v: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pSeg = (v.precios ?? []).find((p: any) => p.calidades?.codigo === "SEGUNDA");
    return {
      id: v.id,
      sku: v.sku,
      referencia: v.referencia,
      precio_base: Number(v.precio_base),
      precio_segunda: Number(pSeg?.precio ?? 0),
      activo: v.activo,
      producto: v.productos?.nombre ?? "-",
      color: v.colores?.nombre ?? "-",
      talla: v.tallas?.nombre ?? "-",
    };
  });

  return (
    <main>
      <VariantesClient variantes={lista} productos={productos ?? []} colores={colores ?? []} tallas={tallas ?? []} />
    </main>
  );
}

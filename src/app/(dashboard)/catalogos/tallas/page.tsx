// Catálogo base: Tallas (con orden).
import { createClient } from "@/lib/supabase/server";
import CatalogoBaseClient from "../CatalogoBaseClient";
import { crearTalla, editarTalla, toggleTalla } from "@/services/catalogos-base.actions";

export const dynamic = "force-dynamic";

export default async function TallasPage() {
  const supabase = createClient();
  const { data } = await supabase.from("tallas").select("id, codigo, nombre, orden, activo").order("orden");
  return (
    <CatalogoBaseClient
      titulo="Tallas" singular="talla" emoji="📏" volverHref="/catalogos"
      items={(data ?? []) as never}
      acciones={{ crear: crearTalla, editar: editarTalla, toggle: toggleTalla }}
      conOrden
    />
  );
}

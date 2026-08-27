// Catálogo base: Tipos de producto.
import { createClient } from "@/lib/supabase/server";
import CatalogoBaseClient from "../CatalogoBaseClient";
import { crearTipo, editarTipo, toggleTipo } from "@/services/catalogos-base.actions";

export const dynamic = "force-dynamic";

export default async function TiposPage() {
  const supabase = createClient();
  const { data } = await supabase.from("tipos_producto").select("id, codigo, nombre, activo").order("nombre");
  return (
    <CatalogoBaseClient
      titulo="Tipos de producto" singular="tipo" emoji="🏷️" volverHref="/catalogos"
      items={(data ?? []) as never}
      acciones={{ crear: crearTipo, editar: editarTipo, toggle: toggleTipo }}
    />
  );
}

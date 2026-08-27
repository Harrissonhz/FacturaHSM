// Catálogo base: Colores.
import { createClient } from "@/lib/supabase/server";
import CatalogoBaseClient from "../CatalogoBaseClient";
import { crearColor, editarColor, toggleColor } from "@/services/catalogos-base.actions";

export const dynamic = "force-dynamic";

export default async function ColoresPage() {
  const supabase = createClient();
  const { data } = await supabase.from("colores").select("id, codigo, nombre, activo").order("nombre");
  return (
    <CatalogoBaseClient
      titulo="Colores" singular="color" emoji="🎨" volverHref="/catalogos"
      items={(data ?? []) as never}
      acciones={{ crear: crearColor, editar: editarColor, toggle: toggleColor }}
    />
  );
}

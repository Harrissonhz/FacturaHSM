// Catálogo base: Procesos de producción.
import { createClient } from "@/lib/supabase/server";
import CatalogoBaseClient from "../CatalogoBaseClient";
import { crearProceso, editarProceso, toggleProceso } from "@/services/catalogos-base.actions";

export const dynamic = "force-dynamic";

export default async function ProcesosPage() {
  const supabase = createClient();
  const { data } = await supabase.from("procesos_produccion").select("id, codigo, nombre, activo").order("nombre");
  return (
    <CatalogoBaseClient
      titulo="Procesos de producción" singular="proceso" emoji="🏭" volverHref="/catalogos"
      items={(data ?? []) as never}
      acciones={{ crear: crearProceso, editar: editarProceso, toggle: toggleProceso }}
    />
  );
}

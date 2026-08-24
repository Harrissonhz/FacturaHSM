// Pantalla de Proveedores (delega en ProveedoresClient).
import { createClient } from "@/lib/supabase/server";
import ProveedoresClient from "./ProveedoresClient";

export const dynamic = "force-dynamic";

export default async function ProveedoresPage() {
  const supabase = createClient();

  const { data: proveedores } = await supabase
    .from("proveedores")
    .select("id, nombre, nit, telefono, direccion, activo")
    .order("nombre");

  return (
    <main>
      <ProveedoresClient proveedores={(proveedores ?? []) as never} />
    </main>
  );
}

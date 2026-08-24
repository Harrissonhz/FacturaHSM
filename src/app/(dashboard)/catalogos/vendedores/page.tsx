// Pantalla de Vendedores (delega en VendedoresClient).
import { createClient } from "@/lib/supabase/server";
import VendedoresClient from "./VendedoresClient";

export const dynamic = "force-dynamic";

export default async function VendedoresPage() {
  const supabase = createClient();

  const { data: vendedores } = await supabase
    .from("vendedores")
    .select("id, nombre, documento, telefono, municipio, activo")
    .order("nombre");

  return (
    <main>
      <VendedoresClient vendedores={(vendedores ?? []) as never} />
    </main>
  );
}

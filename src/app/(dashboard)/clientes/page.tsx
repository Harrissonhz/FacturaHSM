// Pantalla de Clientes (delega en ClientesClient).
import { createClient } from "@/lib/supabase/server";
import ClientesClient from "./ClientesClient";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const supabase = createClient();

  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nombre, documento, telefono, direccion, municipio, activo, vendedor_id, vendedores(nombre)")
    .order("nombre");

  const { data: vendedores } = await supabase
    .from("vendedores")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lista = (clientes ?? []).map((c: any) => ({
    id: c.id,
    nombre: c.nombre,
    documento: c.documento,
    telefono: c.telefono,
    direccion: c.direccion,
    municipio: c.municipio,
    activo: c.activo,
    vendedor_id: c.vendedor_id ?? null,
    vendedor: c.vendedores?.nombre ?? "Sin asignar",
  }));

  return (
    <main>
      <ClientesClient clientes={lista} vendedores={vendedores ?? []} />
    </main>
  );
}

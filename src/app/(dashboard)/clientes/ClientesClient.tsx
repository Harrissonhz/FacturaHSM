"use client";

// Lista de clientes con acciones: crear, editar (incluye vendedor), inactivar.
// El vendedor es solo referencia (habitual); no restringe las ventas.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteAdmin, editarCliente, toggleCliente } from "@/services/correcciones.actions";

type Vendedor = { id: string; nombre: string };
type Cliente = {
  id: string; nombre: string; documento: string | null; telefono: string | null;
  direccion: string | null; municipio: string | null; activo: boolean;
  vendedor: string; vendedor_id: string | null;
};

export default function ClientesClient({ clientes, vendedores }: { clientes: Cliente[]; vendedores: Vendedor[] }) {
  const router = useRouter();
  const [sheet, setSheet] = useState<null | "nuevo" | Cliente>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buscar, setBuscar] = useState("");

  const editando = sheet && sheet !== "nuevo" ? (sheet as Cliente) : null;

  const filtrados = clientes.filter((c) => c.nombre.toLowerCase().includes(buscar.toLowerCase()));

  async function guardar(fd: FormData) {
    setLoading(true); setError(null);
    const res = editando ? await editarCliente(fd) : await crearClienteAdmin(fd);
    setLoading(false);
    if (res.ok) { setSheet(null); router.refresh(); }
    else setError(res.error ?? "No se pudo guardar.");
  }

  async function inactivar(c: Cliente) {
    const fd = new FormData();
    fd.set("id", c.id); fd.set("activo", String(c.activo));
    await toggleCliente(fd); router.refresh();
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Clientes</h1>
          <p className="muted" style={{ margin: 0 }}>Los clientes son de la empresa; cualquier vendedor puede venderles.</p>
        </div>
        <button className="btn" onClick={() => { setSheet("nuevo"); setError(null); }}>+ Nuevo cliente</button>
      </div>

      {clientes.length > 5 && (
        <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
          <input className="input" placeholder="Buscar cliente..." value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        </div>
      )}

      {filtrados.length === 0 ? (
        <div className="empty-state"><span className="emoji">🧾</span>Sin clientes.</div>
      ) : (
        <div className="list-cards" style={{ marginTop: 16 }}>
          {filtrados.map((c) => (
            <div className="list-item" key={c.id} style={{ opacity: c.activo ? 1 : 0.6 }}>
              <div className="row">
                <div>
                  <div className="title">{c.nombre}</div>
                  <div className="sub">
                    {c.municipio ?? "Sin municipio"}
                    {c.telefono ? ` · ${c.telefono}` : ""} · Vend. habitual: {c.vendedor}
                  </div>
                </div>
                <span className={`badge ${c.activo ? "badge-success" : "badge-muted"}`}>{c.activo ? "Activo" : "Inactivo"}</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setSheet(c); setError(null); }}>Editar</button>
                <button className={`btn btn-sm ${c.activo ? "btn-danger" : "btn-success"}`} onClick={() => inactivar(c)}>
                  {c.activo ? "Inactivar" : "Reactivar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sheet && (
        <div className="sheet-overlay" onClick={() => !loading && setSheet(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="handle" />
            <h3 style={{ marginTop: 0 }}>{editando ? "Editar cliente" : "Nuevo cliente"}</h3>
            <form action={guardar}>
              {editando && <input type="hidden" name="id" value={editando.id} />}
              <div className="field">
                <label htmlFor="nombre">Nombre *</label>
                <input id="nombre" name="nombre" className="input" required defaultValue={editando?.nombre ?? ""} placeholder="Nombre del cliente" />
              </div>

              {/* Selector de vendedor: ahora aparece TAMBIÉN al editar */}
              <div className="field">
                <label htmlFor="vendedor_id">Vendedor habitual (opcional)</label>
                <select id="vendedor_id" name="vendedor_id" className="select" defaultValue={editando?.vendedor_id ?? ""}>
                  <option value="">— Sin asignar —</option>
                  {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
                </select>
                <p className="sub" style={{ margin: "4px 0 0" }}>
                  Solo referencia. Cualquier vendedor puede venderle a este cliente.
                </p>
              </div>

              <div className="field">
                <label htmlFor="documento">Documento</label>
                <input id="documento" name="documento" className="input" defaultValue={editando?.documento ?? ""} placeholder="Opcional" />
              </div>
              <div className="field">
                <label htmlFor="telefono">Teléfono</label>
                <input id="telefono" name="telefono" className="input" inputMode="tel" defaultValue={editando?.telefono ?? ""} placeholder="Opcional" />
              </div>
              <div className="field">
                <label htmlFor="municipio">Municipio</label>
                <input id="municipio" name="municipio" className="input" defaultValue={editando?.municipio ?? ""} placeholder="Ej: Jericó" />
              </div>
              <div className="field">
                <label htmlFor="direccion">Dirección</label>
                <input id="direccion" name="direccion" className="input" defaultValue={editando?.direccion ?? ""} placeholder="Opcional" />
              </div>
              {error && <div className="alert alert-danger">{error}</div>}
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button className="btn btn-success btn-full" type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</button>
                <button className="btn btn-secondary" type="button" onClick={() => setSheet(null)} disabled={loading}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

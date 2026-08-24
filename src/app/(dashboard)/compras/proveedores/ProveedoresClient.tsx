"use client";

// Lista de proveedores con acciones: crear, editar, inactivar/reactivar.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearProveedor } from "@/services/compras.actions";
import { editarProveedor, toggleProveedor } from "@/services/proveedores.acciones";

type Proveedor = { id: string; nombre: string; nit: string | null; telefono: string | null; direccion: string | null; activo: boolean };

export default function ProveedoresClient({ proveedores }: { proveedores: Proveedor[] }) {
  const router = useRouter();
  const [sheet, setSheet] = useState<null | "nuevo" | Proveedor>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editando = sheet && sheet !== "nuevo" ? (sheet as Proveedor) : null;

  async function guardar(fd: FormData) {
    setLoading(true); setError(null);
    const res = editando ? await editarProveedor(fd) : await crearProveedor(fd);
    setLoading(false);
    if (res.ok) { setSheet(null); router.refresh(); }
    else setError(res.error ?? "No se pudo guardar.");
  }

  async function inactivar(p: Proveedor) {
    const fd = new FormData();
    fd.set("id", p.id); fd.set("activo", String(p.activo));
    await toggleProveedor(fd); router.refresh();
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Proveedores</h1>
          <p className="muted" style={{ margin: 0 }}><a href="/compras">← Compras</a></p>
        </div>
        <button className="btn" onClick={() => { setSheet("nuevo"); setError(null); }}>+ Nuevo proveedor</button>
      </div>

      {proveedores.length === 0 ? (
        <div className="empty-state"><span className="emoji">🏭</span>Aún no hay proveedores.</div>
      ) : (
        <div className="list-cards" style={{ marginTop: 16 }}>
          {proveedores.map((p) => (
            <div className="list-item" key={p.id} style={{ opacity: p.activo ? 1 : 0.6 }}>
              <div className="row">
                <div>
                  <div className="title">{p.nombre}</div>
                  <div className="sub">{p.nit ? `NIT: ${p.nit}` : "Sin NIT"}{p.telefono ? ` · ${p.telefono}` : ""}</div>
                </div>
                <span className={`badge ${p.activo ? "badge-success" : "badge-muted"}`}>{p.activo ? "Activo" : "Inactivo"}</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setSheet(p); setError(null); }}>Editar</button>
                <button className={`btn btn-sm ${p.activo ? "btn-danger" : "btn-success"}`} onClick={() => inactivar(p)}>
                  {p.activo ? "Inactivar" : "Reactivar"}
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
            <h3 style={{ marginTop: 0 }}>{editando ? "Editar proveedor" : "Nuevo proveedor"}</h3>
            <form action={guardar}>
              {editando && <input type="hidden" name="id" value={editando.id} />}
              <div className="field">
                <label htmlFor="nombre">Nombre *</label>
                <input id="nombre" name="nombre" className="input" required defaultValue={editando?.nombre ?? ""} placeholder="Ej: Textiles del Sur" />
              </div>
              <div className="field">
                <label htmlFor="nit">NIT</label>
                <input id="nit" name="nit" className="input" defaultValue={editando?.nit ?? ""} placeholder="Opcional" />
              </div>
              <div className="field">
                <label htmlFor="telefono">Teléfono</label>
                <input id="telefono" name="telefono" className="input" inputMode="tel" defaultValue={editando?.telefono ?? ""} placeholder="Opcional" />
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

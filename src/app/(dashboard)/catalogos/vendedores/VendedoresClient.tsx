"use client";

// Lista de vendedores con acciones: crear, editar, inactivar/reactivar.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearVendedor, editarVendedor, toggleVendedor } from "@/services/catalogos.actions";

type Vendedor = { id: string; nombre: string; documento: string | null; telefono: string | null; municipio: string | null; activo: boolean };

export default function VendedoresClient({ vendedores }: { vendedores: Vendedor[] }) {
  const router = useRouter();
  const [sheet, setSheet] = useState<null | "nuevo" | Vendedor>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editando = sheet && sheet !== "nuevo" ? (sheet as Vendedor) : null;

  async function guardar(fd: FormData) {
    setLoading(true); setError(null);
    const res = editando ? await editarVendedor(fd) : await crearVendedor(fd);
    setLoading(false);
    if (res.ok) { setSheet(null); router.refresh(); }
    else setError(res.error ?? "No se pudo guardar.");
  }

  async function inactivar(v: Vendedor) {
    const fd = new FormData();
    fd.set("id", v.id); fd.set("activo", String(v.activo));
    await toggleVendedor(fd); router.refresh();
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Vendedores</h1>
          <p className="muted" style={{ margin: 0 }}><a href="/catalogos">← Catálogos</a></p>
        </div>
        <button className="btn" onClick={() => { setSheet("nuevo"); setError(null); }}>+ Nuevo vendedor</button>
      </div>

      {vendedores.length === 0 ? (
        <div className="empty-state"><span className="emoji">🧑‍💼</span>Aún no hay vendedores.</div>
      ) : (
        <div className="list-cards" style={{ marginTop: 16 }}>
          {vendedores.map((v) => (
            <div className="list-item" key={v.id} style={{ opacity: v.activo ? 1 : 0.6 }}>
              <div className="row">
                <div>
                  <div className="title">{v.nombre}</div>
                  <div className="sub">{v.municipio ?? "Sin municipio"}{v.telefono ? ` · ${v.telefono}` : ""}</div>
                </div>
                <span className={`badge ${v.activo ? "badge-success" : "badge-muted"}`}>{v.activo ? "Activo" : "Inactivo"}</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setSheet(v); setError(null); }}>Editar</button>
                <button className={`btn btn-sm ${v.activo ? "btn-danger" : "btn-success"}`} onClick={() => inactivar(v)}>
                  {v.activo ? "Inactivar" : "Reactivar"}
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
            <h3 style={{ marginTop: 0 }}>{editando ? "Editar vendedor" : "Nuevo vendedor"}</h3>
            <form action={guardar}>
              {editando && <input type="hidden" name="id" value={editando.id} />}
              <div className="field">
                <label htmlFor="nombre">Nombre *</label>
                <input id="nombre" name="nombre" className="input" required defaultValue={editando?.nombre ?? ""} placeholder="Nombre completo" />
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

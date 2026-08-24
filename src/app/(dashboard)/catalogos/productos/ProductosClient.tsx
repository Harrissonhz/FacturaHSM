"use client";

// Lista de productos con acciones: crear, editar, inactivar/reactivar.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearProducto, editarProducto, toggleProducto } from "@/services/catalogos.actions";

type Tipo = { id: string; nombre: string };
type Producto = { id: string; nombre: string; genero: string; activo: boolean; tipo_producto_id: string; tipoNombre: string };

export default function ProductosClient({
  productos,
  tipos,
}: {
  productos: Producto[];
  tipos: Tipo[];
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<null | "nuevo" | Producto>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editando = sheet && sheet !== "nuevo" ? (sheet as Producto) : null;

  async function guardar(fd: FormData) {
    setLoading(true);
    setError(null);
    const res = editando ? await editarProducto(fd) : await crearProducto(fd);
    setLoading(false);
    if (res.ok) { setSheet(null); router.refresh(); }
    else setError(res.error ?? "No se pudo guardar.");
  }

  async function inactivar(p: Producto) {
    const fd = new FormData();
    fd.set("id", p.id);
    fd.set("activo", String(p.activo));
    await toggleProducto(fd);
    router.refresh();
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Productos</h1>
          <p className="muted" style={{ margin: 0 }}><a href="/catalogos">← Catálogos</a></p>
        </div>
        <button className="btn" onClick={() => { setSheet("nuevo"); setError(null); }}>+ Nuevo producto</button>
      </div>

      {productos.length === 0 ? (
        <div className="empty-state"><span className="emoji">👕</span>Aún no hay productos.</div>
      ) : (
        <div className="list-cards" style={{ marginTop: 16 }}>
          {productos.map((p) => (
            <div className="list-item" key={p.id} style={{ opacity: p.activo ? 1 : 0.6 }}>
              <div className="row">
                <div>
                  <div className="title">{p.nombre}</div>
                  <div className="sub">{p.tipoNombre} · {p.genero}</div>
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
            <h3 style={{ marginTop: 0 }}>{editando ? "Editar producto" : "Nuevo producto"}</h3>
            <form action={guardar}>
              {editando && <input type="hidden" name="id" value={editando.id} />}
              <div className="field">
                <label htmlFor="nombre">Nombre *</label>
                <input id="nombre" name="nombre" className="input" required defaultValue={editando?.nombre ?? ""} placeholder="Ej: Camisa básica" />
              </div>
              <div className="field">
                <label htmlFor="tipo_producto_id">Tipo *</label>
                <select id="tipo_producto_id" name="tipo_producto_id" className="select" required defaultValue={editando?.tipo_producto_id ?? ""}>
                  {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="genero">Género</label>
                <select id="genero" name="genero" className="select" defaultValue={editando?.genero ?? "UNISEX"}>
                  <option value="DAMA">Dama</option>
                  <option value="HOMBRE">Hombre</option>
                  <option value="UNISEX">Unisex</option>
                </select>
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

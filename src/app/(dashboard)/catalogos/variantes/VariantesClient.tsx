"use client";

// Lista de variantes con acciones: crear, editar (referencia + precios), inactivar/reactivar.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";
import { crearVariante, editarVariante, toggleVariante } from "@/services/catalogos.actions";

type Opt = { id: string; nombre: string };
type Variante = {
  id: string; sku: string; referencia: string; precio_base: number; precio_segunda: number;
  activo: boolean; producto: string; color: string; talla: string;
};

export default function VariantesClient({
  variantes, productos, colores, tallas,
}: {
  variantes: Variante[]; productos: Opt[]; colores: Opt[]; tallas: Opt[];
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<null | "nuevo" | Variante>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editando = sheet && sheet !== "nuevo" ? (sheet as Variante) : null;
  const faltan = productos.length === 0 || colores.length === 0 || tallas.length === 0;

  async function guardar(fd: FormData) {
    setLoading(true); setError(null);
    const res = editando ? await editarVariante(fd) : await crearVariante(fd);
    setLoading(false);
    if (res.ok) { setSheet(null); router.refresh(); }
    else setError(res.error ?? "No se pudo guardar.");
  }

  async function inactivar(v: Variante) {
    const fd = new FormData();
    fd.set("id", v.id); fd.set("activo", String(v.activo));
    await toggleVariante(fd); router.refresh();
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Variantes</h1>
          <p className="muted" style={{ margin: 0 }}><a href="/catalogos">← Catálogos</a></p>
        </div>
        <button className="btn" onClick={() => { setSheet("nuevo"); setError(null); }} disabled={faltan}>+ Nueva variante</button>
      </div>
      {faltan && <p className="sub" style={{ marginTop: 6 }}>Necesitas al menos un producto, color y talla.</p>}

      {variantes.length === 0 ? (
        <div className="empty-state"><span className="emoji">🏷️</span>Aún no hay variantes.</div>
      ) : (
        <div className="list-cards" style={{ marginTop: 16 }}>
          {variantes.map((v) => (
            <div className="list-item" key={v.id} style={{ opacity: v.activo ? 1 : 0.6 }}>
              <div className="row">
                <div>
                  <div className="title">{v.sku}</div>
                  <div className="sub">{v.producto} · {v.color} · {v.talla}</div>
                </div>
                <div className="amount">{money(v.precio_base)}</div>
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
            <h3 style={{ marginTop: 0 }}>{editando ? "Editar variante" : "Nueva variante (SKU)"}</h3>
            <form action={guardar}>
              {editando && <input type="hidden" name="id" value={editando.id} />}

              {!editando && (
                <>
                  <div className="field">
                    <label htmlFor="producto_id">Producto *</label>
                    <select id="producto_id" name="producto_id" className="select" required>
                      {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="color_id">Color *</label>
                    <select id="color_id" name="color_id" className="select" required>
                      {colores.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="talla_id">Talla *</label>
                    <select id="talla_id" name="talla_id" className="select" required>
                      {tallas.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div className="field">
                <label htmlFor="referencia">Referencia *</label>
                <input id="referencia" name="referencia" className="input" required defaultValue={editando?.referencia ?? ""} placeholder="Ej: REF001" />
              </div>
              <div className="field">
                <label htmlFor="precio_base">Precio (primera calidad)</label>
                <input id="precio_base" name="precio_base" className="input tabular" type="number" inputMode="numeric" min={0} defaultValue={editando?.precio_base ?? 0} />
              </div>
              <div className="field">
                <label htmlFor="precio_segunda">Precio (segunda calidad, opcional)</label>
                <input id="precio_segunda" name="precio_segunda" className="input tabular" type="number" inputMode="numeric" min={0} defaultValue={editando?.precio_segunda ?? 0} />
              </div>

              {editando && (
                <p className="sub" style={{ marginTop: -4 }}>
                  El color y la talla no se editan (afectarían el SKU y el histórico).
                </p>
              )}

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

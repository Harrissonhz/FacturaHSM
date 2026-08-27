"use client";

// ---------------------------------------------------------------------
// Componente genérico para catálogos base (Colores, Tallas, Tipos, Procesos).
// CRUD: crear / editar / inactivar-reactivar, con bottom sheet.
// Reutilizable: recibe las acciones y si maneja "orden" (tallas).
// ---------------------------------------------------------------------
import { useState } from "react";
import { useRouter } from "next/navigation";

export type ItemBase = { id: string; codigo: string; nombre: string; activo: boolean; orden?: number };

type Acciones = {
  crear: (fd: FormData) => Promise<{ ok: boolean; error?: string }>;
  editar: (fd: FormData) => Promise<{ ok: boolean; error?: string }>;
  toggle: (fd: FormData) => Promise<{ ok: boolean; error?: string }>;
};

export default function CatalogoBaseClient({
  titulo,
  singular,
  emoji,
  volverHref,
  items,
  acciones,
  conOrden = false,
}: {
  titulo: string;          // "Colores"
  singular: string;        // "color"
  emoji: string;           // "🎨"
  volverHref: string;      // "/catalogos"
  items: ItemBase[];
  acciones: Acciones;
  conOrden?: boolean;      // true solo para Tallas
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<null | "nuevo" | ItemBase>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editando = sheet && sheet !== "nuevo" ? (sheet as ItemBase) : null;

  async function guardar(fd: FormData) {
    setLoading(true); setError(null);
    const res = editando ? await acciones.editar(fd) : await acciones.crear(fd);
    setLoading(false);
    if (res.ok) { setSheet(null); router.refresh(); }
    else setError(res.error ?? "No se pudo guardar.");
  }

  async function inactivar(it: ItemBase) {
    const fd = new FormData();
    fd.set("id", it.id); fd.set("activo", String(it.activo));
    await acciones.toggle(fd); router.refresh();
  }

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>{titulo}</h1>
          <p className="muted" style={{ margin: 0 }}><a href={volverHref}>← Catálogos</a></p>
        </div>
        <button className="btn" onClick={() => { setSheet("nuevo"); setError(null); }}>+ Nuevo {singular}</button>
      </div>

      {items.length === 0 ? (
        <div className="empty-state"><span className="emoji">{emoji}</span>Aún no hay {titulo.toLowerCase()}.</div>
      ) : (
        <div className="list-cards" style={{ marginTop: 16 }}>
          {items.map((it) => (
            <div className="list-item" key={it.id} style={{ opacity: it.activo ? 1 : 0.6 }}>
              <div className="row">
                <div>
                  <div className="title">{it.nombre}</div>
                  <div className="sub">Código: {it.codigo}{conOrden && it.orden != null ? ` · Orden: ${it.orden}` : ""}</div>
                </div>
                <span className={`badge ${it.activo ? "badge-success" : "badge-muted"}`}>{it.activo ? "Activo" : "Inactivo"}</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setSheet(it); setError(null); }}>Editar</button>
                <button className={`btn btn-sm ${it.activo ? "btn-danger" : "btn-success"}`} onClick={() => inactivar(it)}>
                  {it.activo ? "Inactivar" : "Reactivar"}
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
            <h3 style={{ marginTop: 0 }}>{editando ? `Editar ${singular}` : `Nuevo ${singular}`}</h3>
            <form action={guardar}>
              {editando && <input type="hidden" name="id" value={editando.id} />}

              {/* Código: solo al crear (no se edita para no romper SKUs) */}
              {!editando ? (
                <div className="field">
                  <label htmlFor="codigo">Código *</label>
                  <input id="codigo" name="codigo" className="input" required maxLength={10}
                    placeholder="Ej: VER, XXL, PANT" style={{ textTransform: "uppercase" }} />
                  <p className="sub" style={{ margin: "4px 0 0" }}>Corto, sin espacios. Se usa en el SKU.</p>
                </div>
              ) : (
                <div className="field">
                  <label>Código</label>
                  <input className="input" value={editando.codigo} disabled />
                  <p className="sub" style={{ margin: "4px 0 0" }}>El código no se edita (afecta los SKU existentes).</p>
                </div>
              )}

              <div className="field">
                <label htmlFor="nombre">Nombre *</label>
                <input id="nombre" name="nombre" className="input" required defaultValue={editando?.nombre ?? ""}
                  placeholder={`Nombre del ${singular}`} />
              </div>

              {conOrden && (
                <div className="field">
                  <label htmlFor="orden">Orden (para ordenar la lista)</label>
                  <input id="orden" name="orden" className="input tabular" type="number" inputMode="numeric" min={0}
                    defaultValue={editando?.orden ?? 0} />
                </div>
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
    </main>
  );
}

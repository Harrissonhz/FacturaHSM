"use client";

// Formulario de creación de Variante (SKU) + precios por calidad.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearVariante } from "@/services/catalogos.actions";

type Opt = { id: string; nombre: string };

export default function VarianteForm({
  productos,
  colores,
  tallas,
}: {
  productos: Opt[];
  colores: Opt[];
  tallas: Opt[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accion(formData: FormData) {
    setLoading(true);
    setError(null);
    const res = await crearVariante(formData);
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError(res.error ?? "No se pudo crear la variante.");
    }
  }

  const faltanCatalogos = productos.length === 0 || colores.length === 0 || tallas.length === 0;

  return (
    <>
      <button className="btn" onClick={() => setOpen(true)} disabled={faltanCatalogos}>
        + Nueva variante
      </button>
      {faltanCatalogos && (
        <p className="sub" style={{ marginTop: 6 }}>
          Necesitas al menos un producto, color y talla.
        </p>
      )}

      {open && (
        <div className="sheet-overlay" onClick={() => !loading && setOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="handle" />
            <h3 style={{ marginTop: 0 }}>Nueva variante (SKU)</h3>
            <form action={accion}>
              <div className="field">
                <label htmlFor="producto_id">Producto *</label>
                <select id="producto_id" name="producto_id" className="select" required>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="referencia">Referencia *</label>
                <input id="referencia" name="referencia" className="input" required placeholder="Ej: REF001" />
              </div>
              <div className="field">
                <label htmlFor="color_id">Color *</label>
                <select id="color_id" name="color_id" className="select" required>
                  {colores.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="talla_id">Talla *</label>
                <select id="talla_id" name="talla_id" className="select" required>
                  {tallas.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="precio_base">Precio (primera calidad)</label>
                <input id="precio_base" name="precio_base" className="input tabular" type="number" inputMode="numeric" min={0} defaultValue={0} />
              </div>
              <div className="field">
                <label htmlFor="precio_segunda">Precio (segunda calidad, opcional)</label>
                <input id="precio_segunda" name="precio_segunda" className="input tabular" type="number" inputMode="numeric" min={0} defaultValue={0} />
              </div>

              {error && <div className="alert alert-danger">{error}</div>}

              <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
                <button className="btn btn-success btn-full" type="submit" disabled={loading}>
                  {loading ? "Guardando..." : "Guardar variante"}
                </button>
                <button className="btn btn-secondary" type="button" onClick={() => setOpen(false)} disabled={loading}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

// Formulario de creación de Producto (bottom sheet) con feedback.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearProducto } from "@/services/catalogos.actions";

type Tipo = { id: string; nombre: string };

export default function ProductoForm({ tipos }: { tipos: Tipo[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accion(formData: FormData) {
    setLoading(true);
    setError(null);
    const res = await crearProducto(formData);
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError(res.error ?? "No se pudo crear el producto.");
    }
  }

  return (
    <>
      <button className="btn" onClick={() => setOpen(true)}>+ Nuevo producto</button>

      {open && (
        <div className="sheet-overlay" onClick={() => !loading && setOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="handle" />
            <h3 style={{ marginTop: 0 }}>Nuevo producto</h3>
            <form action={accion}>
              <div className="field">
                <label htmlFor="nombre">Nombre *</label>
                <input id="nombre" name="nombre" className="input" required placeholder="Ej: Camisa básica" />
              </div>
              <div className="field">
                <label htmlFor="tipo_producto_id">Tipo *</label>
                <select id="tipo_producto_id" name="tipo_producto_id" className="select" required>
                  {tipos.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="genero">Género</label>
                <select id="genero" name="genero" className="select" defaultValue="UNISEX">
                  <option value="DAMA">Dama</option>
                  <option value="HOMBRE">Hombre</option>
                  <option value="UNISEX">Unisex</option>
                </select>
              </div>

              {error && <div className="alert alert-danger">{error}</div>}

              <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
                <button className="btn btn-success btn-full" type="submit" disabled={loading}>
                  {loading ? "Guardando..." : "Guardar producto"}
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

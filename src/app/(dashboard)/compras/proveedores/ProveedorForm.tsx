"use client";

// Formulario de creación de Proveedor (bottom sheet).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearProveedor } from "@/services/compras.actions";

export default function ProveedorForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accion(formData: FormData) {
    setLoading(true);
    setError(null);
    const res = await crearProveedor(formData);
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError(res.error ?? "No se pudo crear el proveedor.");
    }
  }

  return (
    <>
      <button className="btn" onClick={() => setOpen(true)}>+ Nuevo proveedor</button>

      {open && (
        <div className="sheet-overlay" onClick={() => !loading && setOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="handle" />
            <h3 style={{ marginTop: 0 }}>Nuevo proveedor</h3>
            <form action={accion}>
              <div className="field">
                <label htmlFor="nombre">Nombre *</label>
                <input id="nombre" name="nombre" className="input" required placeholder="Ej: Textiles del Sur" />
              </div>
              <div className="field">
                <label htmlFor="nit">NIT</label>
                <input id="nit" name="nit" className="input" placeholder="Opcional" />
              </div>
              <div className="field">
                <label htmlFor="telefono">Teléfono</label>
                <input id="telefono" name="telefono" className="input" inputMode="tel" placeholder="Opcional" />
              </div>
              <div className="field">
                <label htmlFor="direccion">Dirección</label>
                <input id="direccion" name="direccion" className="input" placeholder="Opcional" />
              </div>

              {error && <div className="alert alert-danger">{error}</div>}

              <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
                <button className="btn btn-success btn-full" type="submit" disabled={loading}>
                  {loading ? "Guardando..." : "Guardar proveedor"}
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

"use client";

// Formulario de creación de Vendedor (+ ubicacion automatica).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearVendedor } from "@/services/catalogos.actions";

export default function VendedorForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accion(formData: FormData) {
    setLoading(true);
    setError(null);
    const res = await crearVendedor(formData);
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError(res.error ?? "No se pudo crear el vendedor.");
    }
  }

  return (
    <>
      <button className="btn" onClick={() => setOpen(true)}>+ Nuevo vendedor</button>

      {open && (
        <div className="sheet-overlay" onClick={() => !loading && setOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="handle" />
            <h3 style={{ marginTop: 0 }}>Nuevo vendedor</h3>
            <form action={accion}>
              <div className="field">
                <label htmlFor="nombre">Nombre *</label>
                <input id="nombre" name="nombre" className="input" required placeholder="Nombre completo" />
              </div>
              <div className="field">
                <label htmlFor="documento">Documento</label>
                <input id="documento" name="documento" className="input" placeholder="Opcional" />
              </div>
              <div className="field">
                <label htmlFor="telefono">Teléfono</label>
                <input id="telefono" name="telefono" className="input" inputMode="tel" placeholder="Opcional" />
              </div>
              <div className="field">
                <label htmlFor="municipio">Municipio</label>
                <input id="municipio" name="municipio" className="input" placeholder="Ej: Jericó" />
              </div>

              {error && <div className="alert alert-danger">{error}</div>}

              <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
                <button className="btn btn-success btn-full" type="submit" disabled={loading}>
                  {loading ? "Guardando..." : "Guardar vendedor"}
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

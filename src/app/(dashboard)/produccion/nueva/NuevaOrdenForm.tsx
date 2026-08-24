"use client";

// Formulario de nueva orden de producción. Número AUTOMÁTICO (OP-XXXXXX).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearOrdenProduccion } from "@/services/produccion.actions";

type Proceso = { id: string; nombre: string };
type Crudo = { variante_id: string; sku: string; disponible: number };
type Linea = { variante_id: string; sku: string; disponible: number; cantidad: number };

export default function NuevaOrdenForm({
  procesos,
  crudos,
}: {
  procesos: Proceso[];
  crudos: Crudo[];
}) {
  const router = useRouter();
  const [procesoId, setProcesoId] = useState(procesos[0]?.id ?? "");
  const [varSel, setVarSel] = useState(crudos[0]?.variante_id ?? "");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function agregar() {
    const c = crudos.find((x) => x.variante_id === varSel);
    if (!c) return;
    if (lineas.some((l) => l.variante_id === c.variante_id)) return;
    setLineas((prev) => [...prev, { ...c, cantidad: c.disponible }]);
  }
  function actualizar(id: string, valor: number, max: number) {
    setLineas((prev) => prev.map((l) => (l.variante_id === id ? { ...l, cantidad: Math.max(0, Math.min(max, valor)) } : l)));
  }
  function quitar(id: string) {
    setLineas((prev) => prev.filter((l) => l.variante_id !== id));
  }

  async function guardar() {
    setError(null);
    if (!procesoId) {
      setError("Selecciona un proceso.");
      return;
    }
    if (lineas.length === 0) {
      setError("Agrega al menos una unidad a producir.");
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.set("proceso_id", procesoId);
    fd.set("entradas", JSON.stringify(lineas.map((l) => ({ variante_id: l.variante_id, cantidad: l.cantidad }))));
    const res = await crearOrdenProduccion(fd);
    setLoading(false);
    if (res.ok) {
      router.push("/produccion");
      router.refresh();
    } else {
      setError(res.error ?? "No se pudo crear la orden.");
    }
  }

  return (
    <>
      <div className="card">
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="proceso">Proceso *</label>
          <select id="proceso" className="select" value={procesoId} onChange={(e) => setProcesoId(e.target.value)}>
            {procesos.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <p className="sub" style={{ marginTop: 10, marginBottom: 0 }}>
          El número de orden se asigna automáticamente (OP-XXXXXX).
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Unidades a producir (desde CRUDO)</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="variante">Variante</label>
            <select id="variante" className="select" value={varSel} onChange={(e) => setVarSel(e.target.value)}>
              {crudos.map((c) => (
                <option key={c.variante_id} value={c.variante_id}>{c.sku} (disp: {c.disponible})</option>
              ))}
            </select>
          </div>
          <button className="btn" onClick={agregar}>Agregar</button>
        </div>

        {lineas.length > 0 && (
          <div className="list-cards" style={{ marginTop: 16 }}>
            {lineas.map((l) => (
              <div className="list-item" key={l.variante_id}>
                <div className="row">
                  <div>
                    <div className="title">{l.sku}</div>
                    <div className="sub">Disponible en CRUDO: {l.disponible}</div>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => quitar(l.variante_id)}>Quitar</button>
                </div>
                <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
                  <label>Cantidad a producir</label>
                  <input className="input tabular" type="number" inputMode="numeric" min={1} max={l.disponible} value={l.cantidad}
                    onChange={(e) => actualizar(l.variante_id, Number(e.target.value), l.disponible)} style={{ width: 140 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <button className="btn btn-success btn-full" onClick={guardar} disabled={loading}>
        {loading ? "Creando..." : "Crear orden"}
      </button>
    </>
  );
}

"use client";

// Cierra la orden registrando resultados por calidad (primera/segunda/merma).
// Valida en cliente que el total cuadre con las entradas antes de enviar.
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ejecutarProduccion } from "@/services/produccion.actions";

type Entrada = { variante_id: string; sku: string; cantidad: number };
type Fila = { variante_id: string; sku: string; primera: number; segunda: number; merma: number };

export default function EjecutarForm({
  ordenId,
  entradas,
  totalEntradas,
}: {
  ordenId: string;
  entradas: Entrada[];
  totalEntradas: number;
}) {
  const router = useRouter();
  const [filas, setFilas] = useState<Fila[]>(
    entradas.map((e) => ({ variante_id: e.variante_id, sku: e.sku, primera: e.cantidad, segunda: 0, merma: 0 }))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalResultados = useMemo(
    () => filas.reduce((s, f) => s + f.primera + f.segunda + f.merma, 0),
    [filas]
  );
  const cuadra = totalResultados === totalEntradas;

  function set(id: string, campo: "primera" | "segunda" | "merma", valor: number) {
    setFilas((prev) =>
      prev.map((f) => (f.variante_id === id ? { ...f, [campo]: Math.max(0, valor) } : f))
    );
  }

  async function ejecutar() {
    setError(null);
    if (!cuadra) {
      setError(`El total de resultados (${totalResultados}) debe ser igual a lo que entró (${totalEntradas}).`);
      return;
    }
    // Construir resultados con calidad_codigo
    const resultados: { variante_id: string; calidad_codigo: string; cantidad: number }[] = [];
    for (const f of filas) {
      if (f.primera > 0) resultados.push({ variante_id: f.variante_id, calidad_codigo: "PRIMERA", cantidad: f.primera });
      if (f.segunda > 0) resultados.push({ variante_id: f.variante_id, calidad_codigo: "SEGUNDA", cantidad: f.segunda });
      if (f.merma > 0) resultados.push({ variante_id: f.variante_id, calidad_codigo: "MERMA", cantidad: f.merma });
    }

    setLoading(true);
    const fd = new FormData();
    fd.set("orden_id", ordenId);
    fd.set("resultados", JSON.stringify(resultados));
    const res = await ejecutarProduccion(fd);
    setLoading(false);
    if (res.ok) {
      router.refresh();
    } else {
      setError(res.error ?? "No se pudo cerrar la orden.");
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Registrar resultados (cerrar orden)</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Indica cuántas quedaron de cada calidad. El total debe ser igual a lo que entró.
      </p>

      <div className="list-cards">
        {filas.map((f) => (
          <div className="list-item" key={f.variante_id}>
            <div className="title">{f.sku}</div>
            <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Primera</label>
                <input className="input tabular" type="number" inputMode="numeric" min={0} value={f.primera}
                  onChange={(e) => set(f.variante_id, "primera", Number(e.target.value))} style={{ width: 90 }} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Segunda</label>
                <input className="input tabular" type="number" inputMode="numeric" min={0} value={f.segunda}
                  onChange={(e) => set(f.variante_id, "segunda", Number(e.target.value))} style={{ width: 90 }} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Merma</label>
                <input className="input tabular" type="number" inputMode="numeric" min={0} value={f.merma}
                  onChange={(e) => set(f.variante_id, "merma", Number(e.target.value))} style={{ width: 90 }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
        <span className="muted">Total resultados</span>
        <span className={cuadra ? "amount" : "amount"} style={{ color: cuadra ? "var(--color-success)" : "var(--color-danger)" }}>
          {totalResultados} / {totalEntradas}
        </span>
      </div>

      {error && <div className="alert alert-danger" style={{ marginTop: 12 }}>{error}</div>}

      <button className="btn btn-success btn-full" style={{ marginTop: 12 }} onClick={ejecutar} disabled={loading || !cuadra}>
        {loading ? "Cerrando..." : "Cerrar orden y pasar a TERMINADO"}
      </button>
    </div>
  );
}

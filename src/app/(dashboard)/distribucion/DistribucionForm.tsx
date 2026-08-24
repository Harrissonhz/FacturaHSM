"use client";

// Formulario de distribución: elegir vendedor + items LISTO a enviar.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { distribuir } from "@/services/produccion.actions";
import EstadoBadge from "@/components/EstadoBadge";

type Vendedor = { id: string; nombre: string; municipio: string | null };
type Item = {
  variante_id: string;
  calidad_id: string;
  sku: string;
  calidad: string;
  disponible: number;
};
type Linea = Item & { cantidad: number; key: string };

export default function DistribucionForm({
  vendedores,
  items,
}: {
  vendedores: Vendedor[];
  items: Item[];
}) {
  const router = useRouter();
  const [vendedorId, setVendedorId] = useState(vendedores[0]?.id ?? "");
  const [numero, setNumero] = useState("");
  const [sel, setSel] = useState(items[0] ? items[0].variante_id + items[0].calidad_id : "");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function agregar() {
    const it = items.find((x) => x.variante_id + x.calidad_id === sel);
    if (!it) return;
    const key = it.variante_id + it.calidad_id;
    if (lineas.some((l) => l.key === key)) return;
    setLineas((prev) => [...prev, { ...it, key, cantidad: it.disponible }]);
  }
  function actualizar(key: string, valor: number, max: number) {
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, cantidad: Math.max(0, Math.min(max, valor)) } : l)));
  }
  function quitar(key: string) {
    setLineas((prev) => prev.filter((l) => l.key !== key));
  }

  async function enviar() {
    setError(null);
    if (!vendedorId || !numero.trim()) {
      setError("Vendedor y número son obligatorios.");
      return;
    }
    if (lineas.length === 0) {
      setError("Agrega al menos una unidad a enviar.");
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.set("vendedor_id", vendedorId);
    fd.set("numero", numero.trim());
    fd.set("items", JSON.stringify(lineas.map((l) => ({ variante_id: l.variante_id, calidad_id: l.calidad_id, cantidad: l.cantidad }))));
    const res = await distribuir(fd);
    setLoading(false);
    if (res.ok) {
      router.push("/inventario");
      router.refresh();
    } else {
      setError(res.error ?? "No se pudo distribuir.");
    }
  }

  return (
    <>
      <div className="card">
        <div className="field">
          <label htmlFor="vendedor">Vendedor *</label>
          <select id="vendedor" className="select" value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>{v.nombre}{v.municipio ? ` · ${v.municipio}` : ""}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="numero">Número de envío *</label>
          <input id="numero" className="input" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ej: ENV-0001" />
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Productos a enviar (LISTO)</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="item">Producto</label>
            <select id="item" className="select" value={sel} onChange={(e) => setSel(e.target.value)}>
              {items.map((it) => (
                <option key={it.variante_id + it.calidad_id} value={it.variante_id + it.calidad_id}>
                  {it.sku} · {it.calidad} (disp: {it.disponible})
                </option>
              ))}
            </select>
          </div>
          <button className="btn" onClick={agregar}>Agregar</button>
        </div>

        {lineas.length > 0 && (
          <div className="list-cards" style={{ marginTop: 16 }}>
            {lineas.map((l) => (
              <div className="list-item" key={l.key}>
                <div className="row">
                  <div>
                    <div className="title">{l.sku}</div>
                    <div className="sub"><EstadoBadge estado={l.calidad} /> · disp: {l.disponible}</div>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => quitar(l.key)}>Quitar</button>
                </div>
                <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
                  <label>Cantidad a enviar</label>
                  <input
                    className="input tabular"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={l.disponible}
                    value={l.cantidad}
                    onChange={(e) => actualizar(l.key, Number(e.target.value), l.disponible)}
                    style={{ width: 140 }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <button className="btn btn-success btn-full" onClick={enviar} disabled={loading}>
        {loading ? "Enviando..." : "Enviar al vendedor"}
      </button>
    </>
  );
}

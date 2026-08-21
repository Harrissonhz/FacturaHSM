"use client";

// Formulario de Nueva compra: cabecera + detalle (agregar variantes).
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";
import { crearCompra } from "@/services/compras.actions";

type Prov = { id: string; nombre: string };
type Var = { id: string; sku: string; precio_base: number };
type Linea = { variante_id: string; sku: string; cantidad: number; costo: number };

export default function NuevaCompraForm({
  proveedores,
  variantes,
}: {
  proveedores: Prov[];
  variantes: Var[];
}) {
  const router = useRouter();
  const [proveedorId, setProveedorId] = useState(proveedores[0]?.id ?? "");
  const [numero, setNumero] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [varSel, setVarSel] = useState(variantes[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(
    () => lineas.reduce((s, l) => s + l.cantidad * l.costo, 0),
    [lineas]
  );

  function agregar() {
    const v = variantes.find((x) => x.id === varSel);
    if (!v) return;
    if (lineas.some((l) => l.variante_id === v.id)) return; // ya está
    setLineas((prev) => [
      ...prev,
      { variante_id: v.id, sku: v.sku, cantidad: 1, costo: 0 },
    ]);
  }

  function actualizar(id: string, campo: "cantidad" | "costo", valor: number) {
    setLineas((prev) =>
      prev.map((l) => (l.variante_id === id ? { ...l, [campo]: Math.max(0, valor) } : l))
    );
  }

  function quitar(id: string) {
    setLineas((prev) => prev.filter((l) => l.variante_id !== id));
  }

  async function guardar() {
    setError(null);
    if (!proveedorId || !numero.trim()) {
      setError("Proveedor y número son obligatorios.");
      return;
    }
    if (lineas.length === 0) {
      setError("Agrega al menos un producto.");
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.set("proveedor_id", proveedorId);
    fd.set("numero", numero.trim());
    fd.set(
      "items",
      JSON.stringify(
        lineas.map((l) => ({ variante_id: l.variante_id, cantidad: l.cantidad, costo: l.costo }))
      )
    );
    const res = await crearCompra(fd);
    setLoading(false);
    if (res.ok) {
      router.push("/compras");
      router.refresh();
    } else {
      setError(res.error ?? "No se pudo crear la compra.");
    }
  }

  return (
    <>
      <div className="card">
        <div className="field">
          <label htmlFor="proveedor">Proveedor *</label>
          <select id="proveedor" className="select" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="numero">Número de compra *</label>
          <input id="numero" className="input" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ej: OC-0002" />
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Productos</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="variante">Variante</label>
            <select id="variante" className="select" value={varSel} onChange={(e) => setVarSel(e.target.value)}>
              {variantes.map((v) => (
                <option key={v.id} value={v.id}>{v.sku}</option>
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
                  <div className="title">{l.sku}</div>
                  <button className="btn btn-danger btn-sm" onClick={() => quitar(l.variante_id)}>Quitar</button>
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Cantidad</label>
                    <input
                      className="input tabular"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={l.cantidad}
                      onChange={(e) => actualizar(l.variante_id, "cantidad", Number(e.target.value))}
                      style={{ width: 110 }}
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Costo unitario</label>
                    <input
                      className="input tabular"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={l.costo}
                      onChange={(e) => actualizar(l.variante_id, "costo", Number(e.target.value))}
                      style={{ width: 140 }}
                    />
                  </div>
                  <div style={{ marginLeft: "auto", textAlign: "right" }}>
                    <div className="sub">Subtotal</div>
                    <div className="amount">{money(l.cantidad * l.costo)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: "1px solid var(--color-border)", paddingTop: 16 }}>
          <span className="muted">Total de la compra</span>
          <span className="amount amount-lg">{money(total)}</span>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <button className="btn btn-success btn-full" onClick={guardar} disabled={loading}>
        {loading ? "Guardando..." : "Registrar compra"}
      </button>
    </>
  );
}

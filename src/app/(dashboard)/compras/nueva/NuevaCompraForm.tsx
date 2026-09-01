"use client";

// Nueva compra con SELECTOR EN CASCADA (Producto[img] → Talla → Color, sin calidad).
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";
import { crearCompra } from "@/services/compras.actions";
import SelectorCascada, { type Unidad } from "@/components/SelectorCascada";

type Prov = { id: string; nombre: string };
type Var = {
  key: string; variante_id: string; producto: string; productoImg: string | null;
  talla: string; tallaOrden: number; color: string; sku: string; precio: number;
};
type Linea = { key: string; variante_id: string; producto: string; talla: string; color: string; cantidad: number; costo: number };

export default function NuevaCompraForm({
  proveedores, variantes,
}: {
  proveedores: Prov[]; variantes: Var[];
}) {
  const router = useRouter();
  const [proveedorId, setProveedorId] = useState(proveedores[0]?.id ?? "");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unidades: Unidad[] = useMemo(
    () => variantes.map((v) => ({
      key: v.key, variante_id: v.variante_id, producto: v.producto, productoImg: v.productoImg,
      talla: v.talla, tallaOrden: v.tallaOrden, color: v.color, sku: v.sku, precio: v.precio,
    })),
    [variantes]
  );

  const total = useMemo(() => lineas.reduce((s, l) => s + l.cantidad * l.costo, 0), [lineas]);

  function agregarUnidad(u: Unidad) {
    if (lineas.some((l) => l.key === u.key)) return;
    setLineas((prev) => [...prev, {
      key: u.key, variante_id: u.variante_id, producto: u.producto, talla: u.talla, color: u.color,
      cantidad: 1, costo: 0,
    }]);
  }
  function actualizar(key: string, campo: "cantidad" | "costo", valor: number) {
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, [campo]: Math.max(0, valor) } : l)));
  }
  function quitar(key: string) {
    setLineas((prev) => prev.filter((l) => l.key !== key));
  }

  async function guardar() {
    setError(null);
    if (!proveedorId) { setError("Selecciona un proveedor."); return; }
    if (lineas.length === 0) { setError("Agrega al menos un producto."); return; }
    setLoading(true);
    const fd = new FormData();
    fd.set("proveedor_id", proveedorId);
    fd.set("items", JSON.stringify(lineas.map((l) => ({ variante_id: l.variante_id, cantidad: l.cantidad, costo: l.costo }))));
    const res = await crearCompra(fd);
    setLoading(false);
    if (res.ok) { router.push("/compras"); router.refresh(); }
    else setError(res.error ?? "No se pudo crear la compra.");
  }

  return (
    <>
      <div className="card">
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="proveedor">Proveedor *</label>
          <select id="proveedor" className="select" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
            {proveedores.map((p) => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
          </select>
        </div>
        <p className="sub" style={{ marginTop: 10, marginBottom: 0 }}>El número de compra se asigna automáticamente (OC-XXXXXX).</p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Agregar productos</h3>
        <SelectorCascada unidades={unidades} onAgregar={agregarUnidad} />
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Detalle de compra ({lineas.length})</h3>
        {lineas.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>Aún no has agregado productos.</p>
        ) : (
          <div className="list-cards">
            {lineas.map((l) => (
              <div className="list-item" key={l.key}>
                <div className="row">
                  <div className="title">{l.producto} · {l.talla} · {l.color}</div>
                  <button className="btn btn-danger btn-sm" onClick={() => quitar(l.key)}>Quitar</button>
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Cantidad</label>
                    <input className="input tabular" type="number" inputMode="numeric" min={1} value={l.cantidad}
                      onChange={(e) => actualizar(l.key, "cantidad", Number(e.target.value))} style={{ width: 110 }} />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Costo unitario</label>
                    <input className="input tabular" type="number" inputMode="numeric" min={0} value={l.costo}
                      onChange={(e) => actualizar(l.key, "costo", Number(e.target.value))} style={{ width: 140 }} />
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

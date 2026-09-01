"use client";

// ---------------------------------------------------------------------
// Selector en cascada (mobile-first) para elegir una variante:
//   [Calidad] → Producto (con IMAGEN) → Talla → Color → (al carrito)
// Reutilizable para VENTA (con calidad + stock) y COMPRA (sin calidad).
// ---------------------------------------------------------------------
import { useState, useMemo } from "react";
import { money } from "@/lib/format";

export type Unidad = {
  key: string;
  variante_id: string;
  producto: string;
  productoImg?: string | null;   // ruta de imagen del producto
  talla: string;
  tallaOrden: number;
  color: string;
  sku: string;
  calidad?: string;
  calidad_id?: string;
  precio?: number;
  stock?: number;
};

export default function SelectorCascada({
  unidades,
  conCalidad = false,
  mostrarStock = false,
  mostrarPrecio = false,
  onAgregar,
}: {
  unidades: Unidad[];
  conCalidad?: boolean;
  mostrarStock?: boolean;
  mostrarPrecio?: boolean;
  onAgregar: (u: Unidad) => void;
}) {
  const [calidad, setCalidad] = useState<string>("PRIMERA");
  const [producto, setProducto] = useState<string | null>(null);
  const [talla, setTalla] = useState<string | null>(null);

  const base = useMemo(
    () => (conCalidad ? unidades.filter((u) => u.calidad === calidad) : unidades),
    [unidades, conCalidad, calidad]
  );

  // Productos únicos con su imagen (toma la primera imagen encontrada por producto)
  const productos = useMemo(() => {
    const map = new Map<string, string | null>();
    base.forEach((u) => {
      if (!map.has(u.producto)) map.set(u.producto, u.productoImg ?? null);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([nombre, img]) => ({ nombre, img }));
  }, [base]);

  const tallas = useMemo(() => {
    if (!producto) return [];
    const arr = base.filter((u) => u.producto === producto);
    const map = new Map<string, number>();
    arr.forEach((u) => { if (!map.has(u.talla)) map.set(u.talla, u.tallaOrden); });
    return Array.from(map.entries()).sort((a, b) => a[1] - b[1]).map(([t]) => t);
  }, [base, producto]);

  const colores = useMemo(() => {
    if (!producto || !talla) return [];
    return base.filter((u) => u.producto === producto && u.talla === talla);
  }, [base, producto, talla]);

  function elegirCalidad(c: string) { setCalidad(c); setProducto(null); setTalla(null); }
  function elegirProducto(p: string) { setProducto(p); setTalla(null); }
  function elegirColor(u: Unidad) { onAgregar(u); setTalla(null); }

  return (
    <div>
      {conCalidad && (
        <div style={{ marginBottom: 12 }}>
          <div className="sub" style={{ marginBottom: 6 }}>Calidad</div>
          <div className="segment">
            <button className={calidad === "PRIMERA" ? "active" : ""} onClick={() => elegirCalidad("PRIMERA")}>Primera</button>
            <button className={calidad === "SEGUNDA" ? "active" : ""} onClick={() => elegirCalidad("SEGUNDA")}>Segunda</button>
          </div>
        </div>
      )}

      {/* Paso 1: Producto (con imagen) */}
      <div className="sub" style={{ marginBottom: 6 }}>1. Producto</div>
      {productos.length === 0 ? (
        <p className="muted" style={{ margin: "0 0 12px" }}>
          {conCalidad ? `No hay productos disponibles en calidad ${calidad === "PRIMERA" ? "primera" : "segunda"}.` : "No hay productos."}
        </p>
      ) : (
        <div className="cascada-grid">
          {productos.map((p) => (
            <button
              key={p.nombre}
              className={`cascada-card-img ${producto === p.nombre ? "activo" : ""}`}
              onClick={() => elegirProducto(p.nombre)}
            >
              {p.img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.img} alt={p.nombre} className="cascada-img" loading="lazy" />
              ) : (
                <div className="cascada-img cascada-img-ph">👕</div>
              )}
              <span className="cascada-nombre">{p.nombre}</span>
            </button>
          ))}
        </div>
      )}

      {/* Paso 2: Talla */}
      {producto && (
        <>
          <div className="sub" style={{ margin: "14px 0 6px" }}>2. Talla · <strong>{producto}</strong></div>
          <div className="chips">
            {tallas.map((t) => (
              <button key={t} className={`chip ${talla === t ? "activo" : ""}`} onClick={() => setTalla(t)}>{t}</button>
            ))}
          </div>
        </>
      )}

      {/* Paso 3: Color */}
      {producto && talla && (
        <>
          <div className="sub" style={{ margin: "14px 0 6px" }}>3. Color · toca para agregar</div>
          <div className="chips">
            {colores.map((u) => (
              <button key={u.key} className="chip chip-color" onClick={() => elegirColor(u)}>
                {u.color}
                {mostrarStock && u.stock != null ? ` (${u.stock})` : ""}
                {mostrarPrecio && u.precio != null ? ` · ${money(u.precio)}` : ""}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

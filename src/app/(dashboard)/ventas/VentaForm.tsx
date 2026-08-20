"use client";

// ---------------------------------------------------------------------
// Formulario de venta (Client Component).
// Recibe vendedor, cliente e items disponibles reales; permite elegir un
// item y cantidad, y envia la venta a POST /api/ventas.
// ---------------------------------------------------------------------
import { useState } from "react";

type Item = {
  variante_id: string;
  calidad_id: string;
  sku: string;
  calidad: string;
  cantidad: number;
  precio: number;
};

type Props = {
  vendedor: { id: string; nombre: string; municipio: string | null };
  cliente: { id: string; nombre: string };
  items: Item[];
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

export default function VentaForm({ vendedor, cliente, items }: Props) {
  const [idx, setIdx] = useState(0);
  const [cantidad, setCantidad] = useState(1);
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const item = items[idx];
  const total = item ? item.precio * cantidad : 0;

  async function registrar() {
    setLoading(true);
    setError(null);
    setResultado(null);
    try {
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendedor_id: vendedor.id,
          cliente_id: cliente.id,
          tipo_pago: "CREDITO",
          dias_credito: 30,
          descuento: 0,
          items: [
            {
              variante_id: item.variante_id,
              calidad_id: item.calidad_id,
              cantidad,
              precio_unitario: item.precio,
            },
          ],
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.message ?? "Error al registrar la venta.");
      } else {
        setResultado(json.data);
      }
    } catch (e) {
      setError("Error de red: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="card">
        <h3>Datos de la venta</h3>
        <p>
          <strong>Vendedor:</strong> {vendedor.nombre}
          {vendedor.municipio ? ` (${vendedor.municipio})` : ""}
          <br />
          <strong>Cliente:</strong> {cliente.nombre}
        </p>

        <label style={{ display: "block", margin: "0.75rem 0 0.35rem", fontWeight: 600 }}>
          Producto disponible
        </label>
        <select
          value={idx}
          onChange={(e) => {
            setIdx(Number(e.target.value));
            setCantidad(1);
          }}
          style={{ padding: "0.5rem", borderRadius: 8, border: "1px solid #cbd5e1", width: "100%" }}
        >
          {items.map((it, i) => (
            <option key={i} value={i}>
              {it.sku} · {it.calidad} · disp: {it.cantidad} · {fmt(it.precio)}
            </option>
          ))}
        </select>

        <label style={{ display: "block", margin: "0.75rem 0 0.35rem", fontWeight: 600 }}>
          Cantidad (max {item.cantidad})
        </label>
        <input
          type="number"
          min={1}
          max={item.cantidad}
          value={cantidad}
          onChange={(e) => setCantidad(Math.max(1, Math.min(item.cantidad, Number(e.target.value))))}
          style={{ padding: "0.5rem", borderRadius: 8, border: "1px solid #cbd5e1", width: "120px" }}
        />

        <p style={{ marginTop: "1rem", fontSize: "1.1rem" }}>
          <strong>Total: {fmt(total)}</strong> · a credito (30 dias)
        </p>

        <button className="btn" onClick={registrar} disabled={loading}>
          {loading ? "Registrando..." : "Registrar venta"}
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: "#fecaca", background: "#fef2f2" }}>
          <strong style={{ color: "#b91c1c" }}>Error:</strong> {error}
        </div>
      )}

      {resultado && (
        <div className="card" style={{ borderColor: "#bbf7d0", background: "#f0fdf4" }}>
          <h3 style={{ color: "#166534" }}>Venta registrada con exito</h3>
          <ul>
            <li>Factura: <strong>{resultado.numero_factura}</strong></li>
            <li>Total: <strong>{fmt(resultado.total)}</strong></li>
            <li>Cuenta por cobrar: <strong>{resultado.cuenta_id ? "creada" : "-"}</strong></li>
          </ul>
          <p className="muted">
            El inventario del vendedor se descarga automaticamente. Recarga la
            pagina para ver el nuevo saldo disponible.
          </p>
        </div>
      )}
    </>
  );
}

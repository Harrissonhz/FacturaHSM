"use client";

// ---------------------------------------------------------------------
// Formulario de venta (Client Component) - Fase 2 rediseñado.
// Usa el design system: tarjetas tactiles de producto, badges de calidad,
// selector de cantidad grande, boton fijo y feedback con alerts.
// ---------------------------------------------------------------------
import { useState } from "react";
import { money } from "@/lib/format";
import EstadoBadge from "@/components/EstadoBadge";

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

export default function VentaForm({ vendedor, cliente, items }: Props) {
  const [idx, setIdx] = useState(0);
  const [cantidad, setCantidad] = useState(1);
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const item = items[idx];
  const total = item ? item.precio * cantidad : 0;

  function cambiarCantidad(delta: number) {
    setCantidad((c) => Math.max(1, Math.min(item.cantidad, c + delta)));
  }

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

  // Vista de exito
  if (resultado) {
    return (
      <div className="alert alert-success" style={{ padding: "var(--space-5)" }}>
        <div style={{ fontSize: "2.5rem" }}>✅</div>
        <h2 style={{ margin: "var(--space-2) 0", color: "#166534" }}>
          Venta registrada
        </h2>
        <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
          <li>Factura: <strong>{resultado.numero_factura}</strong></li>
          <li>Total: <strong>{money(resultado.total)}</strong></li>
          <li>Cuenta por cobrar: <strong>{resultado.cuenta_id ? "creada" : "-"}</strong></li>
        </ul>
        <div style={{ marginTop: "var(--space-4)", display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <a className="btn btn-success" href="/cartera">Ver cartera</a>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setResultado(null);
              setCantidad(1);
            }}
          >
            Nueva venta
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Datos de la venta */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Datos de la venta</h3>
        <div className="list-item" style={{ boxShadow: "none", marginBottom: 0 }}>
          <div className="row">
            <div>
              <div className="sub">Vendedor</div>
              <div className="title">{vendedor.nombre}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="sub">Cliente</div>
              <div className="title">{cliente.nombre}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Seleccion de producto (tarjetas tactiles) */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Producto</h3>
        <div className="list-cards">
          {items.map((it, i) => {
            const activo = i === idx;
            return (
              <button
                key={i}
                onClick={() => {
                  setIdx(i);
                  setCantidad(1);
                }}
                className="list-item"
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  borderColor: activo ? "var(--color-primary)" : "var(--color-border)",
                  borderWidth: activo ? 2 : 1,
                  borderStyle: "solid",
                  background: activo ? "var(--color-primary-050)" : "var(--color-surface)",
                }}
              >
                <div className="row">
                  <div>
                    <div className="title">{it.sku}</div>
                    <div className="sub">Disponible: {it.cantidad}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="amount">{money(it.precio)}</div>
                    <EstadoBadge estado={it.calidad} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cantidad + total */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Cantidad</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
          <button
            className="btn btn-secondary"
            style={{ minWidth: 52, fontSize: "1.4rem" }}
            onClick={() => cambiarCantidad(-1)}
            disabled={cantidad <= 1}
            aria-label="Disminuir"
          >
            −
          </button>
          <input
            className="input tabular"
            type="number"
            inputMode="numeric"
            min={1}
            max={item.cantidad}
            value={cantidad}
            onChange={(e) =>
              setCantidad(Math.max(1, Math.min(item.cantidad, Number(e.target.value))))
            }
            style={{ width: 90, textAlign: "center", fontSize: "1.2rem", fontWeight: 700 }}
          />
          <button
            className="btn btn-secondary"
            style={{ minWidth: 52, fontSize: "1.4rem" }}
            onClick={() => cambiarCantidad(1)}
            disabled={cantidad >= item.cantidad}
            aria-label="Aumentar"
          >
            +
          </button>
          <span className="sub">de {item.cantidad}</span>
        </div>

        <div
          style={{
            marginTop: "var(--space-5)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            borderTop: "1px solid var(--color-border)",
            paddingTop: "var(--space-4)",
          }}
        >
          <span className="muted">Total (crédito 30 días)</span>
          <span className="amount amount-lg">{money(total)}</span>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Boton principal */}
      <button className="btn btn-success btn-full" onClick={registrar} disabled={loading}>
        {loading ? "Registrando..." : `Registrar venta · ${money(total)}`}
      </button>
    </>
  );
}

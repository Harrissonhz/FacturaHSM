"use client";

// ---------------------------------------------------------------------
// POS de venta (Client Component) - con enlace a Factura PDF.
// - Selector de cliente (busqueda) + "Nuevo cliente" (bottom sheet).
// - Buscador de productos + carrito multi-producto.
// - Tras registrar, ofrece VER/IMPRIMIR la factura (/factura/[ventaId]).
// ---------------------------------------------------------------------
import { useState, useMemo } from "react";
import { money } from "@/lib/format";
import EstadoBadge from "@/components/EstadoBadge";

type Cliente = { id: string; nombre: string; municipio: string | null };
type Item = {
  variante_id: string;
  calidad_id: string;
  sku: string;
  calidad: string;
  cantidad: number;
  precio: number;
};
type LineaCarrito = {
  key: string;
  variante_id: string;
  calidad_id: string;
  sku: string;
  calidad: string;
  precio: number;
  stock: number;
  cantidad: number;
};

type Props = {
  vendedor: { id: string; nombre: string; municipio: string | null };
  clientesIniciales: Cliente[];
  items: Item[];
};

export default function VentaPOS({ vendedor, clientesIniciales, items }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>(clientesIniciales);
  const [clienteId, setClienteId] = useState<string>(clientesIniciales[0]?.id ?? "");
  const [buscarCliente, setBuscarCliente] = useState("");
  const [showNuevoCliente, setShowNuevoCliente] = useState(false);

  const [buscarProd, setBuscarProd] = useState("");
  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [resultado, setResultado] = useState<any>(null);

  const clientesFiltrados = useMemo(
    () => clientes.filter((c) => c.nombre.toLowerCase().includes(buscarCliente.toLowerCase())),
    [clientes, buscarCliente]
  );
  const itemsFiltrados = useMemo(
    () =>
      items.filter((it) =>
        `${it.sku} ${it.calidad}`.toLowerCase().includes(buscarProd.toLowerCase())
      ),
    [items, buscarProd]
  );
  const total = useMemo(
    () => carrito.reduce((s, l) => s + l.precio * l.cantidad, 0),
    [carrito]
  );
  const clienteSel = clientes.find((c) => c.id === clienteId);

  function agregarAlCarrito(it: Item) {
    const key = it.variante_id + it.calidad_id;
    setCarrito((prev) => {
      const existe = prev.find((l) => l.key === key);
      if (existe) {
        return prev.map((l) =>
          l.key === key && l.cantidad < l.stock ? { ...l, cantidad: l.cantidad + 1 } : l
        );
      }
      return [
        ...prev,
        {
          key,
          variante_id: it.variante_id,
          calidad_id: it.calidad_id,
          sku: it.sku,
          calidad: it.calidad,
          precio: it.precio,
          stock: it.cantidad,
          cantidad: 1,
        },
      ];
    });
  }
  function cambiarCantidad(key: string, delta: number) {
    setCarrito((prev) =>
      prev
        .map((l) =>
          l.key === key
            ? { ...l, cantidad: Math.max(0, Math.min(l.stock, l.cantidad + delta)) }
            : l
        )
        .filter((l) => l.cantidad > 0)
    );
  }
  function quitar(key: string) {
    setCarrito((prev) => prev.filter((l) => l.key !== key));
  }

  async function registrar() {
    if (!clienteId) { setError("Selecciona un cliente."); return; }
    if (carrito.length === 0) { setError("Agrega al menos un producto."); return; }
    setLoading(true);
    setError(null);
    setResultado(null);
    try {
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendedor_id: vendedor.id,
          cliente_id: clienteId,
          tipo_pago: "CREDITO",
          dias_credito: 30,
          descuento: 0,
          items: carrito.map((l) => ({
            variante_id: l.variante_id,
            calidad_id: l.calidad_id,
            cantidad: l.cantidad,
            precio_unitario: l.precio,
          })),
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.message ?? "Error al registrar la venta.");
      } else {
        setResultado(json.data);
        setCarrito([]);
      }
    } catch (e) {
      setError("Error de red: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function crearCliente(form: FormData) {
    const nombre = String(form.get("nombre") ?? "").trim();
    if (!nombre) return;
    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        telefono: String(form.get("telefono") ?? "") || null,
        municipio: String(form.get("municipio") ?? "") || null,
        documento: String(form.get("documento") ?? "") || null,
        vendedor_id: vendedor.id,
      }),
    });
    const json = await res.json();
    if (json.ok) {
      const nuevo: Cliente = json.data;
      setClientes((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setClienteId(nuevo.id);
      setShowNuevoCliente(false);
    } else {
      alert(json.error?.message ?? "No se pudo crear el cliente.");
    }
  }

  // ---- Vista de exito (con enlace a la factura) ----
  if (resultado) {
    return (
      <div className="alert alert-success" style={{ padding: "var(--space-5)" }}>
        <div style={{ fontSize: "2.5rem" }}>✅</div>
        <h2 style={{ margin: "var(--space-2) 0", color: "#166534" }}>Venta registrada</h2>
        <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
          <li>Factura: <strong>{resultado.numero_factura}</strong></li>
          <li>Total: <strong>{money(resultado.total)}</strong></li>
          <li>Cuenta por cobrar: <strong>{resultado.cuenta_id ? "creada" : "-"}</strong></li>
        </ul>
        <div style={{ marginTop: "var(--space-4)", display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <a className="btn btn-accent" href={`/factura/${resultado.venta_id}`}>
            🧾 Ver factura
          </a>
          <a className="btn btn-success" href="/cartera">Ver cartera</a>
          <button className="btn btn-secondary" onClick={() => setResultado(null)}>
            Nueva venta
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Cliente */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Cliente</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowNuevoCliente(true)}>
            + Nuevo
          </button>
        </div>
        <div className="field" style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>
          <input
            className="input"
            placeholder="Buscar cliente..."
            value={buscarCliente}
            onChange={(e) => setBuscarCliente(e.target.value)}
          />
        </div>
        {clientesFiltrados.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No hay clientes. Toca “+ Nuevo”.</p>
        ) : (
          <div className="field" style={{ margin: 0 }}>
            <select className="select" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              {clientesFiltrados.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}{c.municipio ? ` · ${c.municipio}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
        {clienteSel && (
          <p className="sub" style={{ marginTop: "var(--space-2)", marginBottom: 0 }}>
            Vendedor: {vendedor.nombre}
          </p>
        )}
      </div>

      {/* Productos */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Productos disponibles</h3>
        <div className="field" style={{ marginBottom: "var(--space-3)" }}>
          <input
            className="input"
            placeholder="Buscar por referencia o calidad..."
            value={buscarProd}
            onChange={(e) => setBuscarProd(e.target.value)}
          />
        </div>
        {itemsFiltrados.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>Sin productos que coincidan.</p>
        ) : (
          <div className="list-cards">
            {itemsFiltrados.map((it, i) => {
              const enCarrito = carrito.find((l) => l.key === it.variante_id + it.calidad_id);
              const agotado = enCarrito ? enCarrito.cantidad >= it.cantidad : false;
              return (
                <div className="list-item" key={i}>
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
                  <button
                    className="btn btn-accent btn-full btn-sm"
                    style={{ marginTop: "var(--space-3)" }}
                    onClick={() => agregarAlCarrito(it)}
                    disabled={agotado}
                  >
                    {agotado ? "Sin más stock" : "Agregar"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Carrito */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Carrito ({carrito.length})</h3>
        {carrito.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>Aún no has agregado productos.</p>
        ) : (
          <div className="list-cards">
            {carrito.map((l) => (
              <div className="list-item" key={l.key}>
                <div className="row">
                  <div>
                    <div className="title">{l.sku}</div>
                    <div className="sub">{money(l.precio)} · <EstadoBadge estado={l.calidad} /></div>
                  </div>
                  <div className="amount">{money(l.precio * l.cantidad)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginTop: "var(--space-3)" }}>
                  <button className="btn btn-secondary btn-sm" style={{ minWidth: 44, fontSize: "1.2rem" }} onClick={() => cambiarCantidad(l.key, -1)}>−</button>
                  <span className="tabular" style={{ fontWeight: 700, minWidth: 28, textAlign: "center" }}>{l.cantidad}</span>
                  <button className="btn btn-secondary btn-sm" style={{ minWidth: 44, fontSize: "1.2rem" }} onClick={() => cambiarCantidad(l.key, 1)} disabled={l.cantidad >= l.stock}>+</button>
                  <span className="sub">/ {l.stock}</span>
                  <button className="btn btn-danger btn-sm" style={{ marginLeft: "auto" }} onClick={() => quitar(l.key)}>Quitar</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: "var(--space-4)", display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-4)" }}>
          <span className="muted">Total (crédito 30 días)</span>
          <span className="amount amount-lg">{money(total)}</span>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <button className="btn btn-success btn-full" onClick={registrar} disabled={loading || carrito.length === 0 || !clienteId}>
        {loading ? "Registrando..." : `Registrar venta · ${money(total)}`}
      </button>

      {/* Bottom sheet: nuevo cliente */}
      {showNuevoCliente && (
        <div className="sheet-overlay" onClick={() => setShowNuevoCliente(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="handle" />
            <h3 style={{ marginTop: 0 }}>Nuevo cliente</h3>
            <form action={crearCliente}>
              <div className="field">
                <label htmlFor="nombre">Nombre *</label>
                <input id="nombre" name="nombre" className="input" required placeholder="Nombre del cliente" />
              </div>
              <div className="field">
                <label htmlFor="telefono">Teléfono</label>
                <input id="telefono" name="telefono" className="input" inputMode="tel" placeholder="Opcional" />
              </div>
              <div className="field">
                <label htmlFor="municipio">Municipio</label>
                <input id="municipio" name="municipio" className="input" placeholder="Opcional" defaultValue={vendedor.municipio ?? ""} />
              </div>
              <div className="field">
                <label htmlFor="documento">Documento</label>
                <input id="documento" name="documento" className="input" placeholder="Opcional" />
              </div>
              <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
                <button className="btn btn-success btn-full" type="submit">Guardar cliente</button>
                <button className="btn btn-secondary" type="button" onClick={() => setShowNuevoCliente(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

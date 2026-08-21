"use client";

// ---------------------------------------------------------------------
// Tabla de cartera + registro de abonos (Client Component).
// Muestra las cuentas por cobrar y, al seleccionar una, permite
// registrar un abono via POST /api/cartera/:cuentaId/abonos.
// ---------------------------------------------------------------------
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CuentaCxC } from "./page";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

const badge = (estado: string) => {
  const colores: Record<string, { bg: string; fg: string }> = {
    PENDIENTE: { bg: "#fef9c3", fg: "#854d0e" },
    PARCIAL: { bg: "#dbeafe", fg: "#1e40af" },
    PAGADA: { bg: "#dcfce7", fg: "#166534" },
    VENCIDA: { bg: "#fee2e2", fg: "#991b1b" },
  };
  const c = colores[estado] ?? { bg: "#e2e8f0", fg: "#334155" };
  return (
    <span
      style={{
        background: c.bg,
        color: c.fg,
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: "0.8rem",
        fontWeight: 700,
      }}
    >
      {estado}
    </span>
  );
};

export default function CarteraTabla({ cuentas }: { cuentas: CuentaCxC[] }) {
  const router = useRouter();
  const [seleccion, setSeleccion] = useState<CuentaCxC | null>(null);
  const [monto, setMonto] = useState<number>(0);
  const [formaPago, setFormaPago] = useState("EFECTIVO");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  function abrirAbono(c: CuentaCxC) {
    setSeleccion(c);
    setMonto(c.saldo_pendiente);
    setMensaje(null);
  }

  async function registrarAbono() {
    if (!seleccion) return;
    setLoading(true);
    setMensaje(null);
    try {
      const res = await fetch(`/api/cartera/${seleccion.id}/abonos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto, forma_pago: formaPago }),
      });
      const json = await res.json();
      if (!json.ok) {
        setMensaje({ tipo: "error", texto: json.error?.message ?? "Error al registrar el abono." });
      } else {
        setMensaje({
          tipo: "ok",
          texto: `Abono registrado. Nuevo saldo: ${fmt(json.data.saldo_pendiente)} · ${json.data.estado}`,
        });
        setSeleccion(null);
        // Recarga los datos del servidor para ver el saldo actualizado.
        router.refresh();
      }
    } catch (e) {
      setMensaje({ tipo: "error", texto: "Error de red: " + (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {mensaje && (
        <div
          className="card"
          style={{
            borderColor: mensaje.tipo === "ok" ? "#bbf7d0" : "#fecaca",
            background: mensaje.tipo === "ok" ? "#f0fdf4" : "#fef2f2",
          }}
        >
          <strong style={{ color: mensaje.tipo === "ok" ? "#166534" : "#b91c1c" }}>
            {mensaje.tipo === "ok" ? "Exito: " : "Error: "}
          </strong>
          {mensaje.texto}
        </div>
      )}

      <div className="card" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
              <th style={{ padding: "0.5rem" }}>Factura</th>
              <th style={{ padding: "0.5rem" }}>Cliente</th>
              <th style={{ padding: "0.5rem" }}>Vendedor</th>
              <th style={{ padding: "0.5rem", textAlign: "right" }}>Valor</th>
              <th style={{ padding: "0.5rem", textAlign: "right" }}>Abonado</th>
              <th style={{ padding: "0.5rem", textAlign: "right" }}>Saldo</th>
              <th style={{ padding: "0.5rem" }}>Estado</th>
              <th style={{ padding: "0.5rem" }}></th>
            </tr>
          </thead>
          <tbody>
            {cuentas.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "0.5rem" }}>{c.factura}</td>
                <td style={{ padding: "0.5rem" }}>{c.cliente}</td>
                <td style={{ padding: "0.5rem" }}>{c.vendedor}</td>
                <td style={{ padding: "0.5rem", textAlign: "right" }}>{fmt(c.valor_original)}</td>
                <td style={{ padding: "0.5rem", textAlign: "right" }}>{fmt(c.total_abonado)}</td>
                <td style={{ padding: "0.5rem", textAlign: "right", fontWeight: 700 }}>
                  {fmt(c.saldo_pendiente)}
                </td>
                <td style={{ padding: "0.5rem" }}>{badge(c.estado)}</td>
                <td style={{ padding: "0.5rem" }}>
                  {c.estado !== "PAGADA" && (
                    <button
                      className="btn"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem" }}
                      onClick={() => abrirAbono(c)}
                    >
                      Abonar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {seleccion && (
        <div className="card">
          <h3>Registrar abono · Factura {seleccion.factura}</h3>
          <p className="muted">
            Cliente: {seleccion.cliente} · Saldo pendiente:{" "}
            <strong>{fmt(seleccion.saldo_pendiente)}</strong>
          </p>

          <label style={{ display: "block", margin: "0.5rem 0 0.35rem", fontWeight: 600 }}>
            Monto del abono (max {fmt(seleccion.saldo_pendiente)})
          </label>
          <input
            type="number"
            min={1}
            max={seleccion.saldo_pendiente}
            value={monto}
            onChange={(e) =>
              setMonto(Math.max(0, Math.min(seleccion.saldo_pendiente, Number(e.target.value))))
            }
            style={{ padding: "0.5rem", borderRadius: 8, border: "1px solid #cbd5e1", width: "180px" }}
          />

          <label style={{ display: "block", margin: "0.75rem 0 0.35rem", fontWeight: 600 }}>
            Forma de pago
          </label>
          <select
            value={formaPago}
            onChange={(e) => setFormaPago(e.target.value)}
            style={{ padding: "0.5rem", borderRadius: 8, border: "1px solid #cbd5e1", width: "220px" }}
          >
            <option value="EFECTIVO">Efectivo</option>
            <option value="CONSIGNACION">Consignacion</option>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="OTRO">Otro</option>
          </select>

          <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem" }}>
            <button className="btn" onClick={registrarAbono} disabled={loading || monto <= 0}>
              {loading ? "Registrando..." : "Confirmar abono"}
            </button>
            <button
              className="btn btn-ghost"
              style={{ background: "#e2e8f0", color: "#334155" }}
              onClick={() => setSeleccion(null)}
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

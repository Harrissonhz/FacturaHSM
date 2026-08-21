"use client";

// ---------------------------------------------------------------------
// Cartera (Client Component) - Fase 2 rediseñado.
// - Resumen (chips) de saldo total y # cuentas.
// - Filtro por estado (segmento).
// - Lista de tarjetas (mobile-first, sin scroll horizontal).
// - Registro de abono en bottom sheet.
// ---------------------------------------------------------------------
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { money, fecha } from "@/lib/format";
import EstadoBadge from "@/components/EstadoBadge";
import type { CuentaCxC } from "./page";

type Filtro = "TODAS" | "PENDIENTES" | "VENCIDAS";

export default function CarteraTabla({ cuentas }: { cuentas: CuentaCxC[] }) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>("TODAS");
  const [seleccion, setSeleccion] = useState<CuentaCxC | null>(null);
  const [monto, setMonto] = useState<number>(0);
  const [formaPago, setFormaPago] = useState("EFECTIVO");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  // Totales para los chips de resumen
  const totalSaldo = useMemo(
    () => cuentas.reduce((s, c) => s + c.saldo_pendiente, 0),
    [cuentas]
  );
  const pendientes = useMemo(
    () => cuentas.filter((c) => c.estado !== "PAGADA").length,
    [cuentas]
  );

  const visibles = useMemo(() => {
    if (filtro === "PENDIENTES") return cuentas.filter((c) => c.estado === "PENDIENTE" || c.estado === "PARCIAL");
    if (filtro === "VENCIDAS") return cuentas.filter((c) => c.estado === "VENCIDA");
    return cuentas;
  }, [cuentas, filtro]);

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
          texto: `Abono registrado. Nuevo saldo: ${money(json.data.saldo_pendiente)} · ${json.data.estado}`,
        });
        setSeleccion(null);
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
        <div className={`alert ${mensaje.tipo === "ok" ? "alert-success" : "alert-danger"}`}>
          {mensaje.texto}
        </div>
      )}

      {/* Resumen */}
      <div className="summary-row">
        <div className="summary-chip">
          <div className="label">Saldo total por cobrar</div>
          <div className="value">{money(totalSaldo)}</div>
        </div>
        <div className="summary-chip">
          <div className="label">Cuentas pendientes</div>
          <div className="value">{pendientes}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="segment" role="tablist">
        <button className={filtro === "TODAS" ? "active" : ""} onClick={() => setFiltro("TODAS")}>
          Todas
        </button>
        <button className={filtro === "PENDIENTES" ? "active" : ""} onClick={() => setFiltro("PENDIENTES")}>
          Pendientes
        </button>
        <button className={filtro === "VENCIDAS" ? "active" : ""} onClick={() => setFiltro("VENCIDAS")}>
          Vencidas
        </button>
      </div>

      {/* Lista de tarjetas */}
      {visibles.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">💰</span>
          No hay cuentas en esta categoría.
        </div>
      ) : (
        <div className="list-cards">
          {visibles.map((c) => (
            <div className="list-item" key={c.id}>
              <div className="row">
                <div>
                  <div className="title">{c.cliente}</div>
                  <div className="sub">Factura {c.factura} · {fecha(c.fecha_venta)}</div>
                </div>
                <EstadoBadge estado={c.estado} />
              </div>

              <div className="row" style={{ marginTop: "var(--space-3)" }}>
                <div className="sub">
                  Abonado: {money(c.total_abonado)} / {money(c.valor_original)}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="sub">Saldo</div>
                  <div className="amount amount-lg">{money(c.saldo_pendiente)}</div>
                </div>
              </div>

              {c.estado !== "PAGADA" && (
                <button
                  className="btn btn-success btn-full btn-sm"
                  style={{ marginTop: "var(--space-3)" }}
                  onClick={() => abrirAbono(c)}
                >
                  Registrar abono
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bottom sheet de abono */}
      {seleccion && (
        <div className="sheet-overlay" onClick={() => !loading && setSeleccion(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="handle" />
            <h3 style={{ marginTop: 0 }}>Registrar abono</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              {seleccion.cliente} · Factura {seleccion.factura}
            </p>

            <div className="list-item" style={{ boxShadow: "none", marginBottom: "var(--space-4)" }}>
              <div className="row">
                <span className="sub">Saldo pendiente</span>
                <span className="amount amount-lg">{money(seleccion.saldo_pendiente)}</span>
              </div>
            </div>

            <div className="field">
              <label htmlFor="monto">Monto del abono</label>
              <input
                id="monto"
                className="input tabular"
                type="number"
                inputMode="numeric"
                min={1}
                max={seleccion.saldo_pendiente}
                value={monto}
                onChange={(e) =>
                  setMonto(Math.max(0, Math.min(seleccion.saldo_pendiente, Number(e.target.value))))
                }
              />
            </div>

            <div className="field">
              <label htmlFor="forma">Forma de pago</label>
              <select
                id="forma"
                className="select"
                value={formaPago}
                onChange={(e) => setFormaPago(e.target.value)}
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="CONSIGNACION">Consignación</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
              <button
                className="btn btn-success btn-full"
                onClick={registrarAbono}
                disabled={loading || monto <= 0}
              >
                {loading ? "Registrando..." : `Confirmar ${money(monto)}`}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setSeleccion(null)}
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

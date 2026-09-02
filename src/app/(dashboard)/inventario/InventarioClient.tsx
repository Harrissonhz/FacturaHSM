"use client";

// ---------------------------------------------------------------------
// Inventario (Client): lista + descarga para conteo físico.
//  - PDF/Imprimir: hoja de conteo con columna "Conteo físico" y "Dif." vacías.
//  - CSV: para Excel.
// ---------------------------------------------------------------------
import { useMemo } from "react";
import EstadoBadge from "@/components/EstadoBadge";
import type { FilaInv } from "./page";

export default function InventarioClient({ filas }: { filas: FilaInv[] }) {
  const total = useMemo(() => filas.reduce((s, f) => s + f.cantidad, 0), [filas]);
  const hoy = new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "2-digit", year: "numeric" });

  function exportCSV() {
    const cab = ["Producto", "Color", "Talla", "Ubicación", "Estado", "Calidad", "Cant. sistema", "Conteo físico", "Diferencia"];
    const filasCsv = filas.map((f) => [f.producto, f.color, f.talla, f.ubicacion, f.estado, f.calidad, String(f.cantidad), "", ""]);
    const csv = [cab, ...filasCsv]
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventario-conteo-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {/* Encabezado + acciones (no se imprimen) */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Inventario</h1>
          <p className="muted" style={{ margin: 0 }}>Existencias por producto, ubicación, estado y calidad.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>⬇ CSV</button>
          <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>🖨 Hoja de conteo (PDF)</button>
        </div>
      </div>

      {filas.length === 0 ? (
        <div className="empty-state"><span className="emoji">📦</span>No hay inventario por ahora.</div>
      ) : (
        <>
          {/* Vista en pantalla: tarjetas (no se imprime) */}
          <div className="list-cards no-print" style={{ marginTop: 16 }}>
            {filas.map((f, i) => (
              <div className="list-item" key={i}>
                <div className="row">
                  <div>
                    <div className="title">{f.descripcion}</div>
                    <div className="sub">{f.ubicacion} · {f.estado}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="amount amount-lg">{f.cantidad}</div>
                    <EstadoBadge estado={f.calidad} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Vista de IMPRESIÓN: hoja de conteo (solo visible al imprimir) */}
          <div className="print-only" id="hoja-conteo">
            <div className="hc-header">
              <h2>Hoja de conteo de inventario</h2>
              <div className="hc-meta">
                <span>Fecha: {hoy}</span>
                <span>Contado por: _______________________</span>
              </div>
            </div>
            <table className="hc-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Producto</th>
                  <th>Color</th>
                  <th>Talla</th>
                  <th>Ubicación</th>
                  <th>Cal.</th>
                  <th className="num">Sistema</th>
                  <th className="num">Conteo físico</th>
                  <th className="num">Dif.</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{f.producto}</td>
                    <td>{f.color}</td>
                    <td>{f.talla}</td>
                    <td>{f.ubicacion}</td>
                    <td>{f.calidad}</td>
                    <td className="num">{f.cantidad}</td>
                    <td className="num"></td>{/* vacío para escribir a mano */}
                    <td className="num"></td>{/* vacío para la diferencia */}
                  </tr>
                ))}
                <tr className="hc-total">
                  <td colSpan={6}>TOTAL UNIDADES (sistema)</td>
                  <td className="num">{total}</td>
                  <td className="num"></td>
                  <td className="num"></td>
                </tr>
              </tbody>
            </table>
            <p className="hc-nota">
              Instrucciones: cuente físicamente cada producto y anote la cantidad en “Conteo físico”.
              Calcule la diferencia (Conteo − Sistema). Si hay diferencias, regístrelas en
              “Ajuste de inventario” con el motivo correspondiente.
            </p>
          </div>
        </>
      )}
    </>
  );
}

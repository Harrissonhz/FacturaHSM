"use client";

// Lista de ventas con acción "Anular" (bottom sheet con motivo).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { anularVenta } from "@/services/correcciones.actions";

type Venta = {
  id: string; fecha: string; total: string; estado: string; tipo_pago: string;
  cliente: string; vendedor: string; factura: string;
};

export default function HistorialClient({ ventas }: { ventas: Venta[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<Venta | null>(null);
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function anular() {
    if (!sel) return;
    if (!motivo.trim()) { setError("Indica el motivo de la anulación."); return; }
    setLoading(true); setError(null);
    const fd = new FormData();
    fd.set("venta_id", sel.id);
    fd.set("motivo", motivo.trim());
    const res = await anularVenta(fd);
    setLoading(false);
    if (res.ok) {
      setOkMsg(`Venta ${sel.factura} anulada. Se reversó el inventario y la cartera.`);
      setSel(null); setMotivo("");
      router.refresh();
    } else {
      setError(res.error ?? "No se pudo anular la venta.");
    }
  }

  return (
    <>
      {okMsg && <div className="alert alert-success">{okMsg}</div>}

      {ventas.length === 0 ? (
        <div className="empty-state"><span className="emoji">🧾</span>Aún no hay ventas.</div>
      ) : (
        <div className="list-cards">
          {ventas.map((v) => {
            const anulada = v.estado === "ANULADA";
            return (
              <div className="list-item" key={v.id} style={{ opacity: anulada ? 0.6 : 1 }}>
                <div className="row">
                  <div>
                    <div className="title">{v.factura} · {v.cliente}</div>
                    <div className="sub">{v.fecha} · {v.vendedor} · {v.tipo_pago}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="amount">{v.total}</div>
                    <span className={`badge ${anulada ? "badge-danger" : "badge-success"}`}>{v.estado}</span>
                  </div>
                </div>
                {!anulada && (
                  <button
                    className="btn btn-danger btn-sm"
                    style={{ marginTop: 10 }}
                    onClick={() => { setSel(v); setMotivo(""); setError(null); }}
                  >
                    Anular venta
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {sel && (
        <div className="sheet-overlay" onClick={() => !loading && setSel(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="handle" />
            <h3 style={{ marginTop: 0 }}>Anular venta {sel.factura}</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              {sel.cliente} · {sel.total}. Esto reversará el inventario y la cuenta por cobrar.
              No se permite si la cuenta ya tiene abonos.
            </p>
            <div className="field">
              <label htmlFor="motivo">Motivo *</label>
              <input id="motivo" className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: producto equivocado" />
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button className="btn btn-danger btn-full" onClick={anular} disabled={loading}>
                {loading ? "Anulando..." : "Confirmar anulación"}
              </button>
              <button className="btn btn-secondary" onClick={() => setSel(null)} disabled={loading}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

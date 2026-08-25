"use client";

// Selecciona un saldo de inventario y aplica un ajuste (+/-) con motivo.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ajustarInventario } from "@/services/correcciones.actions";
import EstadoBadge from "@/components/EstadoBadge";

type Fila = {
  variante_id: string; ubicacion_id: string; estado_id: string; calidad_id: string;
  cantidad: number; sku: string; ubicacion: string; estado: string; calidad: string;
};

export default function AjusteClient({ filas }: { filas: Fila[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<Fila | null>(null);
  const [delta, setDelta] = useState<number>(0);
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [buscar, setBuscar] = useState("");

  const filtradas = filas.filter((f) =>
    `${f.sku} ${f.ubicacion} ${f.estado} ${f.calidad}`.toLowerCase().includes(buscar.toLowerCase())
  );

  const nuevoSaldo = sel ? sel.cantidad + delta : 0;

  async function aplicar() {
    if (!sel) return;
    if (!delta || delta === 0) { setError("El ajuste no puede ser 0."); return; }
    if (!motivo.trim()) { setError("Indica el motivo del ajuste."); return; }
    if (nuevoSaldo < 0) { setError("El ajuste dejaría el saldo negativo."); return; }
    setLoading(true); setError(null);
    const fd = new FormData();
    fd.set("variante_id", sel.variante_id);
    fd.set("ubicacion_id", sel.ubicacion_id);
    fd.set("estado_id", sel.estado_id);
    fd.set("calidad_id", sel.calidad_id);
    fd.set("delta", String(delta));
    fd.set("motivo", motivo.trim());
    const res = await ajustarInventario(fd);
    setLoading(false);
    if (res.ok) {
      setOkMsg(`Ajuste aplicado. ${sel.sku}: ${sel.cantidad} → ${nuevoSaldo}.`);
      setSel(null); setDelta(0); setMotivo("");
      router.refresh();
    } else {
      setError(res.error ?? "No se pudo aplicar el ajuste.");
    }
  }

  return (
    <>
      {okMsg && <div className="alert alert-success">{okMsg}</div>}

      {filas.length > 5 && (
        <div className="field" style={{ marginBottom: 12 }}>
          <input className="input" placeholder="Buscar por SKU, ubicación..." value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        </div>
      )}

      <div className="list-cards">
        {filtradas.map((f, i) => (
          <button
            key={i}
            className="list-item"
            style={{ textAlign: "left", cursor: "pointer", border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
            onClick={() => { setSel(f); setDelta(0); setMotivo(""); setError(null); }}
          >
            <div className="row">
              <div>
                <div className="title">{f.sku}</div>
                <div className="sub">{f.ubicacion} · {f.estado} · <EstadoBadge estado={f.calidad} /></div>
              </div>
              <div className="amount amount-lg">{f.cantidad}</div>
            </div>
          </button>
        ))}
      </div>

      {sel && (
        <div className="sheet-overlay" onClick={() => !loading && setSel(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="handle" />
            <h3 style={{ marginTop: 0 }}>Ajustar {sel.sku}</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              {sel.ubicacion} · {sel.estado} · {sel.calidad} · Saldo actual: <strong>{sel.cantidad}</strong>
            </p>

            <div className="field">
              <label htmlFor="delta">Ajuste (+ entra / − sale)</label>
              <input
                id="delta"
                className="input tabular"
                type="number"
                inputMode="numeric"
                value={delta}
                onChange={(e) => setDelta(Number(e.target.value))}
                placeholder="Ej: -2 o 5"
              />
            </div>

            <p className="sub" style={{ marginTop: -4 }}>
              Nuevo saldo: <strong style={{ color: nuevoSaldo < 0 ? "var(--color-danger)" : "var(--color-text)" }}>{nuevoSaldo}</strong>
            </p>

            <div className="field">
              <label htmlFor="motivo">Motivo *</label>
              <input id="motivo" className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: conteo físico, avería, pérdida" />
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button className="btn btn-success btn-full" onClick={aplicar} disabled={loading || delta === 0 || nuevoSaldo < 0}>
                {loading ? "Aplicando..." : "Aplicar ajuste"}
              </button>
              <button className="btn btn-secondary" onClick={() => setSel(null)} disabled={loading}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

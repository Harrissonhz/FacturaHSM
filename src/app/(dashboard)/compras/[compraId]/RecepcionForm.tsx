"use client";

// Formulario de recepción (recibos parciales) -> sp_recibir_mercancia.
// Muestra descripción larga (Producto / Color / Talla).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { recibirMercancia } from "@/services/compras.actions";

type Linea = { id: string; descripcion: string; pendiente: number };

export default function RecepcionForm({
  compraId,
  lineas,
}: {
  compraId: string;
  lineas: Linea[];
}) {
  const router = useRouter();
  const [cant, setCant] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  function setCantidad(id: string, valor: number, max: number) {
    setCant((prev) => ({ ...prev, [id]: Math.max(0, Math.min(max, valor)) }));
  }

  async function recibir() {
    setError(null);
    setOkMsg(null);
    const items = lineas
      .map((l) => ({ compra_detalle_id: l.id, cantidad: cant[l.id] ?? 0 }))
      .filter((it) => it.cantidad > 0);

    if (items.length === 0) {
      setError("Ingresa al menos una cantidad a recibir.");
      return;
    }

    setLoading(true);
    const fd = new FormData();
    fd.set("compra_id", compraId);
    fd.set("items", JSON.stringify(items));
    const res = await recibirMercancia(fd);
    setLoading(false);
    if (res.ok) {
      setOkMsg("Mercancía recibida. El inventario entró en estado CRUDO.");
      setCant({});
      router.refresh();
    } else {
      setError(res.error ?? "No se pudo registrar la recepción.");
    }
  }

  if (lineas.length === 0) {
    return <div className="alert alert-info">No hay unidades pendientes por recibir.</div>;
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Recibir mercancía</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Ingresa cuánto recibes de cada producto (puede ser parcial).
      </p>

      <div className="list-cards">
        {lineas.map((l) => (
          <div className="list-item" key={l.id}>
            <div className="row">
              <div>
                <div className="title">{l.descripcion}</div>
                <div className="sub">Pendiente: {l.pendiente}</div>
              </div>
              <input
                className="input tabular"
                type="number"
                inputMode="numeric"
                min={0}
                max={l.pendiente}
                value={cant[l.id] ?? ""}
                placeholder="0"
                onChange={(e) => setCantidad(l.id, Number(e.target.value), l.pendiente)}
                style={{ width: 110 }}
              />
            </div>
          </div>
        ))}
      </div>

      {error && <div className="alert alert-danger" style={{ marginTop: 12 }}>{error}</div>}
      {okMsg && <div className="alert alert-success" style={{ marginTop: 12 }}>{okMsg}</div>}

      <button className="btn btn-success btn-full" style={{ marginTop: 12 }} onClick={recibir} disabled={loading}>
        {loading ? "Registrando..." : "Registrar recepción"}
      </button>
    </div>
  );
}

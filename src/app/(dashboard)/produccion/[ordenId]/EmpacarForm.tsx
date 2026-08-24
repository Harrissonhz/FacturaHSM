"use client";

// Empaca unidades TERMINADAS -> LISTO (habilita la venta).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { empacar } from "@/services/produccion.actions";
import EstadoBadge from "@/components/EstadoBadge";

type Term = {
  variante_id: string;
  calidad_id: string;
  sku: string;
  calidad: string;
  disponible: number;
};

export default function EmpacarForm({
  ubicacionId,
  terminados,
}: {
  ubicacionId: string;
  terminados: Term[];
}) {
  const router = useRouter();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [cant, setCant] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  async function empacarItem(t: Term) {
    const key = t.variante_id + t.calidad_id;
    const cantidad = cant[key] ?? t.disponible;
    if (cantidad <= 0) return;
    setLoadingKey(key);
    setMsg(null);
    const fd = new FormData();
    fd.set("variante_id", t.variante_id);
    fd.set("calidad_id", t.calidad_id);
    fd.set("cantidad", String(cantidad));
    fd.set("ubicacion_id", ubicacionId);
    const res = await empacar(fd);
    setLoadingKey(null);
    if (res.ok) {
      setMsg({ tipo: "ok", texto: `Empacadas ${cantidad} unidades. Ahora están LISTAS para venta.` });
      router.refresh();
    } else {
      setMsg({ tipo: "error", texto: res.error ?? "No se pudo empacar." });
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Empacar (TERMINADO → LISTO)</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Empaca para habilitar la venta. Solo lo LISTO puede distribuirse y venderse.
      </p>

      {msg && (
        <div className={`alert ${msg.tipo === "ok" ? "alert-success" : "alert-danger"}`}>{msg.texto}</div>
      )}

      <div className="list-cards">
        {terminados.map((t) => {
          const key = t.variante_id + t.calidad_id;
          return (
            <div className="list-item" key={key}>
              <div className="row">
                <div>
                  <div className="title">{t.sku}</div>
                  <div className="sub">Disponible: {t.disponible} · <EstadoBadge estado={t.calidad} /></div>
                </div>
                <input
                  className="input tabular"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={t.disponible}
                  value={cant[key] ?? t.disponible}
                  onChange={(e) => setCant((p) => ({ ...p, [key]: Math.max(0, Math.min(t.disponible, Number(e.target.value))) }))}
                  style={{ width: 90 }}
                />
              </div>
              <button
                className="btn btn-accent btn-full btn-sm"
                style={{ marginTop: 10 }}
                onClick={() => empacarItem(t)}
                disabled={loadingKey === key}
              >
                {loadingKey === key ? "Empacando..." : "Empacar"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

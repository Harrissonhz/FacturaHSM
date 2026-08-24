"use client";

// Formulario de retorno: elegir vendedor -> ver SU inventario -> retornar.
// El inventario se filtra por la ubicación del vendedor seleccionado.
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { retornar } from "@/services/produccion.actions";
import EstadoBadge from "@/components/EstadoBadge";

type Vendedor = { id: string; nombre: string; municipio: string | null; ubicacion_id: string };
type InvItem = {
  ubicacion_id: string;
  variante_id: string;
  calidad_id: string;
  sku: string;
  calidad: string;
  disponible: number;
};
type Linea = { key: string; variante_id: string; calidad_id: string; sku: string; calidad: string; disponible: number; cantidad: number };

export default function RetornoForm({
  vendedores,
  inventario,
}: {
  vendedores: Vendedor[];
  inventario: InvItem[];
}) {
  const router = useRouter();
  const [vendedorId, setVendedorId] = useState(vendedores[0]?.id ?? "");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [sel, setSel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const vendedor = vendedores.find((v) => v.id === vendedorId);

  // Inventario del vendedor seleccionado (por su ubicación)
  const invVendedor = useMemo(
    () => inventario.filter((it) => it.ubicacion_id === vendedor?.ubicacion_id),
    [inventario, vendedor]
  );

  // Al cambiar de vendedor, reinicia el carrito y la selección
  function cambiarVendedor(id: string) {
    setVendedorId(id);
    setLineas([]);
    setSel("");
    setOkMsg(null);
    setError(null);
  }

  function agregar() {
    const it = invVendedor.find((x) => x.variante_id + x.calidad_id === sel);
    if (!it) return;
    const key = it.variante_id + it.calidad_id;
    if (lineas.some((l) => l.key === key)) return;
    setLineas((prev) => [...prev, { key, variante_id: it.variante_id, calidad_id: it.calidad_id, sku: it.sku, calidad: it.calidad, disponible: it.disponible, cantidad: it.disponible }]);
  }
  function actualizar(key: string, valor: number, max: number) {
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, cantidad: Math.max(0, Math.min(max, valor)) } : l)));
  }
  function quitar(key: string) {
    setLineas((prev) => prev.filter((l) => l.key !== key));
  }

  async function enviar() {
    setError(null);
    setOkMsg(null);
    if (!vendedorId) { setError("Selecciona un vendedor."); return; }
    if (lineas.length === 0) { setError("Agrega al menos una unidad a retornar."); return; }
    setLoading(true);
    const fd = new FormData();
    fd.set("vendedor_id", vendedorId);
    fd.set("items", JSON.stringify(lineas.map((l) => ({ variante_id: l.variante_id, calidad_id: l.calidad_id, cantidad: l.cantidad }))));
    const res = await retornar(fd);
    setLoading(false);
    if (res.ok) {
      setOkMsg("Retorno registrado. El inventario regresó al central y está disponible para reasignar.");
      setLineas([]);
      setSel("");
      router.refresh();
    } else {
      setError(res.error ?? "No se pudo registrar el retorno.");
    }
  }

  return (
    <>
      <div className="card">
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="vendedor">Vendedor *</label>
          <select id="vendedor" className="select" value={vendedorId} onChange={(e) => cambiarVendedor(e.target.value)}>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>{v.nombre}{v.municipio ? ` · ${v.municipio}` : ""}</option>
            ))}
          </select>
        </div>
        <p className="sub" style={{ marginTop: 10, marginBottom: 0 }}>
          El número de retorno se asigna automáticamente (RET-XXXXXX).
        </p>
      </div>

      {okMsg && <div className="alert alert-success">{okMsg}</div>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Inventario del vendedor</h3>
        {invVendedor.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>Este vendedor no tiene inventario para retornar.</p>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label htmlFor="item">Producto a retornar</label>
              <select id="item" className="select" value={sel} onChange={(e) => setSel(e.target.value)}>
                <option value="">— Selecciona —</option>
                {invVendedor.map((it) => (
                  <option key={it.variante_id + it.calidad_id} value={it.variante_id + it.calidad_id}>
                    {it.sku} · {it.calidad} (tiene: {it.disponible})
                  </option>
                ))}
              </select>
            </div>
            <button className="btn" onClick={agregar} disabled={!sel}>Agregar</button>
          </div>
        )}

        {lineas.length > 0 && (
          <div className="list-cards" style={{ marginTop: 16 }}>
            {lineas.map((l) => (
              <div className="list-item" key={l.key}>
                <div className="row">
                  <div>
                    <div className="title">{l.sku}</div>
                    <div className="sub"><EstadoBadge estado={l.calidad} /> · tiene: {l.disponible}</div>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => quitar(l.key)}>Quitar</button>
                </div>
                <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
                  <label>Cantidad a retornar</label>
                  <input className="input tabular" type="number" inputMode="numeric" min={1} max={l.disponible} value={l.cantidad}
                    onChange={(e) => actualizar(l.key, Number(e.target.value), l.disponible)} style={{ width: 140 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <button className="btn btn-success btn-full" onClick={enviar} disabled={loading || lineas.length === 0}>
        {loading ? "Registrando..." : "Registrar retorno al central"}
      </button>
    </>
  );
}

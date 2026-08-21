// Detalle de compra + recepción (recibos parciales).
import { createClient } from "@/lib/supabase/server";
import { money, fecha } from "@/lib/format";
import RecepcionForm from "./RecepcionForm";

export const dynamic = "force-dynamic";

const estadoBadge: Record<string, string> = {
  PENDIENTE: "badge-warning",
  PARCIAL: "badge-info",
  RECIBIDA: "badge-success",
  CANCELADA: "badge-muted",
};

export default async function CompraDetallePage({
  params,
}: {
  params: { compraId: string };
}) {
  const supabase = createClient();

  const { data: compra } = await supabase
    .from("compras")
    .select("id, numero, fecha, estado, total, proveedores(nombre)")
    .eq("id", params.compraId)
    .single();

  const { data: detalle } = await supabase
    .from("compras_detalle")
    .select("id, cantidad_solicitada, cantidad_recibida, costo_unitario, variantes(sku)")
    .eq("compra_id", params.compraId);

  if (!compra) {
    return (
      <main>
        <div className="empty-state">
          <span className="emoji">🛒</span>
          No se encontró la compra.
        </div>
      </main>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = compra;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineas: any[] = (detalle ?? []).map((d: any) => ({
    id: d.id,
    sku: d.variantes?.sku ?? "-",
    solicitada: d.cantidad_solicitada,
    recibida: d.cantidad_recibida,
    pendiente: d.cantidad_solicitada - d.cantidad_recibida,
    costo: Number(d.costo_unitario),
  }));

  const puedeRecibir = c.estado === "PENDIENTE" || c.estado === "PARCIAL";

  return (
    <main>
      <h1 style={{ marginBottom: 4 }}>Compra {c.numero}</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        <a href="/compras">← Compras</a>
      </p>

      <div className="card">
        <div className="row">
          <div>
            <div className="sub">Proveedor</div>
            <div className="title">{c.proveedores?.nombre ?? "-"}</div>
            <div className="sub">{fecha(c.fecha)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="amount amount-lg">{money(Number(c.total))}</div>
            <span className={`badge ${estadoBadge[c.estado] ?? "badge-muted"}`}>{c.estado}</span>
          </div>
        </div>
      </div>

      {/* Detalle */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Detalle</h3>
        <div className="list-cards">
          {lineas.map((l) => (
            <div className="list-item" key={l.id}>
              <div className="row">
                <div className="title">{l.sku}</div>
                <div className="amount">{money(l.costo)}</div>
              </div>
              <div className="sub" style={{ marginTop: 6 }}>
                Solicitado: {l.solicitada} · Recibido: {l.recibida} ·{" "}
                <strong>Pendiente: {l.pendiente}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recepción */}
      {puedeRecibir ? (
        <RecepcionForm
          compraId={c.id}
          lineas={lineas.filter((l) => l.pendiente > 0)}
        />
      ) : (
        <div className="alert alert-success">Esta compra ya fue recibida completamente. ✅</div>
      )}
    </main>
  );
}

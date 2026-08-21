// Pantalla de Compras: lista + acceso a crear compra / recibir / proveedores.
import { createClient } from "@/lib/supabase/server";
import { money, fecha } from "@/lib/format";

export const dynamic = "force-dynamic";

const estadoBadge: Record<string, string> = {
  PENDIENTE: "badge-warning",
  PARCIAL: "badge-info",
  RECIBIDA: "badge-success",
  CANCELADA: "badge-muted",
};

export default async function ComprasPage() {
  const supabase = createClient();

  const { data: compras } = await supabase
    .from("compras")
    .select("id, numero, fecha, estado, total, proveedores(nombre)")
    .order("fecha", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lista = (compras ?? []) as any[];

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Compras</h1>
          <p className="muted" style={{ margin: 0 }}>Registra compras y recibe mercancía.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="/compras/proveedores" className="btn btn-secondary">Proveedores</a>
          <a href="/compras/nueva" className="btn">+ Nueva compra</a>
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">🛒</span>
          Aún no hay compras. Crea la primera con “+ Nueva compra”.
        </div>
      ) : (
        <div className="list-cards" style={{ marginTop: 16 }}>
          {lista.map((c) => (
            <a
              key={c.id}
              href={`/compras/${c.id}`}
              className="list-item"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="row">
                <div>
                  <div className="title">{c.numero}</div>
                  <div className="sub">
                    {c.proveedores?.nombre ?? "-"} · {fecha(c.fecha)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="amount">{money(Number(c.total))}</div>
                  <span className={`badge ${estadoBadge[c.estado] ?? "badge-muted"}`}>{c.estado}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}

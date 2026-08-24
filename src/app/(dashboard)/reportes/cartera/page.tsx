// Reporte: Cartera por cliente/vendedor/factura (usa v_cartera_cliente).
import { createClient } from "@/lib/supabase/server";
import { money, fecha } from "@/lib/format";
import EstadoBadge from "@/components/EstadoBadge";

export const dynamic = "force-dynamic";

export default async function ReporteCarteraPage() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("v_cartera_cliente")
    .select("cliente, vendedor, factura, fecha_venta, fecha_vencimiento, valor_original, total_abonado, saldo_pendiente, estado_calculado")
    .order("saldo_pendiente", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filas = (data ?? []) as any[];

  const totalSaldo = filas.reduce((s, f) => s + Number(f.saldo_pendiente ?? 0), 0);
  const totalVencido = filas
    .filter((f) => f.estado_calculado === "VENCIDA")
    .reduce((s, f) => s + Number(f.saldo_pendiente ?? 0), 0);

  return (
    <main>
      <h1 style={{ marginBottom: 4 }}>Reporte de cartera</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        <a href="/reportes">← Reportes</a>
      </p>

      {error && <div className="alert alert-danger">Error: {error.message}</div>}

      <div className="summary-row">
        <div className="summary-chip">
          <div className="label">Saldo total por cobrar</div>
          <div className="value">{money(totalSaldo)}</div>
        </div>
        <div className="summary-chip">
          <div className="label">Saldo vencido</div>
          <div className="value" style={{ color: totalVencido > 0 ? "var(--color-danger)" : undefined }}>
            {money(totalVencido)}
          </div>
        </div>
      </div>

      {filas.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">💰</span>
          No hay cuentas por cobrar.
        </div>
      ) : (
        <div className="list-cards">
          {filas.map((f, i) => (
            <div className="list-item" key={i}>
              <div className="row">
                <div>
                  <div className="title">{f.cliente}</div>
                  <div className="sub">
                    Factura {f.factura} · {f.vendedor}
                    {f.fecha_vencimiento ? ` · vence ${fecha(f.fecha_vencimiento)}` : ""}
                  </div>
                </div>
                <EstadoBadge estado={f.estado_calculado} />
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <div className="sub">
                  Abonado: {money(Number(f.total_abonado))} / {money(Number(f.valor_original))}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="sub">Saldo</div>
                  <div className="amount">{money(Number(f.saldo_pendiente))}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

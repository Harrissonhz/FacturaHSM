// ---------------------------------------------------------------------
// Estado de Cuenta del cliente (Server Component) - imprimible / PDF.
// Ruta: /cartera/estado/[clienteId]
// Muestra: emisor (con logo), datos del cliente, todas sus cuentas por
// cobrar y el detalle de TODOS los abonos por factura. Imprimible.
// ---------------------------------------------------------------------
import { createClient } from "@/lib/supabase/server";
import { money, fecha } from "@/lib/format";
import PrintButton from "./PrintButton";
import "./estadocuenta.css";

export const dynamic = "force-dynamic";

export default async function EstadoCuentaPage({
  params,
}: {
  params: { clienteId: string };
}) {
  const supabase = createClient();
  const clienteId = params.clienteId;

  // 1. Emisor (con logo)
  const { data: emisor } = await supabase
    .from("empresa_config")
    .select("razon_social, nit, direccion, ciudad, telefono, email, logo_url")
    .single();

  // 2. Cliente
  const { data: cliente } = await supabase
    .from("clientes")
    .select("nombre, documento, telefono, municipio, direccion, vendedores(nombre)")
    .eq("id", clienteId)
    .single();

  // 3. Cuentas por cobrar del cliente (con número de factura)
  const { data: cuentas } = await supabase
    .from("cuentas_por_cobrar")
    .select("id, fecha_venta, fecha_vencimiento, valor_original, total_abonado, saldo_pendiente, estado, facturas(numero)")
    .eq("cliente_id", clienteId)
    .order("fecha_venta");

  // 4. Abonos de esas cuentas
  const cuentaIds = (cuentas ?? []).map((c) => c.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let abonos: any[] = [];
  if (cuentaIds.length > 0) {
    const { data } = await supabase
      .from("abonos")
      .select("cuenta_id, fecha, monto, forma_pago, observacion")
      .in("cuenta_id", cuentaIds)
      .order("fecha");
    abonos = data ?? [];
  }

  if (!cliente) {
    return (
      <main className="ec-wrap">
        <div className="empty-state"><span className="emoji">📄</span>Cliente no encontrado.</div>
      </main>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cl: any = cliente;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lista = (cuentas ?? []) as any[];

  // Totales generales
  const totOriginal = lista.reduce((s, c) => s + Number(c.valor_original), 0);
  const totAbonado = lista.reduce((s, c) => s + Number(c.total_abonado), 0);
  const totSaldo = lista.reduce((s, c) => s + Number(c.saldo_pendiente), 0);

  const hoy = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });

  const estadoLabel: Record<string, string> = {
    PENDIENTE: "Pendiente", PARCIAL: "Parcial", PAGADA: "Pagada", VENCIDA: "Vencida",
  };

  return (
    <main className="ec-wrap">
      {/* Acciones (no se imprimen) */}
      <div className="ec-actions no-print">
        <a href="/cartera" className="btn btn-secondary">← Volver</a>
        <PrintButton />
      </div>

      {/* Documento */}
      <div className="ec-doc" id="estadocuenta">
        {/* Encabezado con logo */}
        <header className="ec-header">
          <div className="ec-emisor">
            {emisor?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={emisor.logo_url} alt="Logo" className="ec-logo" />
            ) : null}
            <div>
              <div className="ec-emisor-nombre">{emisor?.razon_social ?? "HSM Confecciones"}</div>
              <div className="ec-emisor-datos">
                {emisor?.nit && <div>NIT: {emisor.nit}</div>}
                {emisor?.direccion && <div>{emisor.direccion}</div>}
                {emisor?.ciudad && <div>{emisor.ciudad}</div>}
                {emisor?.telefono && <div>Tel: {emisor.telefono}</div>}
              </div>
            </div>
          </div>
          <div className="ec-meta">
            <div className="ec-titulo">ESTADO DE CUENTA</div>
            <div className="ec-fecha">Fecha: {hoy}</div>
          </div>
        </header>

        {/* Datos del cliente */}
        <section className="ec-cliente">
          <h2>Cliente</h2>
          <div className="ec-cliente-grid">
            <div><span>Nombre:</span> {cl.nombre}</div>
            <div><span>Documento:</span> {cl.documento ?? "-"}</div>
            <div><span>Teléfono:</span> {cl.telefono ?? "-"}</div>
            <div><span>Municipio:</span> {cl.municipio ?? "-"}</div>
            <div><span>Vendedor:</span> {cl.vendedores?.nombre ?? "-"}</div>
          </div>
        </section>

        {/* Resumen de totales */}
        <section className="ec-resumen">
          <div><span>Valor total facturado</span><strong>{money(totOriginal)}</strong></div>
          <div><span>Total abonado</span><strong>{money(totAbonado)}</strong></div>
          <div className="ec-saldo"><span>Saldo pendiente</span><strong>{money(totSaldo)}</strong></div>
        </section>

        {/* Detalle por factura */}
        {lista.length === 0 ? (
          <p className="muted">Este cliente no tiene cuentas por cobrar.</p>
        ) : (
          lista.map((c) => {
            const abonosCuenta = abonos.filter((a) => a.cuenta_id === c.id);
            return (
              <section className="ec-factura" key={c.id}>
                <div className="ec-factura-head">
                  <div>
                    <strong>Factura {c.facturas?.numero ?? "-"}</strong>
                    <span className="ec-sub"> · Venta {fecha(c.fecha_venta)}
                      {c.fecha_vencimiento ? ` · Vence ${fecha(c.fecha_vencimiento)}` : ""}</span>
                  </div>
                  <span className="ec-estado">{estadoLabel[c.estado] ?? c.estado}</span>
                </div>

                <div className="ec-factura-montos">
                  <div><span>Valor</span> {money(Number(c.valor_original))}</div>
                  <div><span>Abonado</span> {money(Number(c.total_abonado))}</div>
                  <div><span>Saldo</span> <strong>{money(Number(c.saldo_pendiente))}</strong></div>
                </div>

                {/* Tabla de abonos de esta factura */}
                {abonosCuenta.length > 0 ? (
                  <table className="ec-abonos">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Forma de pago</th>
                        <th>Observación</th>
                        <th className="num">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {abonosCuenta.map((a, i) => (
                        <tr key={i}>
                          <td>{fecha(a.fecha)}</td>
                          <td>{a.forma_pago}</td>
                          <td>{a.observacion ?? "-"}</td>
                          <td className="num">{money(Number(a.monto))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="ec-sin-abonos">Sin abonos registrados.</p>
                )}
              </section>
            );
          })
        )}

        <footer className="ec-pie">
          Documento informativo del estado de cuenta. Generado el {hoy}.
        </footer>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------
// Vista de Factura imprimible/descargable (Server Component).
// Ruta: /factura/[ventaId]
// Incluye LOGO del emisor y una sección de MEDIOS DE PAGO (cuentas
// bancarias) parametrizable desde empresa_config.cuentas_bancarias.
// ---------------------------------------------------------------------
import { createClient } from "@/lib/supabase/server";
import { money, fecha } from "@/lib/format";
import PrintButton from "./PrintButton";
import "./factura.css";

export const dynamic = "force-dynamic";

export default async function FacturaPage({
  params,
}: {
  params: { ventaId: string };
}) {
  const supabase = createClient();
  const ventaId = params.ventaId;

  const { data: emisor } = await supabase
    .from("empresa_config")
    .select("razon_social, nit, direccion, ciudad, telefono, email, pie_factura, logo_url, cuentas_bancarias")
    .single();

  const { data: venta } = await supabase
    .from("ventas")
    .select(
      "id, fecha, tipo_pago, subtotal, descuento, total, municipio, " +
        "clientes(nombre, documento, telefono, municipio), " +
        "vendedores(nombre)"
    )
    .eq("id", ventaId)
    .single();

  const { data: factura } = await supabase
    .from("facturas")
    .select("id, numero, fecha")
    .eq("venta_id", ventaId)
    .single();

  const { data: cxc } = await supabase
    .from("cuentas_por_cobrar")
    .select("fecha_vencimiento, dias_credito")
    .eq("factura_id", factura?.id ?? "")
    .maybeSingle();

  const { data: detalle } = await supabase
    .from("ventas_detalle")
    .select("cantidad, precio_unitario, subtotal, variantes(sku, referencia), calidades(codigo)")
    .eq("venta_id", ventaId);

  if (!venta || !factura) {
    return (
      <main className="container" style={{ padding: 24 }}>
        <div className="empty-state"><span className="emoji">🧾</span>No se encontró la factura solicitada.</div>
      </main>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v: any = venta;
  const cliente = v.clientes ?? {};
  const vendedorNombre = v.vendedores?.nombre ?? "-";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineas: any[] = detalle ?? [];

  // Cuentas bancarias: cada línea es una cuenta
  const cuentas = (emisor?.cuentas_bancarias ?? "")
    .split("\n")
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0);

  return (
    <main className="factura-wrap">
      <div className="factura-actions no-print">
        <a href="/ventas" className="btn btn-secondary">← Volver</a>
        <PrintButton />
      </div>

      <div className="factura-doc" id="factura">
        <header className="factura-header">
          <div className="factura-emisor">
            {emisor?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={emisor.logo_url} alt="Logo" className="factura-logo" />
            ) : null}
            <div>
              <h1 className="emisor-nombre">{emisor?.razon_social ?? "HSM Confecciones"}</h1>
              <div className="emisor-datos">
                {emisor?.nit && <div>NIT: {emisor.nit}</div>}
                {emisor?.direccion && <div>{emisor.direccion}</div>}
                {emisor?.ciudad && <div>{emisor.ciudad}</div>}
                {emisor?.telefono && <div>Tel: {emisor.telefono}</div>}
                {emisor?.email && <div>{emisor.email}</div>}
              </div>
            </div>
          </div>
          <div className="factura-meta">
            <div className="factura-titulo">FACTURA DE VENTA</div>
            <div className="factura-numero">{factura.numero}</div>
            <table className="meta-table">
              <tbody>
                <tr><td>Fecha</td><td>{fecha(factura.fecha)}</td></tr>
                <tr><td>Forma de pago</td><td>{v.tipo_pago === "CREDITO" ? "Crédito" : "Contado"}</td></tr>
                {cxc?.fecha_vencimiento && <tr><td>Vence</td><td>{fecha(cxc.fecha_vencimiento)}</td></tr>}
              </tbody>
            </table>
          </div>
        </header>

        <section className="factura-cliente">
          <h2>Cliente</h2>
          <div className="cliente-grid">
            <div><span>Nombre:</span> {cliente.nombre ?? "-"}</div>
            <div><span>Documento:</span> {cliente.documento ?? "-"}</div>
            <div><span>Teléfono:</span> {cliente.telefono ?? "-"}</div>
            <div><span>Municipio:</span> {cliente.municipio ?? v.municipio ?? "-"}</div>
            <div><span>Vendedor:</span> {vendedorNombre}</div>
          </div>
        </section>

        <section>
          <table className="factura-items">
            <thead>
              <tr>
                <th>Referencia</th><th>Calidad</th>
                <th className="num">Cant.</th><th className="num">Precio unit.</th><th className="num">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((l, i) => (
                <tr key={i}>
                  <td>{l.variantes?.sku ?? l.variantes?.referencia ?? "-"}</td>
                  <td>{l.calidades?.codigo ?? "-"}</td>
                  <td className="num">{l.cantidad}</td>
                  <td className="num">{money(Number(l.precio_unitario))}</td>
                  <td className="num">{money(Number(l.subtotal))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="factura-totales">
          <table>
            <tbody>
              <tr><td>Subtotal</td><td className="num">{money(Number(v.subtotal))}</td></tr>
              {Number(v.descuento) > 0 && (
                <tr><td>Descuento</td><td className="num">- {money(Number(v.descuento))}</td></tr>
              )}
              <tr className="total-row"><td>TOTAL</td><td className="num">{money(Number(v.total))}</td></tr>
            </tbody>
          </table>
        </section>

        {/* Medios de pago (cuentas bancarias) */}
        {cuentas.length > 0 && (
          <section className="factura-pago">
            <h2>Medios de pago</h2>
            <p className="pago-nota">Puede realizar su pago en cualquiera de las siguientes cuentas:</p>
            <ul className="pago-cuentas">
              {cuentas.map((c: string, i: number) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </section>
        )}

        {emisor?.pie_factura && <footer className="factura-pie">{emisor.pie_factura}</footer>}
      </div>
    </main>
  );
}

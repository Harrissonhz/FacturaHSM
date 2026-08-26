"use client";

// ---------------------------------------------------------------------
// Reporte de Cartera (Client) - A1 filtros + A2 agrupación + B3 aging
// + B4 KPIs + B6 exportar (CSV + PDF/imprimir).
// ---------------------------------------------------------------------
import { useState, useMemo } from "react";
import { money, fecha } from "@/lib/format";
import type { CuentaRep } from "./page";

type Agrupar = "NINGUNO" | "CLIENTE" | "VENDEDOR" | "MUNICIPIO";
type EstadoF = "TODOS" | "PENDIENTE" | "PARCIAL" | "VENCIDA" | "PAGADA";

// Días de vencida (negativo = aún por vencer)
function diasVencida(venc: string | null): number | null {
  if (!venc) return null;
  const d = new Date(venc);
  if (isNaN(d.getTime())) return null;
  const hoy = new Date();
  return Math.floor((hoy.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function tramoAging(venc: string | null): "POR_VENCER" | "D1_30" | "D31_60" | "D60_MAS" {
  const d = diasVencida(venc);
  if (d === null || d <= 0) return "POR_VENCER";
  if (d <= 30) return "D1_30";
  if (d <= 60) return "D31_60";
  return "D60_MAS";
}

export default function ReporteCarteraClient({ cuentas }: { cuentas: CuentaRep[] }) {
  // ---- Filtros (A1) ----
  const [buscarCliente, setBuscarCliente] = useState("");
  const [fVendedor, setFVendedor] = useState("TODOS");
  const [fMunicipio, setFMunicipio] = useState("TODOS");
  const [fEstado, setFEstado] = useState<EstadoF>("TODOS");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [agrupar, setAgrupar] = useState<Agrupar>("NINGUNO");

  const vendedores = useMemo(
    () => Array.from(new Set(cuentas.map((c) => c.vendedor))).sort(),
    [cuentas]
  );
  const municipios = useMemo(
    () => Array.from(new Set(cuentas.map((c) => c.municipio))).sort(),
    [cuentas]
  );

  // ---- Aplicar filtros ----
  const filtradas = useMemo(() => {
    return cuentas.filter((c) => {
      if (buscarCliente && !`${c.cliente} ${c.factura}`.toLowerCase().includes(buscarCliente.toLowerCase())) return false;
      if (fVendedor !== "TODOS" && c.vendedor !== fVendedor) return false;
      if (fMunicipio !== "TODOS" && c.municipio !== fMunicipio) return false;
      if (fEstado !== "TODOS" && c.estado !== fEstado) return false;
      if (desde && c.fecha_venta < desde) return false;
      if (hasta && c.fecha_venta > hasta) return false;
      return true;
    });
  }, [cuentas, buscarCliente, fVendedor, fMunicipio, fEstado, desde, hasta]);

  // ---- KPIs (B4) ----
  const kpis = useMemo(() => {
    const saldoTotal = filtradas.reduce((s, c) => s + c.saldo_pendiente, 0);
    const vencido = filtradas.filter((c) => tramoAging(c.fecha_vencimiento) !== "POR_VENCER" && c.saldo_pendiente > 0)
      .reduce((s, c) => s + c.saldo_pendiente, 0);
    const pctVencido = saldoTotal > 0 ? Math.round((vencido / saldoTotal) * 100) : 0;

    // Top cliente por saldo
    const porCli = new Map<string, number>();
    filtradas.forEach((c) => porCli.set(c.cliente, (porCli.get(c.cliente) ?? 0) + c.saldo_pendiente));
    let topCliente = "-", topClienteVal = 0;
    porCli.forEach((v, k) => { if (v > topClienteVal) { topClienteVal = v; topCliente = k; } });

    const numCuentas = filtradas.filter((c) => c.saldo_pendiente > 0).length;
    return { saldoTotal, vencido, pctVencido, topCliente, topClienteVal, numCuentas };
  }, [filtradas]);

  // ---- Aging (B3) ----
  const aging = useMemo(() => {
    const t = { POR_VENCER: 0, D1_30: 0, D31_60: 0, D60_MAS: 0 };
    filtradas.forEach((c) => {
      if (c.saldo_pendiente <= 0) return;
      t[tramoAging(c.fecha_vencimiento)] += c.saldo_pendiente;
    });
    return t;
  }, [filtradas]);

  // ---- Agrupación (A2) ----
  type Grupo = { clave: string; valor_original: number; abonado: number; saldo: number; num: number };
  const grupos = useMemo<Grupo[]>(() => {
    if (agrupar === "NINGUNO") return [];
    const map = new Map<string, Grupo>();
    filtradas.forEach((c) => {
      const clave = agrupar === "CLIENTE" ? c.cliente : agrupar === "VENDEDOR" ? c.vendedor : c.municipio;
      const g = map.get(clave) ?? { clave, valor_original: 0, abonado: 0, saldo: 0, num: 0 };
      g.valor_original += c.valor_original;
      g.abonado += c.total_abonado;
      g.saldo += c.saldo_pendiente;
      g.num += 1;
      map.set(clave, g);
    });
    return Array.from(map.values()).sort((a, b) => b.saldo - a.saldo);
  }, [filtradas, agrupar]);

  // ---- Export CSV (B6) ----
  function exportCSV() {
    let filas: string[][];
    let cabecera: string[];
    if (agrupar === "NINGUNO") {
      cabecera = ["Cliente", "Factura", "Vendedor", "Municipio", "Fecha venta", "Vencimiento", "Valor", "Abonado", "Saldo", "Estado"];
      filas = filtradas.map((c) => [
        c.cliente, c.factura, c.vendedor, c.municipio, c.fecha_venta, c.fecha_vencimiento ?? "",
        String(c.valor_original), String(c.total_abonado), String(c.saldo_pendiente), c.estado,
      ]);
    } else {
      const etiqueta = agrupar === "CLIENTE" ? "Cliente" : agrupar === "VENDEDOR" ? "Vendedor" : "Municipio";
      cabecera = [etiqueta, "# Cuentas", "Valor", "Abonado", "Saldo"];
      filas = grupos.map((g) => [g.clave, String(g.num), String(g.valor_original), String(g.abonado), String(g.saldo)]);
    }
    const csv = [cabecera, ...filas].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-cartera-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div id="reporte-cartera">
      {/* KPIs (B4) */}
      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <div className="summary-chip">
          <div className="label">Saldo total por cobrar</div>
          <div className="value">{money(kpis.saldoTotal)}</div>
        </div>
        <div className="summary-chip">
          <div className="label">Saldo vencido ({kpis.pctVencido}%)</div>
          <div className="value" style={{ color: kpis.vencido > 0 ? "var(--color-danger)" : undefined }}>{money(kpis.vencido)}</div>
        </div>
        <div className="summary-chip">
          <div className="label">Cliente que más debe</div>
          <div className="value" style={{ fontSize: "1rem" }}>{kpis.topCliente}</div>
          <div className="sub">{money(kpis.topClienteVal)}</div>
        </div>
        <div className="summary-chip">
          <div className="label">Cuentas con saldo</div>
          <div className="value">{kpis.numCuentas}</div>
        </div>
      </div>

      {/* Aging (B3) */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Antigüedad de la cartera</h3>
        <div className="grid grid-2">
          <div className="list-item" style={{ boxShadow: "none" }}>
            <div className="sub">Por vencer</div>
            <div className="amount" style={{ color: "var(--color-success)" }}>{money(aging.POR_VENCER)}</div>
          </div>
          <div className="list-item" style={{ boxShadow: "none" }}>
            <div className="sub">1–30 días vencida</div>
            <div className="amount" style={{ color: "var(--color-warning)" }}>{money(aging.D1_30)}</div>
          </div>
          <div className="list-item" style={{ boxShadow: "none" }}>
            <div className="sub">31–60 días vencida</div>
            <div className="amount" style={{ color: "#ea580c" }}>{money(aging.D31_60)}</div>
          </div>
          <div className="list-item" style={{ boxShadow: "none" }}>
            <div className="sub">60+ días vencida</div>
            <div className="amount" style={{ color: "var(--color-danger)" }}>{money(aging.D60_MAS)}</div>
          </div>
        </div>
      </div>

      {/* Filtros (A1) + Export (B6) */}
      <div className="card no-print">
        <h3 style={{ marginTop: 0 }}>Filtros</h3>
        <div className="grid grid-2">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Cliente o factura</label>
            <input className="input" placeholder="Buscar..." value={buscarCliente} onChange={(e) => setBuscarCliente(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Vendedor</label>
            <select className="select" value={fVendedor} onChange={(e) => setFVendedor(e.target.value)}>
              <option value="TODOS">Todos</option>
              {vendedores.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Municipio</label>
            <select className="select" value={fMunicipio} onChange={(e) => setFMunicipio(e.target.value)}>
              <option value="TODOS">Todos</option>
              {municipios.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Estado</label>
            <select className="select" value={fEstado} onChange={(e) => setFEstado(e.target.value as EstadoF)}>
              <option value="TODOS">Todos</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="PARCIAL">Parcial</option>
              <option value="VENCIDA">Vencida</option>
              <option value="PAGADA">Pagada</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Desde (fecha venta)</label>
            <input className="input" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Hasta (fecha venta)</label>
            <input className="input" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
          <span className="sub">Agrupar por:</span>
          <div className="segment">
            <button className={agrupar === "NINGUNO" ? "active" : ""} onClick={() => setAgrupar("NINGUNO")}>Detalle</button>
            <button className={agrupar === "CLIENTE" ? "active" : ""} onClick={() => setAgrupar("CLIENTE")}>Cliente</button>
            <button className={agrupar === "VENDEDOR" ? "active" : ""} onClick={() => setAgrupar("VENDEDOR")}>Vendedor</button>
            <button className={agrupar === "MUNICIPIO" ? "active" : ""} onClick={() => setAgrupar("MUNICIPIO")}>Municipio</button>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={exportCSV}>⬇ CSV</button>
            <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>🖨 PDF</button>
          </div>
        </div>
      </div>

      {/* Resultados */}
      {agrupar === "NINGUNO" ? (
        <DetalleLista cuentas={filtradas} />
      ) : (
        <GrupoLista grupos={grupos} etiqueta={agrupar === "CLIENTE" ? "Cliente" : agrupar === "VENDEDOR" ? "Vendedor" : "Municipio"} />
      )}
    </div>
  );
}

// ---- Vista detalle (sin agrupar) ----
function DetalleLista({ cuentas }: { cuentas: CuentaRep[] }) {
  if (cuentas.length === 0) {
    return <div className="empty-state"><span className="emoji">💰</span>No hay cuentas que coincidan con los filtros.</div>;
  }
  return (
    <div className="list-cards">
      {cuentas.map((c) => {
        const d = diasVencida(c.fecha_vencimiento);
        const vencidaTxt = d !== null && d > 0 && c.saldo_pendiente > 0 ? `${d} días vencida` : "";
        return (
          <div className="list-item" key={c.id}>
            <div className="row">
              <div>
                <div className="title">{c.cliente}</div>
                <div className="sub">Factura {c.factura} · {c.vendedor} · {c.municipio}</div>
                <div className="sub">Venta {fecha(c.fecha_venta)}{c.fecha_vencimiento ? ` · Vence ${fecha(c.fecha_vencimiento)}` : ""}
                  {vencidaTxt ? ` · ` : ""}
                  {vencidaTxt && <strong style={{ color: "var(--color-danger)" }}>{vencidaTxt}</strong>}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="sub">Saldo</div>
                <div className="amount amount-lg">{money(c.saldo_pendiente)}</div>
              </div>
            </div>
            <div className="sub" style={{ marginTop: 6 }}>
              Abonado: {money(c.total_abonado)} / {money(c.valor_original)} · {c.estado}
            </div>
            <a className="btn btn-secondary btn-sm no-print" style={{ marginTop: 8 }} href={`/cartera/estado/${c.cliente_id}`}>
              📄 Estado de cuenta
            </a>
          </div>
        );
      })}
    </div>
  );
}

// ---- Vista agrupada ----
function GrupoLista({
  grupos, etiqueta,
}: {
  grupos: { clave: string; valor_original: number; abonado: number; saldo: number; num: number }[];
  etiqueta: string;
}) {
  if (grupos.length === 0) {
    return <div className="empty-state"><span className="emoji">📊</span>Sin datos para agrupar.</div>;
  }
  const totalSaldo = grupos.reduce((s, g) => s + g.saldo, 0);
  return (
    <>
      <p className="sub" style={{ marginBottom: 8 }}>Agrupado por {etiqueta} · Saldo total: <strong>{money(totalSaldo)}</strong></p>
      <div className="list-cards">
        {grupos.map((g, i) => (
          <div className="list-item" key={i}>
            <div className="row">
              <div>
                <div className="title">{g.clave}</div>
                <div className="sub">{g.num} factura(s) · Abonado {money(g.abonado)} / {money(g.valor_original)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="sub">Saldo</div>
                <div className="amount amount-lg">{money(g.saldo)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

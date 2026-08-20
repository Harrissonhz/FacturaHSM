"use client";

import { useState } from "react";

// Pantalla de demostracion que invoca POST /api/ventas.
// En produccion, los ids de vendedor/cliente/variante/calidad se
// seleccionan desde catalogos cargados con datos reales.
export default function VentasDemoPage() {
  const [loading, setLoading] = useState(false);
  const [respuesta, setRespuesta] = useState<string>("");

  // Payload de ejemplo (reemplaza los UUID por valores reales de tu BD).
  const payloadEjemplo = {
    vendedor_id: "00000000-0000-0000-0000-000000000000",
    cliente_id: "00000000-0000-0000-0000-000000000000",
    tipo_pago: "CREDITO",
    dias_credito: 30,
    descuento: 0,
    items: [
      {
        variante_id: "00000000-0000-0000-0000-000000000000",
        calidad_id: "00000000-0000-0000-0000-000000000000",
        cantidad: 10,
        precio_unitario: 70000,
      },
    ],
  };

  async function registrar() {
    setLoading(true);
    setRespuesta("");
    try {
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadEjemplo),
      });
      const json = await res.json();
      setRespuesta(JSON.stringify(json, null, 2));
    } catch (e) {
      setRespuesta("Error de red: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <h1>Ventas · Demo</h1>
      <p className="muted">
        Registra una venta a credito invocando la RPC transaccional
        <code> sp_registrar_venta</code> (descuenta inventario del vendedor,
        genera factura y cuenta por cobrar de forma atomica).
      </p>

      <div className="card">
        <h3>Payload de ejemplo</h3>
        <pre>{JSON.stringify(payloadEjemplo, null, 2)}</pre>
        <button className="btn" onClick={registrar} disabled={loading}>
          {loading ? "Registrando..." : "Registrar venta"}
        </button>
      </div>

      {respuesta && (
        <div className="card">
          <h3>Respuesta del servidor</h3>
          <pre>{respuesta}</pre>
        </div>
      )}
    </main>
  );
}

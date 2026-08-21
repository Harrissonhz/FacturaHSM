import { getPerfil } from "@/lib/auth/session";

export default async function DashboardHome() {
  const perfil = await getPerfil();
  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <>
      <h1>
        {saludo}
        {perfil ? `, ${perfil.nombre.split(" ")[0]}` : ""} 👋
      </h1>
      <p className="muted">¿Qué deseas hacer hoy?</p>

      {/* Accesos rapidos en tarjetas grandes (faciles de tocar) */}
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <a href="/ventas" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ fontSize: "2rem" }}>🛒</div>
          <h3 style={{ marginTop: 8 }}>Registrar venta</h3>
          <p className="muted" style={{ margin: 0 }}>
            Vende a un cliente y genera su factura.
          </p>
        </a>

        <a href="/cartera" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ fontSize: "2rem" }}>💰</div>
          <h3 style={{ marginTop: 8 }}>Cartera</h3>
          <p className="muted" style={{ margin: 0 }}>
            Consulta saldos y registra abonos.
          </p>
        </a>

        <a href="/inventario" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ fontSize: "2rem" }}>📦</div>
          <h3 style={{ marginTop: 8 }}>Inventario</h3>
          <p className="muted" style={{ margin: 0 }}>
            Revisa tus productos disponibles.
          </p>
        </a>

        <div className="card">
          <div style={{ fontSize: "2rem" }}>👤</div>
          <h3 style={{ marginTop: 8 }}>Tu sesión</h3>
          <p className="muted" style={{ margin: 0 }}>
            {perfil?.nombre}
            <br />
            Rol: {perfil?.rol}
          </p>
        </div>
      </div>
    </>
  );
}

import { getPerfil } from "@/lib/auth/session";

export default async function DashboardHome() {
  const perfil = await getPerfil();

  return (
    <main>
      <h1>Panel principal</h1>
      <p className="muted">
        Bienvenido{perfil ? `, ${perfil.nombre}` : ""}. Sistema POS ·
        inventario por estados · produccion/maquila · distribucion por
        vendedores · ventas a credito · cartera.
      </p>

      <div className="card">
        <h2>Sesion activa</h2>
        <ul>
          <li>Usuario: <strong>{perfil?.nombre}</strong></li>
          <li>Rol: <strong>{perfil?.rol}</strong></li>
          <li>Correo: <strong>{perfil?.email}</strong></li>
        </ul>
      </div>

      <div className="card">
        <h2>Accesos rapidos</h2>
        <ul>
          <li><a href="/ventas">Registrar venta</a></li>
          <li><a href="/cartera">Cartera / cuentas por cobrar</a></li>
        </ul>
      </div>
    </main>
  );
}

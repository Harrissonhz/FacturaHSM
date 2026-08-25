// Pantalla "Más": agrupa las funciones de administración (útil en móvil).
import { getPerfil } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MasPage() {
  const perfil = await getPerfil();
  if (perfil?.rol !== "admin") redirect("/");

  const items = [
    { href: "/compras", icon: "🧾", label: "Compras", desc: "Compras y recepción de mercancía." },
    { href: "/produccion", icon: "🏭", label: "Producción", desc: "Transformar CRUDO en LISTO." },
    { href: "/distribucion", icon: "🚚", label: "Distribución", desc: "Enviar inventario a vendedores." },
    { href: "/retorno", icon: "↩️", label: "Retorno", desc: "Regresar lo no vendido al central." },
    { href: "/clientes", icon: "🧑‍🤝‍🧑", label: "Clientes", desc: "Crear, editar e inactivar clientes." },
    { href: "/ventas/historial", icon: "🧾", label: "Historial de ventas", desc: "Consultar y anular ventas." },
    { href: "/inventario/ajuste", icon: "⚖️", label: "Ajuste de inventario", desc: "Corregir saldos con motivo." },
    { href: "/reportes", icon: "📊", label: "Reportes", desc: "Inventario, ventas, cartera y trazabilidad." },
    { href: "/catalogos", icon: "⚙️", label: "Catálogos", desc: "Productos, variantes y vendedores." },
  ];

  return (
    <main>
      <h1>Más opciones</h1>
      <p className="muted">Funciones de administración.</p>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        {items.map((it) => (
          <a key={it.href} href={it.href} className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ fontSize: "2rem" }}>{it.icon}</div>
            <h3 style={{ marginTop: 8 }}>{it.label}</h3>
            <p className="muted" style={{ margin: 0 }}>{it.desc}</p>
          </a>
        ))}
      </div>
    </main>
  );
}

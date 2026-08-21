// ---------------------------------------------------------------------
// Layout del area protegida (dashboard) - Fase 1 rediseñado.
// Estructura: header + banner de conexion + (sidebar | contenido) + bottom nav.
// Guarda de servidor: sin perfil valido -> /login.
// ---------------------------------------------------------------------
import { redirect } from "next/navigation";
import { getPerfil } from "@/lib/auth/session";
import { signOut } from "@/app/login/actions";
import AppNav from "@/components/AppNav";
import ConnectionBanner from "@/components/ConnectionBanner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login");

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <span className="brand">FacturacionHSM</span>
        <span className="spacer" />
        <span className="user-chip">
          {perfil.nombre} · {perfil.rol}
        </span>
        <form action={signOut} style={{ marginLeft: 12 }}>
          <button className="btn btn-ghost btn-sm" type="submit">
            Salir
          </button>
        </form>
      </header>

      {/* Aviso de sin conexion (Fase 1: internet requerido) */}
      <ConnectionBanner />

      {/* Cuerpo: sidebar (escritorio) + contenido */}
      <div className="app-body">
        <AppNav rol={perfil.rol} />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}

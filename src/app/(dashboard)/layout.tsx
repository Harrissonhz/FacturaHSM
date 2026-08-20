// ---------------------------------------------------------------------
// Layout del area protegida (dashboard).
// Si no hay sesion valida, redirige a /login (guarda de servidor).
// Muestra la barra superior con el usuario y el boton de cerrar sesion.
// ---------------------------------------------------------------------
import { redirect } from "next/navigation";
import { getPerfil } from "@/lib/auth/session";
import { signOut } from "@/app/login/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const perfil = await getPerfil();

  // Guarda: sin perfil valido no se accede al dashboard.
  if (!perfil) {
    redirect("/login");
  }

  return (
    <div>
      <header className="topbar">
        <div className="topbar-inner">
          <strong>FacturacionHSM</strong>
          <div className="topbar-right">
            <span className="muted">
              {perfil.nombre} · <em>{perfil.rol}</em>
            </span>
            <form action={signOut}>
              <button className="btn btn-ghost" type="submit">
                Cerrar sesion
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="container">{children}</div>
    </div>
  );
}

"use client";

// ---------------------------------------------------------------------
// Navegación de la app.
//  - Escritorio (sidebar): agrupado por secciones con encabezados visibles
//    (sin colapsar) para orden + acceso en 1 clic. Incluye TODAS las opciones.
//  - Móvil (bottom nav): 4 principales + "Más" (admin) para el resto.
// ---------------------------------------------------------------------
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: string; roles?: string[]; primary?: boolean };
type Grupo = { titulo: string; items: Item[] };

// Estructura del sidebar por secciones (escritorio)
const GRUPOS: Grupo[] = [
  {
    titulo: "Operación",
    items: [
      { href: "/", label: "Inicio", icon: "🏠", primary: true },
      { href: "/ventas", label: "Vender", icon: "🛒", primary: true },
      { href: "/inventario", label: "Inventario", icon: "📦", primary: true },
      { href: "/cartera", label: "Cartera", icon: "💰", primary: true },
    ],
  },
  {
    titulo: "Abastecimiento",
    items: [
      { href: "/compras", label: "Compras", icon: "🧾", roles: ["admin"] },
      { href: "/produccion", label: "Producción", icon: "🏭", roles: ["admin"] },
      { href: "/distribucion", label: "Distribución", icon: "🚚", roles: ["admin"] },
      { href: "/retorno", label: "Retorno", icon: "↩️", roles: ["admin"] },
    ],
  },
  {
    titulo: "Gestión",
    items: [
      { href: "/clientes", label: "Clientes", icon: "🧑‍🤝‍🧑", roles: ["admin"] },
      { href: "/catalogos", label: "Catálogos", icon: "⚙️", roles: ["admin"] },
    ],
  },
  {
    titulo: "Análisis y ajustes",
    items: [
      { href: "/reportes", label: "Reportes", icon: "📊", roles: ["admin"] },
      { href: "/ventas/historial", label: "Historial ventas", icon: "🧾", roles: ["admin"] },
      { href: "/inventario/ajuste", label: "Ajuste inventario", icon: "⚖️", roles: ["admin"] },
    ],
  },
];

// Bottom nav (móvil): principales + "Más"
const MAS: Item = { href: "/mas", label: "Más", icon: "⋯", roles: ["admin"] };

export default function AppNav({ rol }: { rol?: string }) {
  const pathname = usePathname();
  const puede = (it: Item) => !it.roles || (rol && it.roles.includes(rol));

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // Principales (para bottom nav)
  const principales = GRUPOS.flatMap((g) => g.items).filter((it) => it.primary && puede(it));
  const bottom = rol === "admin" ? [...principales, MAS] : principales;

  return (
    <>
      {/* Sidebar (escritorio) - agrupado por secciones */}
      <nav className="side-nav" aria-label="Navegacion principal">
        {GRUPOS.map((grupo) => {
          const visibles = grupo.items.filter(puede);
          if (visibles.length === 0) return null;
          return (
            <div key={grupo.titulo}>
              <div className="nav-group">{grupo.titulo}</div>
              {visibles.map((it) => (
                <Link key={it.href} href={it.href} className={isActive(it.href) ? "active" : ""}>
                  <span className="icon" aria-hidden>{it.icon}</span>
                  {it.label}
                </Link>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Bottom nav (móvil) - principales + Más */}
      <nav className="bottom-nav" aria-label="Navegacion principal">
        {bottom.map((it) => (
          <Link key={it.href} href={it.href} className={isActive(it.href) ? "active" : ""}>
            <span className="icon" aria-hidden>{it.icon}</span>
            {it.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

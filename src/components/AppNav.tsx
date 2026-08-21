"use client";

// ---------------------------------------------------------------------
// Navegacion de la app:
//  - Movil: bottom navigation fija (alcanzable con el pulgar).
//  - Escritorio (>=1024px): sidebar lateral.
// Marca el destino activo segun la ruta actual.
// "Catálogos" solo se muestra a admin.
// ---------------------------------------------------------------------
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: string; roles?: string[] };

const ITEMS: Item[] = [
  { href: "/", label: "Inicio", icon: "🏠" },
  { href: "/ventas", label: "Vender", icon: "🛒" },
  { href: "/inventario", label: "Inventario", icon: "📦" },
  { href: "/cartera", label: "Cartera", icon: "💰" },
  { href: "/catalogos", label: "Catálogos", icon: "⚙️", roles: ["admin"] },
];

export default function AppNav({ rol }: { rol?: string }) {
  const pathname = usePathname();

  const visibles = ITEMS.filter(
    (it) => !it.roles || (rol && it.roles.includes(rol))
  );

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Sidebar (escritorio) */}
      <nav className="side-nav" aria-label="Navegacion principal">
        {visibles.map((it) => (
          <Link key={it.href} href={it.href} className={isActive(it.href) ? "active" : ""}>
            <span className="icon" aria-hidden>{it.icon}</span>
            {it.label}
          </Link>
        ))}
      </nav>

      {/* Bottom nav (movil) */}
      <nav className="bottom-nav" aria-label="Navegacion principal">
        {visibles.map((it) => (
          <Link key={it.href} href={it.href} className={isActive(it.href) ? "active" : ""}>
            <span className="icon" aria-hidden>{it.icon}</span>
            {it.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

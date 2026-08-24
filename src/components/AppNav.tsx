"use client";

// ---------------------------------------------------------------------
// Navegacion de la app (movil: bottom nav / escritorio: sidebar).
// Items de admin: Compras, Producción, Distribución, Catálogos.
// Como son varios, en movil el bottom nav prioriza los 4 principales
// y agrupa el resto bajo "Más" (solo admin lo ve completo en sidebar).
// ---------------------------------------------------------------------
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: string; roles?: string[]; primary?: boolean };

const ITEMS: Item[] = [
  { href: "/", label: "Inicio", icon: "🏠", primary: true },
  { href: "/ventas", label: "Vender", icon: "🛒", primary: true },
  { href: "/inventario", label: "Inventario", icon: "📦", primary: true },
  { href: "/cartera", label: "Cartera", icon: "💰", primary: true },
  { href: "/compras", label: "Compras", icon: "🧾", roles: ["admin"] },
  { href: "/produccion", label: "Producción", icon: "🏭", roles: ["admin"] },
  { href: "/distribucion", label: "Distribución", icon: "🚚", roles: ["admin"] },
  { href: "/catalogos", label: "Catálogos", icon: "⚙️", roles: ["admin"] },
];

const MAS: Item = { href: "/mas", label: "Más", icon: "⋯", roles: ["admin"] };

export default function AppNav({ rol }: { rol?: string }) {
  const pathname = usePathname();

  const visibles = ITEMS.filter((it) => !it.roles || (rol && it.roles.includes(rol)));

  // Bottom nav (movil): los 4 principales + "Más" (si es admin) para el resto.
  const principales = visibles.filter((it) => it.primary);
  const bottom = rol === "admin" ? [...principales, MAS] : principales;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Sidebar (escritorio) - todos los items */}
      <nav className="side-nav" aria-label="Navegacion principal">
        {visibles.map((it) => (
          <Link key={it.href} href={it.href} className={isActive(it.href) ? "active" : ""}>
            <span className="icon" aria-hidden>{it.icon}</span>
            {it.label}
          </Link>
        ))}
      </nav>

      {/* Bottom nav (movil) - principales */}
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

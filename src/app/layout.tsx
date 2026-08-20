import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FacturacionHSM",
  description:
    "Sistema POS: inventario por estados, produccion/maquila, distribucion por vendedores, ventas a credito y cartera.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

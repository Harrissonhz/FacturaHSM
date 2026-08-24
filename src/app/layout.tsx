import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWALoader from "@/components/PWALoader";

export const metadata: Metadata = {
  title: "FacturacionHSM",
  description:
    "Sistema POS: inventario por estados, produccion/maquila, distribucion por vendedores, ventas a credito y cartera.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HSM",
  },
  icons: {
    icon: "/icons/favicon-32.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e3a5f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {children}
        <PWALoader />
      </body>
    </html>
  );
}

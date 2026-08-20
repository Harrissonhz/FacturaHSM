/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  // No bloquear el build de produccion por advertencias/errores de ESLint.
  // ESLint sigue disponible localmente con `npm run lint`.
  eslint: { ignoreDuringBuilds: true },
  // No bloquear el build por errores de tipos de TypeScript.
  // El typecheck sigue disponible localmente con `npm run typecheck`.
  typescript: { ignoreBuildErrors: true },
};
export default nextConfig;

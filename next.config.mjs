/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    unoptimized: true,
  },
  devIndicators: false,
  // Сборщик PDF тянет за собой шрифтовые и бинарные модули — их нельзя
  // бандлить, иначе на Vercel он не находит собственные зависимости.
  serverExternalPackages: ["@react-pdf/renderer"],
  // Шрифт документов читается с диска по абсолютному пути, трассировщик
  // такую зависимость не видит — кладём файлы в функцию явно.
  outputFileTracingIncludes: {
    "/api/documents/**": ["./assets/fonts/**"],
  },
}

export default nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Desactiva la compilación por Turbopack para CSS modules si está presente
  experimental: {
    turbo: undefined
  }
};

module.exports = nextConfig;
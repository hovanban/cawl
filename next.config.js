/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow server-side packages in API routes
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
    instrumentationHook: true,
  },
};

module.exports = nextConfig;

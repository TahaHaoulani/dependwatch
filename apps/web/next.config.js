/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@dependwatch/shared'],
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.logo.dev', pathname: '/**' },
    ],
  },
};

module.exports = nextConfig;

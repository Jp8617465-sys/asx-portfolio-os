/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Don't fail production builds on ESLint warnings
    // Warnings are still visible during development and in CI logs
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

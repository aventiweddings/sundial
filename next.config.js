/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mammoth', 'pdf-parse', 'docx'],
  },
};

module.exports = nextConfig;

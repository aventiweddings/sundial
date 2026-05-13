/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mammoth', 'pdf-parse', 'docx'],
  },
};

export default nextConfig;

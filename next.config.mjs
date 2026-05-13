/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mammoth', 'pdf-parse', 'docx'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.node = { __dirname: true, __filename: true };
    }
    return config;
  },
};

export default nextConfig;

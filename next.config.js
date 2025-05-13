/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  
  // Configurações específicas para WebSocket e Socket.IO
  poweredByHeader: false,
  compress: true,
  
  // Aumentar timeout para operações longas
  serverRuntimeConfig: {
    socketTimeout: 120000, // 120 segundos
    bodySizeLimit: '2mb',  // Aumentar limite para payload
  },
  
  // Configuração para evitar problemas com desenvolvimento
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.externals = [...(config.externals || []), 'bufferutil', 'utf-8-validate'];
    }
    
    // Otimizações para Socket.IO
    config.resolve.fallback = {
      ...config.resolve.fallback,
      dgram: false,
      fs: false,
      net: false,
      tls: false,
    };
    
    return config;
  },
};

module.exports = nextConfig; 
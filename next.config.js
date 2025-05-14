/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  
  // Configurações específicas para WebSocket e Socket.IO
  poweredByHeader: false,
  compress: true,
  
  // Configurações de segurança - forçar HTTPS em produção
  async headers() {
    return [
      {
        // Aplicar esses cabeçalhos para todas as rotas
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  },
  
  // Redirecionamento para HTTPS em produção
  async redirects() {
    return process.env.NODE_ENV === 'production'
      ? [
          {
            source: '/:path*',
            has: [
              {
                type: 'host',
                value: 'yourdomain.com',
              },
            ],
            destination: 'https://yourdomain.com/:path*',
            permanent: true,
          },
        ]
      : [];
  },
  
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
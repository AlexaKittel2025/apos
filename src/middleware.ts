import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const url = request.nextUrl.pathname;

  // Otimizar para conexões WebSocket
  if (url.startsWith('/api/socket') || url.includes('/socket.io/')) {
    // Aumentar tempos de expiração para WebSockets
    response.headers.set('Connection', 'keep-alive');
    response.headers.set('Keep-Alive', 'timeout=120');
    
    // Desativar cache para evitar problemas
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    
    // Permitir CORS para WebSockets
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    // Se for uma requisição OPTIONS (preflight), retornar 200 OK
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }
  }

  return response;
}

// Aplicar em rotas específicas
export const config = {
  matcher: [
    '/api/socket', 
    '/socket.io/:path*',
    '/api/socket/:path*'
  ]
}; 
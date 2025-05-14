import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const url = request.nextUrl.pathname;
  const isProduction = process.env.NODE_ENV === 'production';

  // Verificar e forçar HTTPS em produção
  if (isProduction && !request.nextUrl.protocol.includes('https')) {
    // Criar URL HTTPS com mesmo caminho e parâmetros
    const httpsUrl = request.nextUrl.clone();
    httpsUrl.protocol = 'https:';
    return NextResponse.redirect(httpsUrl);
  }

  // Adicionar cabeçalhos de segurança básicos para todas as rotas
  // Estes complementam os cabeçalhos definidos em next.config.js
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  
  // Prevenir o vazamento de informações sensíveis
  response.headers.set('Server', '');
  response.headers.delete('X-Powered-By');

  // Configurações específicas para WebSockets
  if (url.startsWith('/api/socket') || url.includes('/socket.io/')) {
    // Aumentar tempos de expiração para WebSockets
    response.headers.set('Connection', 'keep-alive');
    response.headers.set('Keep-Alive', 'timeout=120');
    
    // Desativar cache para evitar problemas
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    
    // Permitir CORS para WebSockets
    response.headers.set('Access-Control-Allow-Origin', isProduction ? 'https://yourdomain.com' : '*');
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

// Configurar quais rotas passam pelo middleware
export const config = {
  matcher: [
    // Aplicar a todas as rotas exceto assets estáticos, favicon e robots.txt
    '/((?!_next/static|_next/image|favicon.ico|robots.txt).*)',
  ],
}; 
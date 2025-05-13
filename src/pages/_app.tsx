import { SessionProvider } from 'next-auth/react';
import type { AppProps } from 'next/app';
import '@/styles/globals.css';
import Header from '@/components/Header';
import { useRouter } from 'next/router';
import { BalanceProvider } from '@/lib/BalanceContext';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  // Lista de rotas que não devem exibir o cabeçalho
  const noHeaderRoutes = ['/auth/login', '/auth/register'];
  const showHeader = !noHeaderRoutes.includes(router.pathname);
  
  return (
    <SessionProvider session={pageProps.session}>
      <BalanceProvider>
        {showHeader && <Header />}
        <main>
          <Component {...pageProps} />
        </main>
      </BalanceProvider>
    </SessionProvider>
  );
} 
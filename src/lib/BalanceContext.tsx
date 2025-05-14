'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

interface BalanceContextType {
  userBalance: number;
  refreshBalance: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
  isLoadingBalance: boolean;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export const BalanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: session, status } = useSession();
  const [userBalance, setUserBalance] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // Verificar se estamos no cliente antes de usar funcionalidades que dependem do navegador
  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchBalance = async () => {
    // Não fazer a chamada se o usuário não estiver autenticado
    if (!session?.user?.id) {
      console.log("Sem sessão de usuário válida para buscar saldo");
      return userBalance;
    }

    // Não iniciar nova requisição se já estiver carregando
    if (isLoadingBalance) {
      console.log("Já está carregando saldo, ignorando chamada duplicada");
      return userBalance;
    }

    setIsLoadingBalance(true);
    setLastError(null);
    
    try {
      const timestamp = new Date().getTime();
      console.log(`Buscando saldo para usuário ${session.user.id} em ${timestamp}`);
      
      const response = await fetch(`/api/user/balance?_=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Saldo obtido: ${data.balance}`);
        setUserBalance(data.balance);
        return data.balance;
      } else {
        const errorText = await response.text();
        setLastError(`Resposta não-OK: ${response.status}`);
        console.error('Erro ao buscar saldo:', response.status, errorText);
        
        // Se receber 401 ou 403, pode ser problema de autenticação
        if (response.status === 401 || response.status === 403 && isClient) {
          console.log("Problema de autenticação detectado, redirecionando para login");
          router.push('/auth/login');
          return userBalance;
        }
        
        try {
          console.log('Tentando buscar saldo novamente...');
          const retryResponse = await fetch(`/api/user/balance?retry=1&_=${timestamp + 1}`, {
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            console.log(`Saldo obtido na segunda tentativa: ${retryData.balance}`);
            setUserBalance(retryData.balance);
            return retryData.balance;
          } else {
            setLastError(`Falha na segunda tentativa: ${retryResponse.status}`);
          }
        } catch (retryError) {
          console.error('Erro na segunda tentativa de buscar saldo:', retryError);
          setLastError(`Erro de rede na segunda tentativa`);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar saldo:', error);
      setLastError('Erro de rede ao buscar saldo');
    } finally {
      setIsLoadingBalance(false);
    }
    return userBalance;
  };

  // Atualizar saldo quando a sessão mudar
  useEffect(() => {
    if (!isClient) return; // Não executa no servidor
    
    const handleSessionChange = async () => {
      // Verificar se a sessão está completa e pronta
      if (status === 'authenticated' && session?.user?.id) {
        console.log('Sessão autenticada, buscando saldo inicial');
        await fetchBalance();
      } else if (status === 'unauthenticated') {
        console.log('Usuário não autenticado');
        if (router.isReady && !router.pathname.startsWith('/auth/')) {
          router.push('/auth/login');
        }
      }
    };

    handleSessionChange();
  }, [session, status, isClient, router.isReady]);

  // Função para atualizar o saldo manualmente
  const refreshBalance = async () => {
    return await fetchBalance();
  };

  // Função para atualizar o saldo localmente (sem fazer chamada à API)
  const updateBalance = (newBalance: number) => {
    setUserBalance(newBalance);
  };

  return (
    <BalanceContext.Provider value={{ 
      userBalance, 
      refreshBalance, 
      updateBalance,
      isLoadingBalance 
    }}>
      {children}
    </BalanceContext.Provider>
  );
};

export const useBalance = () => {
  const context = useContext(BalanceContext);
  if (context === undefined) {
    throw new Error('useBalance deve ser usado dentro de um BalanceProvider');
  }
  return context;
}; 
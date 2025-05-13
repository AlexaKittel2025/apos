'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface BalanceContextType {
  userBalance: number;
  refreshBalance: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
  isLoadingBalance: boolean;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export const BalanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: session } = useSession();
  const [userBalance, setUserBalance] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const fetchBalance = async () => {
    if (!session?.user?.id) return userBalance;

    setIsLoadingBalance(true);
    try {
      const response = await fetch('/api/user/balance');
      if (response.ok) {
        const data = await response.json();
        setUserBalance(data.balance);
        return data.balance;
      } else {
        console.error('Erro ao buscar saldo: Resposta não-OK', await response.text());
      }
    } catch (error) {
      console.error('Erro ao buscar saldo:', error);
    } finally {
      setIsLoadingBalance(false);
    }
    return userBalance;
  };

  // Atualizar saldo quando a sessão mudar
  useEffect(() => {
    if (session?.user?.id) {
      fetchBalance();
    }
  }, [session]);

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
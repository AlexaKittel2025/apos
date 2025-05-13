'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface BalanceContextType {
  userBalance: number;
  refreshBalance: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export const BalanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: session } = useSession();
  const [userBalance, setUserBalance] = useState(0);

  const fetchBalance = async () => {
    if (session?.user?.id) {
      try {
        const response = await fetch('/api/user/balance');
        if (response.ok) {
          const data = await response.json();
          setUserBalance(data.balance);
          return data.balance;
        }
      } catch (error) {
        console.error('Erro ao buscar saldo:', error);
      }
    }
    return userBalance;
  };

  // Atualizar saldo quando a sessão mudar
  useEffect(() => {
    fetchBalance();
  }, [session]);

  // Função para atualizar o saldo manualmente
  const refreshBalance = async () => {
    await fetchBalance();
  };

  // Função para atualizar o saldo localmente (sem fazer chamada à API)
  const updateBalance = (newBalance: number) => {
    setUserBalance(newBalance);
  };

  return (
    <BalanceContext.Provider value={{ userBalance, refreshBalance, updateBalance }}>
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
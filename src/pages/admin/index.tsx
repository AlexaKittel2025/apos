import React, { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import ChatSupport from '@/components/ChatSupport';

interface GameStats {
  totalBets: number;
  totalAmount: number;
  houseProfit: number;
  currentRound: {
    id: string;
    result: number;
    endTime: string;
    houseProfit: number;
  };
}

interface User {
  id: string;
  email: string;
  name: string;
  balance: number;
}

// Definir interface para mensagens
interface MessageType {
  id?: string;
  text: string;
  sender: 'USER' | 'ADMIN' | 'SYSTEM';
  userId?: string;
  userName?: string;
  userEmail?: string;
  recipientId?: string | null;
  timestamp: Date | string;
  read?: boolean;
  isFinal?: boolean;
  isImage?: boolean;
  fileInfo?: {
    originalName: string;
    url: string;
  };
}

export default function AdminPanel() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<GameStats | null>(null);
  const [houseProfit, setHouseProfit] = useState(0);
  const [userEmail, setUserEmail] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [searchingUser, setSearchingUser] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Dados para as abas de Saques e Depósitos
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<string | null>(null);
  
  // Adicionar contador de jogadores online
  const [playerCount, setPlayerCount] = useState(0);
  
  // Tabs de navegação
  const [activeTab, setActiveTab] = useState('stats'); // 'stats', 'recharge', 'house-profit', 'withdrawals', 'deposits', 'chat'
  
  // Estado para modal de detalhes da transação
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Estado para rastrear o usuário selecionado no chat
  const [selectedChatUser, setSelectedChatUser] = useState<string | undefined>(undefined);
  
  // Função para extrair detalhes da transação
  const getTransactionDetails = (transaction: any) => {
    if (!transaction?.details) return { pixKey: 'Não informado', method: 'Não informado' };
    
    try {
      let details = {};
      
      if (typeof transaction.details === 'string') {
        details = JSON.parse(transaction.details);
      } else if (typeof transaction.details === 'object') {
        details = transaction.details;
      }
      
      const pixKey = (details as any)?.pixKey || 'Não informado';
      const methodName = (details as any)?.method || 'pixWithdraw';
      
      const formattedMethod = methodName === 'pixWithdraw' 
        ? 'PIX' 
        : methodName === 'bankAccount' 
          ? 'Conta Bancária' 
          : methodName;
      
      return { pixKey, method: formattedMethod };
    } catch (error) {
      console.error('Erro ao analisar detalhes da transação:', error);
      return { pixKey: 'Erro ao processar', method: 'Erro ao processar' };
    }
  };

  useEffect(() => {
    if (status === 'loading') return;

    if (!session || session.user.role !== 'ADMIN') {
      router.push('/');
      return;
    }

    fetchStats();
    
    // Conectar ao socket para receber atualizações de jogadores online
    const connectToSocket = async () => {
      try {
        // Garantir que a API de socket está inicializada
        await fetch('/api/socket');
        
        // Importar Socket.IO dinamicamente
        const { io } = await import('socket.io-client');
        const socket = io();
        
        // Receber contagem de jogadores
        socket.on('playerCount', (count: number) => {
          console.log('Jogadores conectados:', count);
          setPlayerCount(count);
        });
        
        // Limpar ao desmontar
        return () => {
          socket.off('playerCount');
          socket.disconnect();
        };
      } catch (error) {
        console.error('Erro ao conectar ao socket:', error);
      }
    };
    
    // Iniciar conexão com o socket
    const cleanupSocket = connectToSocket();
    
    // Limpar ao desmontar
    return () => {
      cleanupSocket.then(cleanup => cleanup && cleanup());
    };
  }, [session, status]);

  // Adicionar um efeito para carregar transações quando a aba for selecionada
  useEffect(() => {
    if (activeTab === 'withdrawals') {
      fetchWithdrawals();
    } else if (activeTab === 'deposits') {
      fetchDeposits();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      setStats(data);
      if (data?.currentRound?.houseProfit !== undefined) {
        setHouseProfit(data.currentRound.houseProfit);
      }
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      setLoading(false);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      setLoadingTransactions(true);
      const response = await fetch('/api/admin/transactions?type=WITHDRAWAL');
      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data);
      }
    } catch (error) {
      console.error('Erro ao buscar saques:', error);
      setErrorMessage('Erro ao carregar saques');
    } finally {
      setLoadingTransactions(false);
    }
  };

  const fetchDeposits = async () => {
    try {
      setLoadingTransactions(true);
      const response = await fetch('/api/admin/transactions?type=DEPOSIT');
      if (response.ok) {
        const data = await response.json();
        setDeposits(data);
      }
    } catch (error) {
      console.error('Erro ao buscar depósitos:', error);
      setErrorMessage('Erro ao carregar depósitos');
    } finally {
      setLoadingTransactions(false);
    }
  };

  const updateWithdrawalStatus = async (transactionId: string, status: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/transactions/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId,
          status
        }),
      });

      if (response.ok) {
        fetchWithdrawals();
        setSuccessMessage('Status do saque atualizado com sucesso');
      } else {
        const error = await response.json();
        setErrorMessage(error.message || 'Erro ao atualizar status');
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      setErrorMessage('Erro ao atualizar status');
    } finally {
      setLoading(false);
    }
  };

  const updateHouseProfit = async () => {
    try {
      setLoading(true);
      setSuccessMessage('');
      setErrorMessage('');
      
      const response = await fetch('/api/rounds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ houseProfit }),
      });

      if (response.ok) {
        setSuccessMessage('Lucro da casa atualizado com sucesso!');
        fetchStats();
      } else {
        const error = await response.json();
        setErrorMessage(error.message || 'Erro ao atualizar lucro da casa');
      }
      setLoading(false);
    } catch (error) {
      console.error('Erro ao atualizar lucro da casa:', error);
      setErrorMessage('Erro ao atualizar lucro da casa');
      setLoading(false);
    }
  };

  const searchUser = async () => {
    if (!userEmail) return;
    
    try {
      setSearchingUser(true);
      setErrorMessage('');
      
      const response = await fetch(`/api/admin/users?email=${encodeURIComponent(userEmail)}`);
      
      if (response.ok) {
        const user = await response.json();
        setFoundUser(user);
      } else {
        const error = await response.json();
        setErrorMessage(error.message || 'Usuário não encontrado');
        setFoundUser(null);
      }
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      setErrorMessage('Erro ao buscar usuário');
      setFoundUser(null);
    } finally {
      setSearchingUser(false);
    }
  };

  const rechargeUserBalance = async () => {
    if (!foundUser || rechargeAmount <= 0) return;
    
    try {
      setLoading(true);
      setSuccessMessage('');
      setErrorMessage('');
      
      const response = await fetch('/api/admin/recharge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: foundUser.id,
          amount: rechargeAmount
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setFoundUser(updatedUser);
        setSuccessMessage(`Saldo adicionado com sucesso! Novo saldo: R$ ${updatedUser.balance.toFixed(2)}`);
      } else {
        const error = await response.json();
        setErrorMessage(error.message || 'Erro ao adicionar saldo');
      }
    } catch (error) {
      console.error('Erro ao adicionar saldo:', error);
      setErrorMessage('Erro ao adicionar saldo');
    } finally {
      setLoading(false);
    }
  };

  // Função para abrir o modal de detalhes
  const openTransactionDetails = (transaction: any) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-2xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#1a86c7] to-[#3bc37a] bg-clip-text text-transparent">Painel Administrativo</h1>
          <div className="text-sm">
            Logado como: <span className="text-[#3bc37a]">{session?.user?.email}</span>
          </div>
        </div>

        {/* Navegação por tabs */}
        <div className="flex border-b border-gray-800 mb-8">
          <button
            className={`px-4 py-2 ${activeTab === 'stats' ? 'text-[#3bc37a] border-b-2 border-[#3bc37a]' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveTab('stats')}
          >
            Estatísticas
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'recharge' ? 'text-[#3bc37a] border-b-2 border-[#3bc37a]' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveTab('recharge')}
          >
            Recarga de Saldo
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'house-profit' ? 'text-[#3bc37a] border-b-2 border-[#3bc37a]' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveTab('house-profit')}
          >
            Lucro da Casa
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'withdrawals' ? 'text-[#3bc37a] border-b-2 border-[#3bc37a]' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveTab('withdrawals')}
          >
            Saques
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'deposits' ? 'text-[#3bc37a] border-b-2 border-[#3bc37a]' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveTab('deposits')}
          >
            Depósitos
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'chat' ? 'text-[#3bc37a] border-b-2 border-[#3bc37a]' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveTab('chat')}
          >
            Chat
          </button>
        </div>

        {/* Mensagens de sucesso ou erro */}
        {successMessage && (
          <div className="bg-[#3bc37a] bg-opacity-20 border border-[#3bc37a] text-[#3bc37a] px-4 py-2 rounded-lg mb-4">
            {successMessage}
          </div>
        )}
        
        {errorMessage && (
          <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-300 px-4 py-2 rounded-lg mb-4">
            {errorMessage}
          </div>
        )}

        {/* Conteúdo da aba Estatísticas */}
        {activeTab === 'stats' && stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-2">Total de Apostas</h2>
                <p className="text-3xl font-bold text-green-500">
                  {stats.totalBets}
                </p>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-2">Valor Total Apostado</h2>
                <p className="text-3xl font-bold text-green-500">
                  R$ {stats.totalAmount?.toFixed(2) || '0.00'}
                </p>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-2">Lucro Total da Casa</h2>
                <p className="text-3xl font-bold text-green-500">
                  R$ {stats.houseProfit?.toFixed(2) || '0.00'}
                </p>
              </div>
              
              <div className="bg-gradient-to-r from-[#1a86c7] to-[#3bc37a] bg-opacity-20 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-2">Jogadores Online</h2>
                <div className="flex items-center">
                  <p className="text-3xl font-bold text-white">
                    {playerCount}
                  </p>
                  <div className="ml-3 flex items-center">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="ml-2 text-sm text-gray-300">ao vivo</span>
                  </div>
                </div>
              </div>
            </div>

            {stats.currentRound && (
              <div className="bg-gray-800 p-6 rounded-lg mb-8">
                <h2 className="text-xl font-semibold mb-4">Rodada Atual</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400">ID da Rodada</p>
                    <p className="text-lg">{stats.currentRound.id}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Resultado Atual</p>
                    <p className="text-lg">{stats.currentRound.result?.toFixed(2) || 'Não definido'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Término Previsto</p>
                    <p className="text-lg">
                      {stats.currentRound.endTime ? new Date(stats.currentRound.endTime).toLocaleString() : 'Não definido'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Lucro da Casa na Rodada</p>
                    <p className="text-lg">R$ {stats.currentRound.houseProfit?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Conteúdo da aba Recarga de Saldo */}
        {activeTab === 'recharge' && (
          <div className="bg-gray-800 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">Adicionar Saldo a Usuário</h2>
            
            <div className="mb-6">
              <div className="flex items-end gap-2 mb-4">
                <div className="flex-grow">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">
                    Email do Usuário
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <button
                  onClick={searchUser}
                  disabled={!userEmail || searchingUser}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white disabled:bg-gray-600"
                >
                  {searchingUser ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
              
              {foundUser && (
                <div className="bg-gray-700 p-4 rounded mb-4">
                  <h3 className="font-semibold mb-2">Usuário Encontrado</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-400">Nome:</span> {foundUser.name}
                    </div>
                    <div>
                      <span className="text-gray-400">Email:</span> {foundUser.email}
                    </div>
                    <div>
                      <span className="text-gray-400">ID:</span> {foundUser.id}
                    </div>
                    <div>
                      <span className="text-gray-400">Saldo Atual:</span> <span className="text-green-400">R$ {foundUser.balance.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-400 mb-1">
                      Valor a Adicionar (R$)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        id="amount"
                        value={rechargeAmount}
                        onChange={(e) => setRechargeAmount(Number(e.target.value))}
                        min="1"
                        step="1"
                        className="w-40 bg-gray-800 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <button
                        onClick={rechargeUserBalance}
                        disabled={rechargeAmount <= 0 || loading}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white disabled:bg-gray-600"
                      >
                        Adicionar Saldo
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conteúdo da aba Lucro da Casa */}
        {activeTab === 'house-profit' && stats && (
          <div className="bg-gray-800 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">Configuração de Lucro da Casa</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg mb-2">Lucro Atual da Casa</h3>
                <p className="text-3xl font-bold text-green-500 mb-4">
                  R$ {stats.houseProfit?.toFixed(2) || '0.00'}
                </p>
                <p className="text-sm text-gray-400">
                  Este é o lucro total acumulado pela casa em todas as rodadas.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg mb-2">Lucro da Rodada Atual</h3>
                <div className="flex flex-col space-y-4">
                  <div>
                    <label htmlFor="houseProfit" className="block text-sm font-medium text-gray-400 mb-1">
                      Valor do Lucro da Casa (%)
                    </label>
                    <input
                      type="number"
                      id="houseProfit"
                      value={houseProfit}
                      onChange={(e) => setHouseProfit(Number(e.target.value))}
                      min="0"
                      max="100"
                      step="1"
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <button
                    onClick={updateHouseProfit}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
                  >
                    Atualizar Lucro da Rodada
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-700 p-4 rounded">
              <h3 className="font-medium text-yellow-400 mb-2">Como funciona o lucro da casa?</h3>
              <p className="text-sm mb-2">
                O lucro da casa é uma porcentagem que determina a vantagem da casa sobre as apostas.
                Um valor maior significa que a casa tem mais chances de ganhar, enquanto um valor
                menor torna o jogo mais equilibrado para os jogadores.
              </p>
              <p className="text-sm">
                Recomendação: Mantenha o valor entre 1% e 10% para um jogo justo e lucrativo.
              </p>
            </div>
          </div>
        )}

        {/* Conteúdo da aba Saques */}
        {activeTab === 'withdrawals' && (
          <div className="bg-gray-800 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">Gerenciamento de Saques</h2>
            
            {loadingTransactions ? (
              <div className="text-center py-8">Carregando saques...</div>
            ) : withdrawals.length === 0 ? (
              <div className="text-center py-8 text-gray-400">Nenhum saque encontrado</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-4 py-3 text-left text-sm text-gray-400">ID</th>
                      <th className="px-4 py-3 text-left text-sm text-gray-400">Usuário</th>
                      <th className="px-4 py-3 text-left text-sm text-gray-400">Data</th>
                      <th className="px-4 py-3 text-left text-sm text-gray-400">Método</th>
                      <th className="px-4 py-3 text-left text-sm text-gray-400">Chave/Dados</th>
                      <th className="px-4 py-3 text-right text-sm text-gray-400">Valor</th>
                      <th className="px-4 py-3 text-center text-sm text-gray-400">Status</th>
                      <th className="px-4 py-3 text-right text-sm text-gray-400">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((withdrawal) => {
                      const { pixKey, method } = getTransactionDetails(withdrawal);
                      return (
                        <tr key={withdrawal.id} className="border-b border-gray-700 hover:bg-gray-700 cursor-pointer" onClick={() => openTransactionDetails(withdrawal)}>
                          <td className="px-4 py-3 text-sm">{withdrawal.id.substring(0, 8)}...</td>
                          <td className="px-4 py-3 text-sm">{withdrawal.user?.email || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm">{new Date(withdrawal.createdAt).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm">{method}</td>
                          <td className="px-4 py-3 text-sm">{pixKey}</td>
                          <td className="px-4 py-3 text-sm text-red-400 text-right">R$ {withdrawal.amount.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span 
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                withdrawal.status === 'COMPLETED' 
                                  ? 'bg-green-100 text-green-800' 
                                  : withdrawal.status === 'REJECTED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {withdrawal.status === 'COMPLETED' 
                                ? 'Concluído' 
                                : withdrawal.status === 'REJECTED'
                                ? 'Rejeitado'
                                : 'Pendente'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right" onClick={(e) => e.stopPropagation()}>
                            {withdrawal.status === 'PENDING' && (
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => updateWithdrawalStatus(withdrawal.id, 'COMPLETED')}
                                  className="px-2 py-1 bg-green-600 text-xs rounded hover:bg-green-700"
                                  disabled={loading}
                                >
                                  Aprovar
                                </button>
                                <button
                                  onClick={() => updateWithdrawalStatus(withdrawal.id, 'REJECTED')}
                                  className="px-2 py-1 bg-red-600 text-xs rounded hover:bg-red-700"
                                  disabled={loading}
                                >
                                  Rejeitar
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Conteúdo da aba Depósitos */}
        {activeTab === 'deposits' && (
          <div className="bg-gray-800 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">Gerenciamento de Depósitos</h2>
            
            {loadingTransactions ? (
              <div className="text-center py-8">Carregando depósitos...</div>
            ) : deposits.length === 0 ? (
              <div className="text-center py-8 text-gray-400">Nenhum depósito encontrado</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-4 py-3 text-left text-sm text-gray-400">ID</th>
                      <th className="px-4 py-3 text-left text-sm text-gray-400">Usuário</th>
                      <th className="px-4 py-3 text-left text-sm text-gray-400">Data</th>
                      <th className="px-4 py-3 text-right text-sm text-gray-400">Valor</th>
                      <th className="px-4 py-3 text-center text-sm text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.map((deposit) => (
                      <tr key={deposit.id} className="border-b border-gray-700">
                        <td className="px-4 py-3 text-sm">{deposit.id.substring(0, 8)}...</td>
                        <td className="px-4 py-3 text-sm">{deposit.user?.email || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">{new Date(deposit.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-green-400 text-right">R$ {deposit.amount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Concluído
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Conteúdo da aba 'chat' */}
        {activeTab === 'chat' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Chat de Suporte</h2>
            <div className="bg-[#121212] p-6 rounded-lg shadow-xl">
              <ChatSupport 
                isAdmin={true} 
                selectedUserId={selectedChatUser}
                onUserChange={setSelectedChatUser}
                title="Painel de Suporte"
                height="600px"
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Modal de Detalhes da Transação */}
      <div
        className={`fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70 transition-all duration-200 ${showDetailsModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setShowDetailsModal(false)}
      >
        <div className="bg-gray-800 rounded-lg shadow-xl max-w-lg w-full border border-gray-700" onClick={e => e.stopPropagation()}>
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-medium">Detalhes do Saque</h3>
            <button 
              onClick={() => setShowDetailsModal(false)} 
              className="text-gray-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="p-6">
            {selectedTransaction && (
              <div className="space-y-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-3">Informações Gerais</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm text-gray-400">ID da Transação</p>
                      <p className="font-medium break-all">{selectedTransaction.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Data/Hora</p>
                      <p className="font-medium">{new Date(selectedTransaction.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Valor</p>
                      <p className="font-medium text-red-400">R$ {selectedTransaction.amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Status</p>
                      <p className={`font-medium ${
                        selectedTransaction.status === 'COMPLETED' 
                          ? 'text-green-400' 
                          : selectedTransaction.status === 'REJECTED'
                          ? 'text-red-400'
                          : 'text-yellow-400'
                      }`}>
                        {selectedTransaction.status === 'COMPLETED' 
                          ? 'Concluído' 
                          : selectedTransaction.status === 'REJECTED'
                          ? 'Rejeitado'
                          : 'Pendente'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-3">Dados do Usuário</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <p className="text-sm text-gray-400">Nome</p>
                      <p className="font-medium">{selectedTransaction.user?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Email</p>
                      <p className="font-medium">{selectedTransaction.user?.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-3">Dados do Saque</h3>
                  {(() => {
                    const { pixKey, method } = getTransactionDetails(selectedTransaction);
                    return (
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <p className="text-sm text-gray-400">Método</p>
                          <p className="font-medium">{method}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Chave PIX / Dados Bancários</p>
                          <p className="font-medium break-all">{pixKey}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                {selectedTransaction.status === 'PENDING' && (
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={() => {
                        updateWithdrawalStatus(selectedTransaction.id, 'REJECTED');
                        setShowDetailsModal(false);
                      }}
                      className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
                      disabled={loading}
                    >
                      Rejeitar Saque
                    </button>
                    <button
                      onClick={() => {
                        updateWithdrawalStatus(selectedTransaction.id, 'COMPLETED');
                        setShowDetailsModal(false);
                      }}
                      className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
                      disabled={loading}
                    >
                      Aprovar Saque
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
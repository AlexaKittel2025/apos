import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

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
  
  // Tabs de navegação
  const [activeTab, setActiveTab] = useState('stats'); // 'stats', 'recharge', 'house-profit'

  useEffect(() => {
    if (status === 'loading') return;

    if (!session || session.user.role !== 'ADMIN') {
      router.push('/');
      return;
    }

    fetchStats();
  }, [session, status]);

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

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-2xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Painel Administrativo</h1>
          <div className="text-sm">
            Logado como: <span className="text-green-400">{session?.user?.email}</span>
          </div>
        </div>

        {/* Navegação por tabs */}
        <div className="flex border-b border-gray-700 mb-8">
          <button
            className={`px-4 py-2 ${activeTab === 'stats' ? 'text-green-500 border-b-2 border-green-500' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveTab('stats')}
          >
            Estatísticas
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'recharge' ? 'text-green-500 border-b-2 border-green-500' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveTab('recharge')}
          >
            Recarga de Saldo
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'house-profit' ? 'text-green-500 border-b-2 border-green-500' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveTab('house-profit')}
          >
            Lucro da Casa
          </button>
        </div>

        {/* Mensagens de sucesso ou erro */}
        {successMessage && (
          <div className="bg-green-500 bg-opacity-20 border border-green-500 text-green-300 px-4 py-2 rounded-lg mb-4">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
      </div>
    </div>
  );
} 
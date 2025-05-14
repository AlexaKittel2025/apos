'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/progress';
import { useBalance } from '@/lib/BalanceContext';

type PlayerLevel = {
  id: string;
  level: number;
  name: string;
  requiredXP: number;
  bonusMultiplier: number;
  loyaltyMultiplier: number;
  dailyBonus: number;
  description?: string | null;
  icon?: string | null;
};

type Reward = {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  type: string;
  value: number;
  icon?: string | null;
  isActive: boolean;
  minimumLevel: number;
};

type RedeemedReward = {
  id: string;
  name: string;
  type: string;
  value: number;
  createdAt: string;
};

type LevelData = {
  user: {
    id: string;
    name: string;
    level: number;
    xp: number;
    loyaltyPoints: number;
    totalPlayed: number;
    daysActive: number;
    lastActive: string;
  };
  currentLevel: PlayerLevel;
  nextLevel: PlayerLevel | null;
  progress: number;
  xpRequired: number;
  xpCurrent: number;
  availableRewards: Reward[];
  redeemedRewards: RedeemedReward[];
};

export default function LevelPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { refreshBalance } = useBalance();
  
  const [isLoading, setIsLoading] = useState(true);
  const [levelData, setLevelData] = useState<LevelData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redemptionStatus, setRedemptionStatus] = useState<{ 
    loading: boolean; 
    success: boolean; 
    message: string | null;
    rewardId: string | null;
  }>({
    loading: false,
    success: false,
    message: null,
    rewardId: null
  });

  useEffect(() => {
    // Redirecionar se não estiver autenticado
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
    
    // Carregar dados de nível
    if (status === 'authenticated' && session) {
      fetchLevelData();
    }
  }, [status, session, router]);

  const fetchLevelData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/level');
      
      if (!response.ok) {
        throw new Error('Falha ao carregar dados de nível');
      }
      
      const data = await response.json();
      setLevelData(data);
    } catch (err) {
      console.error('Erro ao carregar dados de nível:', err);
      setError('Não foi possível carregar seus dados de nível. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  const redeemReward = async (rewardId: string) => {
    try {
      setRedemptionStatus({
        loading: true,
        success: false,
        message: null,
        rewardId
      });
      
      const response = await fetch('/api/user/rewards/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rewardId })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao resgatar recompensa');
      }
      
      // Atualizar os dados após resgate bem-sucedido
      refreshBalance();
      fetchLevelData();
      
      setRedemptionStatus({
        loading: false,
        success: true,
        message: data.message,
        rewardId: null
      });
      
      // Limpar mensagem após alguns segundos
      setTimeout(() => {
        setRedemptionStatus(prev => ({
          ...prev,
          message: null
        }));
      }, 5000);
    } catch (err: any) {
      console.error('Erro ao resgatar recompensa:', err);
      setRedemptionStatus({
        loading: false,
        success: false,
        message: err.message || 'Falha ao resgatar recompensa',
        rewardId: null
      });
    }
  };

  // Renderizar badges para benefícios de nível
  const renderLevelBenefits = (level: PlayerLevel) => {
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {level.bonusMultiplier > 0 && (
          <div className="px-3 py-1 rounded-full bg-[#1a86c7] bg-opacity-20 border border-[#1a86c7] text-sm">
            +{(level.bonusMultiplier * 100).toFixed(0)}% Multiplicador
          </div>
        )}
        
        {level.loyaltyMultiplier > 1 && (
          <div className="px-3 py-1 rounded-full bg-[#3bc37a] bg-opacity-20 border border-[#3bc37a] text-sm">
            {level.loyaltyMultiplier.toFixed(1)}x Pontos
          </div>
        )}
        
        {level.dailyBonus > 0 && (
          <div className="px-3 py-1 rounded-full bg-[#d97706] bg-opacity-20 border border-[#d97706] text-sm">
            +{level.dailyBonus} Diário
          </div>
        )}
      </div>
    );
  };

  // Renderizar um ícone para o tipo de recompensa
  const getRewardTypeIcon = (type: string) => {
    switch (type) {
      case 'FREE_BET':
        return '🎮';
      case 'MULTIPLIER_BOOST':
        return '⚡';
      case 'CASH_BONUS':
        return '💰';
      case 'DAILY_LIMIT_BOOST':
        return '📈';
      default:
        return '🎁';
    }
  };

  // Formatar tipo de recompensa para exibição
  const formatRewardType = (type: string) => {
    switch (type) {
      case 'FREE_BET':
        return 'Aposta Grátis';
      case 'MULTIPLIER_BOOST':
        return 'Multiplicador';
      case 'CASH_BONUS':
        return 'Bônus em Dinheiro';
      case 'DAILY_LIMIT_BOOST':
        return 'Aumento de Limite';
      default:
        return type;
    }
  };
  
  // Formatar valor da recompensa para exibição
  const formatRewardValue = (type: string, value: number) => {
    switch (type) {
      case 'FREE_BET':
      case 'CASH_BONUS':
        return `R$ ${value.toFixed(2)}`;
      case 'MULTIPLIER_BOOST':
      case 'DAILY_LIMIT_BOOST':
        return `+${(value * 100).toFixed(0)}%`;
      default:
        return value.toString();
    }
  };

  // Renderizar data formatada
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded w-1/4"></div>
          <div className="h-32 bg-gray-300 rounded"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-500">
              <p>{error}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => fetchLevelData()}
              >
                Tentar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!levelData) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p>Não foi possível carregar seus dados de nível.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => fetchLevelData()}
              >
                Tentar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { user, currentLevel, nextLevel, progress, xpRequired, xpCurrent, availableRewards, redeemedRewards } = levelData;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Seu Nível e Recompensas</h1>
      
      {/* Card do Nível */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>
            Nível {user.level}: {currentLevel.name}
          </CardTitle>
          <CardDescription>
            XP: {user.xp} pontos • Jogou: {user.totalPlayed} rodadas • Ativo por: {user.daysActive} dias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Informações do nível atual */}
            <div className="flex-1">
              <div className="p-4 bg-[#1e1e1e] rounded-lg">
                <div className="flex items-center gap-4">
                  {currentLevel.icon && (
                    <div className="w-16 h-16 rounded-full bg-[#2a2a2a] flex items-center justify-center overflow-hidden">
                      <img 
                        src={currentLevel.icon} 
                        alt={`Nível ${currentLevel.level}`} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/imagens/levels/default.png';
                        }}
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-semibold">{currentLevel.name}</h3>
                    <p className="text-sm text-gray-400">{currentLevel.description}</p>
                  </div>
                </div>
                
                {renderLevelBenefits(currentLevel)}
              </div>
            </div>
            
            {/* Progresso para o próximo nível */}
            <div className="flex-1">
              {nextLevel ? (
                <div className="p-4 bg-[#1e1e1e] rounded-lg">
                  <div className="mb-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Progresso para Nível {nextLevel.level}</span>
                      <span className="text-sm font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-400">{xpCurrent} / {xpRequired} XP</span>
                      <span className="text-xs text-gray-400">Faltam: {xpRequired - xpCurrent} XP</span>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Próximo Nível: {nextLevel.name}</h4>
                    <p className="text-xs text-gray-400 mb-2">{nextLevel.description}</p>
                    
                    {renderLevelBenefits(nextLevel)}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[#1e1e1e] rounded-lg flex items-center justify-center h-full">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold mb-2">Nível Máximo Atingido!</h3>
                    <p className="text-sm text-gray-400">
                      Parabéns! Você alcançou o nível máximo.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Pontos de Fidelidade */}
      <div className="mb-6 p-4 bg-gradient-to-r from-[#1a86c7] to-[#3bc37a] rounded-lg text-white">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Seus Pontos de Fidelidade</h2>
            <p className="text-sm opacity-90">Use seus pontos para resgatar recompensas especiais</p>
          </div>
          <div className="text-3xl font-bold mt-2 md:mt-0">
            {user.loyaltyPoints} pontos
          </div>
        </div>
      </div>
      
      {/* Recompensas Disponíveis */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Recompensas Disponíveis</CardTitle>
          <CardDescription>Use seus pontos para resgatar estas recompensas</CardDescription>
        </CardHeader>
        <CardContent>
          {availableRewards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableRewards.map((reward) => (
                <div 
                  key={reward.id} 
                  className={`p-4 border rounded-lg ${
                    user.loyaltyPoints >= reward.pointsCost
                      ? 'border-[#3bc37a] bg-[#3bc37a] bg-opacity-5'
                      : 'border-gray-700 bg-[#1e1e1e]'
                  }`}
                >
                  <div className="flex gap-3 items-start mb-2">
                    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#2a2a2a] text-xl">
                      {getRewardTypeIcon(reward.type)}
                    </div>
                    <div>
                      <h3 className="font-medium">{reward.name}</h3>
                      <p className="text-xs text-gray-400">{formatRewardType(reward.type)}: {formatRewardValue(reward.type, reward.value)}</p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-300 mb-4">{reward.description}</p>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">
                      {reward.pointsCost} pontos
                    </div>
                    <Button
                      variant={user.loyaltyPoints >= reward.pointsCost ? "primary" : "secondary"}
                      size="sm"
                      disabled={
                        user.loyaltyPoints < reward.pointsCost || 
                        redemptionStatus.loading ||
                        redemptionStatus.rewardId === reward.id
                      }
                      onClick={() => redeemReward(reward.id)}
                    >
                      {redemptionStatus.loading && redemptionStatus.rewardId === reward.id
                        ? 'Resgatando...'
                        : 'Resgatar'}
                    </Button>
                  </div>
                  
                  {user.loyaltyPoints < reward.pointsCost && (
                    <div className="mt-2 text-xs text-gray-400">
                      Você precisa de mais {reward.pointsCost - user.loyaltyPoints} pontos
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">Nenhuma recompensa disponível para seu nível atual.</p>
              <p className="text-sm text-gray-500 mt-2">Continue jogando para subir de nível e desbloquear recompensas!</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Mensagem de Status da Redenção */}
      {redemptionStatus.message && (
        <div className={`p-4 rounded-lg mb-6 ${
          redemptionStatus.success ? 'bg-green-900 bg-opacity-20 border border-green-700' : 'bg-red-900 bg-opacity-20 border border-red-700'
        }`}>
          <p className={redemptionStatus.success ? 'text-green-400' : 'text-red-400'}>
            {redemptionStatus.message}
          </p>
        </div>
      )}
      
      {/* Histórico de Recompensas Resgatadas */}
      {redeemedRewards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Resgates</CardTitle>
            <CardDescription>Recompensas que você já resgatou</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 px-4">Recompensa</th>
                    <th className="text-left py-2 px-4">Tipo</th>
                    <th className="text-left py-2 px-4">Valor</th>
                    <th className="text-left py-2 px-4">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {redeemedRewards.map((reward) => (
                    <tr key={reward.id} className="border-b border-gray-800">
                      <td className="py-2 px-4">{reward.name}</td>
                      <td className="py-2 px-4">{formatRewardType(reward.type)}</td>
                      <td className="py-2 px-4">{formatRewardValue(reward.type, reward.value)}</td>
                      <td className="py-2 px-4">{formatDate(reward.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 
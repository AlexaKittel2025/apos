'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type LevelCardProps = {
  userId?: string;
  className?: string;
  compact?: boolean;
};

const LevelCard: React.FC<LevelCardProps> = ({ userId, className = '', compact = false }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [levelData, setLevelData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
        setError('Não foi possível carregar seus dados de nível');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLevelData();
  }, [userId]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-3">
          <div className="flex h-16 items-center justify-center">
            <div className="animate-pulse h-4 w-32 bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !levelData) {
    return (
      <Card className={className}>
        <CardContent className="p-3">
          <div className="text-center text-sm text-gray-400">{error || 'Erro ao carregar dados'}</div>
        </CardContent>
      </Card>
    );
  }

  const { user, currentLevel, nextLevel, progress } = levelData;

  // Renderizar versão compacta para uso em sidebar/small containers
  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="p-3">
          <div className="flex items-center space-x-3">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#1a86c7] to-[#3bc37a] flex items-center justify-center text-white font-bold">
                {user.level}
              </div>
              {currentLevel.bonusMultiplier > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-[8px] font-bold text-black">
                  +{(currentLevel.bonusMultiplier * 100).toFixed(0)}%
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-medium">{currentLevel.name}</p>
                <p className="text-xs text-gray-400">{user.loyaltyPoints} pts</p>
              </div>
              {nextLevel && (
                <div className="w-full">
                  <Progress value={progress} className="h-1 w-full" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Versão completa
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle>
          Nível {user.level} • {currentLevel.name}
        </CardTitle>
        <CardDescription>
          {user.loyaltyPoints} pontos de fidelidade
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          {nextLevel ? (
            <>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Progresso para Nível {nextLevel.level}</span>
                <span className="text-xs text-gray-400">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </>
          ) : (
            <div className="text-sm text-center text-[#3bc37a]">
              Parabéns! Você atingiu o nível máximo.
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {currentLevel.bonusMultiplier > 0 && (
            <div className="px-2 py-1 rounded-full bg-[#1a86c7] bg-opacity-20 border border-[#1a86c7] text-xs">
              +{(currentLevel.bonusMultiplier * 100).toFixed(0)}% Multiplicador
            </div>
          )}
          
          {currentLevel.loyaltyMultiplier > 1 && (
            <div className="px-2 py-1 rounded-full bg-[#3bc37a] bg-opacity-20 border border-[#3bc37a] text-xs">
              {currentLevel.loyaltyMultiplier.toFixed(1)}x Pontos
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Link 
          href="/profile/level" 
          className="text-xs text-[#1a86c7] hover:underline w-full text-center"
        >
          Ver Recompensas Disponíveis →
        </Link>
      </CardFooter>
    </Card>
  );
};

export default LevelCard; 
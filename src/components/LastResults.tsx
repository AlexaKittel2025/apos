import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';

type LastResultsProps = {
  className?: string;
};

type RoundResult = {
  id: string;
  result: number;
  displayResult: number;
  timestamp: string;
  userBet: {
    amount: number;
    type: 'ABOVE' | 'BELOW';
    won: boolean;
    profit: number;
  } | null;
};

const LastResults: React.FC<LastResultsProps> = ({ className }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [trends, setTrends] = useState<{[key: string]: number}>({});

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/rounds/last-results');
        
        if (!response.ok) {
          throw new Error('Falha ao buscar os resultados');
        }
        
        const data = await response.json();
        setResults(data.results);
        
        // Calcular tendências (sequências consecutivas)
        if (data.results.length > 0) {
          const trendMap: {[key: string]: number} = {};
          let currentType = data.results[0].result < 50 ? 'ABOVE' : 'BELOW';
          let count = 1;
          
          // Começar do segundo resultado, comparando com o anterior
          for (let i = 1; i < data.results.length; i++) {
            const resultType = data.results[i].result < 50 ? 'ABOVE' : 'BELOW';
            
            if (resultType === currentType) {
              count++;
            } else {
              // Resetar contagem quando o tipo muda
              currentType = resultType;
              count = 1;
            }
            
            trendMap[data.results[i].id] = count;
          }
          
          // Adicionar o primeiro resultado também
          trendMap[data.results[0].id] = 1;
          
          setTrends(trendMap);
        }
      } catch (err) {
        console.error('Erro ao carregar resultados:', err);
        setError('Não foi possível carregar os últimos resultados');
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
    
    // Configurar intervalo para atualizar resultados
    const intervalId = setInterval(fetchResults, 30000); // Atualiza a cada 30 segundos
    
    return () => clearInterval(intervalId);
  }, []);

  // Formatar data/hora
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  // Renderizar indicador de tendência
  const renderTrendIndicator = (roundId: string, isAbove: boolean) => {
    const count = trends[roundId] || 0;
    
    if (count >= 3) {
      return (
        <div 
          className={`absolute ${isAbove ? 'top-0' : 'bottom-0'} right-0 w-4 h-4 flex items-center justify-center 
                    text-[8px] font-bold rounded-full bg-opacity-80 
                    ${isAbove ? 'bg-[#3bc37a]' : 'bg-[#1a86c7]'}`}
          title={`${count}× consecutivos`}
        >
          {count}
        </div>
      );
    }
    
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle>Últimos Resultados</CardTitle>
        <CardDescription>Histórico das últimas rodadas</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-20">
            <div className="animate-pulse">Carregando resultados...</div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-2">{error}</div>
        ) : results.length === 0 ? (
          <div className="text-center text-gray-500 py-2">Nenhum resultado disponível</div>
        ) : (
          <>
            {/* Barra de estatísticas rápidas */}
            <div className="flex justify-between items-center mb-2 px-1 pb-2 border-b border-gray-800">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-[#3bc37a] mr-1"></div>
                <span className="text-xs">
                  <span className="text-[#3bc37a] font-medium mr-1">
                    {results.filter(r => r.result < 50).length}
                  </span>
                  <span className="text-xs text-gray-400">ACIMA</span>
                </span>
              </div>
              <div className="text-xs text-gray-400 hidden sm:block">
                {results.length} rodadas
              </div>
              <div className="flex items-center">
                <span className="text-xs">
                  <span className="text-gray-400 mr-1">ABAIXO</span>
                  <span className="text-[#1a86c7] font-medium">
                    {results.filter(r => r.result >= 50).length}
                  </span>
                </span>
                <div className="w-2 h-2 rounded-full bg-[#1a86c7] ml-1"></div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pr-1">
              {results.map((round) => (
                <div 
                  key={round.id} 
                  className="p-2 rounded-md bg-gray-800 bg-opacity-30 flex flex-col hover:bg-opacity-50 transition-all relative"
                >
                  {renderTrendIndicator(round.id, round.result < 50)}
                  
                  <div className="flex items-center justify-center mb-1">
                    <div className={`w-2 h-2 rounded-full mr-1 ${round.result < 50 ? 'bg-[#3bc37a]' : 'bg-[#1a86c7]'}`} />
                    <span className={`text-sm font-medium ${round.result < 50 ? 'text-[#3bc37a]' : 'text-[#1a86c7]'}`}>
                      {round.result < 50 ? 'ACIMA' : 'ABAIXO'}
                    </span>
                  </div>
                  <div className="text-xs text-center font-medium">
                    {round.displayResult.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-400 text-center mt-1">
                    {formatDateTime(round.timestamp)}
                  </div>
                  
                  {round.userBet && (
                    <div className="mt-1 text-center border-t border-gray-700 pt-1">
                      <span className={`text-xs ${round.userBet.won ? 'text-[#3bc37a]' : 'text-red-500'}`}>
                        {round.userBet.won 
                          ? `+R$ ${round.userBet.profit.toFixed(2)}` 
                          : `-R$ ${round.userBet.amount.toFixed(2)}`}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default LastResults; 
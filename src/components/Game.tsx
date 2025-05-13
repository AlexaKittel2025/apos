import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import { useBalance } from '@/lib/BalanceContext';

// *** SOLUÇÃO: Implementar Singleton para Socket.IO ***
// Variável global para armazenar a única instância do socket
let globalSocketInstance: Socket | null = null;
// Flag para controlar a inicialização
let isInitializingSocket = false;

const QUICK_BETS = [5, 10, 20, 50, 100];
const BETTING_DURATION = 10000; // 10 segundos para apostas
const ROUND_DURATION = 30000; // 30 segundos para a rodada
const WIN_MULTIPLIER = 1.8; // Multiplicador para ganhos (1.8x o valor apostado)

// Interfaces para tipagem
interface Bet {
  id: string;
  playerId: string;
  amount: number;
  type: 'ABOVE' | 'BELOW';
  timestamp: number;
}

interface ChatMessage {
  playerId: string;
  message: string;
  timestamp: number;
}

const Game: React.FC = () => {
  const { data: session } = useSession();
  const { refreshBalance, userBalance, updateBalance } = useBalance();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [timeLeft, setTimeLeft] = useState(BETTING_DURATION);
  const [currentLine, setCurrentLine] = useState(50);
  const [selectedBet, setSelectedBet] = useState<number | null>(null);
  const [betType, setBetType] = useState<'ABOVE' | 'BELOW' | null>(null);
  const [isBetting, setIsBetting] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [roundStatus, setRoundStatus] = useState<'betting' | 'running' | 'finished'>('betting');
  const [roundId, setRoundId] = useState<string | null>(null);
  const [socketInitialized, setSocketInitialized] = useState(false);
  const [playerCount, setPlayerCount] = useState(1);
  const [bets, setBets] = useState<Bet[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const [winType, setWinType] = useState<'ABOVE' | 'BELOW' | null>(null);
  const [myBets, setMyBets] = useState<Bet[]>([]);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [displayResult, setDisplayResult] = useState<number | null>(null);

  // Rolar o chat para o final quando novas mensagens chegarem
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Inicializa o servidor Socket.IO (apenas uma vez por aplicação)
  const initializeSocketServer = useCallback(async () => {
    if (isInitializingSocket) return;
    
    try {
      isInitializingSocket = true;
      console.log('Inicializando servidor Socket.IO...');
      await fetch('/api/socket');
      setSocketInitialized(true);
      isInitializingSocket = false;
    } catch (error) {
      console.error('Erro ao inicializar Socket.IO:', error);
      isInitializingSocket = false;
    }
  }, []);

  // Função que obtém ou cria a instância global do socket
  const getOrCreateSocketInstance = useCallback(() => {
    // Se já temos uma instância global válida e conectada, use-a
    if (globalSocketInstance && globalSocketInstance.connected) {
      console.log('Reutilizando instância global do socket:', globalSocketInstance.id);
      return globalSocketInstance;
    }
    
    // Se a instância existe mas não está conectada, descartá-la
    if (globalSocketInstance) {
      console.log('Instância global do socket existe mas não está conectada, criando nova...');
      globalSocketInstance.disconnect();
      globalSocketInstance = null;
    }
    
    // Criar nova instância
    console.log('Criando nova instância global do socket...');
    const newSocket = io({
      reconnectionAttempts: 10,      // Aumentar número de tentativas de reconexão
      reconnectionDelay: 3000,       // Esperar mais tempo entre reconexões (ms)
      reconnectionDelayMax: 10000,   // Aumentar tempo máximo entre tentativas (ms)
      timeout: 30000,                // Aumentar timeout da conexão (ms)
      transports: ['websocket'],     // Usar apenas WebSocket para evitar polling
      forceNew: false,               // Não forçar criação de nova conexão
      autoConnect: true,             // Conectar automaticamente
      reconnection: true             // Habilitar reconexão automática
    });
    
    // Armazenar globalmente
    globalSocketInstance = newSocket;
    
    return newSocket;
  }, []);

  // Função para configurar os eventos do Socket
  const setupSocketEvents = useCallback((socketClient: Socket) => {
    console.log('Configurando eventos do socket...');
    
    // Limpar todos os listeners existentes para evitar duplicação
    const events = [
      'connect', 'disconnect', 'error', 'connect_error',
      'reconnect_attempt', 'reconnect_error', 'reconnect',
      'lineUpdate', 'timeUpdate', 'gameState',
      'roundStart', 'bettingStart', 'roundEnd',
      'newBet', 'chatMessage', 'playerCount'
    ];
    
    events.forEach(event => {
      socketClient.off(event);
    });
    
    socketClient.on('connect', () => {
      console.log('Conectado ao servidor Socket.IO:', socketClient.id);
    });
    
    socketClient.io.on("reconnect_attempt", (attempt) => {
      console.log(`Tentativa de reconexão #${attempt}`);
    });

    socketClient.io.on("reconnect_error", (error) => {
      console.error('Erro na reconexão:', error);
    });

    socketClient.io.on("reconnect", (attempt) => {
      console.log(`Reconectado após ${attempt} tentativas`);
    });
    
    socketClient.on('connect_error', (error) => {
      console.error('Erro na conexão Socket.IO:', error);
    });

    socketClient.on('lineUpdate', (newLine: number) => {
      setCurrentLine(newLine);
    });

    socketClient.on('timeUpdate', (timeLeft: number) => {
      setTimeLeft(timeLeft);
    });

    socketClient.on('gameState', (state: any) => {
      console.log('Estado do jogo recebido:', state);
      setCurrentLine(state.linePosition);
      setRoundStatus(state.phase);
      setRoundId(state.roundId);
      setTimeLeft(state.timeLeft);
      setBets(state.bets || []);
      setPlayerCount(state.connectedPlayers || 1);
    });

    socketClient.on('roundStart', (data: any) => {
      console.log('Rodada iniciada:', data);
      setRoundStatus('running');
      setTimeLeft(data.timeLeft);
      setBets(data.bets || []);
      setResult(null);
      setWinType(null);
    });

    socketClient.on('bettingStart', (data: any) => {
      console.log('Fase de apostas iniciada:', data);
      setRoundStatus('betting');
      setTimeLeft(data.timeLeft);
      setRoundId(data.roundId);
      setSelectedBet(null);
      setBetType(null);
      setIsBetting(false);
      setResult(null);
      setWinType(null);
      setBets([]);
      setMyBets([]);
      
      // Atualizar o saldo quando uma nova rodada começa
      refreshBalance();
    });

    socketClient.on('roundEnd', (data: any) => {
      console.log('Rodada finalizada:', data);
      setResult(data.result);
      setWinType(data.winType);
      setRoundStatus('finished');
      
      // Usar o valor de exibição se disponível, ou calcular a inversão
      if (data.displayResult !== undefined) {
        setDisplayResult(data.displayResult);
      } else {
        // Fallback: calcular o valor invertido localmente (100 - result)
        setDisplayResult(Math.round(100 - data.result));
      }
      
      // Atualizar o saldo quando uma rodada termina para refletir ganhos/perdas
      refreshBalance();
      
      // Alternativa para atualização rápida: Calcular resultados localmente
      if (session?.user && myBets.length > 0) {
        // Usar o multiplicador recebido do servidor ou o valor padrão
        const multiplier = data.multiplier || WIN_MULTIPLIER;
        console.log(`Usando multiplicador de ganho: ${multiplier}x`);
        
        // Cálculo local do resultado
        const winningBets = myBets.filter(bet => bet.type === data.winType);
        const totalWinnings = winningBets.reduce((sum, bet) => sum + bet.amount * multiplier, 0);
        
        // Atualizar saldo localmente
        if (totalWinnings > 0) {
          console.log(`Ganho total calculado: ${totalWinnings.toFixed(2)}`);
          updateBalance(userBalance + totalWinnings);
        }
      }
    });

    socketClient.on('newBet', (bet: Bet) => {
      console.log('Nova aposta recebida:', bet);
      setBets(prev => [...prev, bet]);
    });

    socketClient.on('chatMessage', (message: ChatMessage) => {
      console.log('Nova mensagem de chat:', message);
      setChatMessages(prev => [...prev, message]);
    });

    socketClient.on('playerCount', (count: number) => {
      console.log('Jogadores conectados:', count);
      setPlayerCount(count);
    });

    socketClient.on('disconnect', () => {
      console.log('Desconectado do servidor Socket.IO');
    });

    socketClient.on('error', (error: any) => {
      console.error('Erro de Socket.IO:', error);
    });
  }, [refreshBalance, session, myBets, userBalance, updateBalance]);

  // Inicializar o socket
  useEffect(() => {
    // Primeiro inicializar o servidor
    initializeSocketServer();
    
    // Limpeza quando o componente é desmontado
    return () => {
      // Não desconectamos globalmente, apenas removemos a referência local
      socketRef.current = null;
      setSocket(null);
    };
  }, [initializeSocketServer]);
  
  // Configurar o socket após o servidor estar inicializado
  useEffect(() => {
    if (!socketInitialized) return;
    
    // Obter ou criar o socket
    const socketInstance = getOrCreateSocketInstance();
    socketRef.current = socketInstance;
    setSocket(socketInstance);
    
    // Configurar eventos
    setupSocketEvents(socketInstance);
    
    console.log('Socket configurado com sucesso.');
  }, [socketInitialized, getOrCreateSocketInstance, setupSocketEvents]);

  // Adicionar uma estratégia de reconexão manual (evento de página)
  const reiniciarSocket = useCallback(() => {
    if (isReconnecting) return; // Evitar múltiplas reconexões simultâneas
    
    console.log('Reiniciando conexão Socket.IO manualmente...');
    setIsReconnecting(true);
    
    // Fechar instância global e forçar reconexão
    if (globalSocketInstance) {
      globalSocketInstance.disconnect();
      globalSocketInstance = null;
    }
    
    // Limpar estado atual
    setSocketInitialized(false);
    socketRef.current = null;
    setSocket(null);
    
    // Reiniciar após um intervalo
    setTimeout(() => {
      initializeSocketServer();
      setIsReconnecting(false);
    }, 3000);
  }, [isReconnecting, initializeSocketServer]);

  // Adicionar detector de fechamento da página para limpeza global
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (globalSocketInstance) {
        console.log('Fechando conexão global no unload da página');
        globalSocketInstance.disconnect();
        globalSocketInstance = null;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Função para fazer apostas
  const placeBet = async () => {
    if (!selectedBet || !betType || !session || roundStatus !== 'betting' || !roundId) return;

    try {
      setIsBetting(true);

      // Fazer a aposta via API (para que seja validada e salva no banco de dados)
      const response = await fetch('/api/bets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: selectedBet,
          type: betType,
          roundId: roundId
        }),
      });

      if (response.ok) {
        // Aposta feita com sucesso
        setIsBetting(false);
        
        // Obter a resposta com o novo saldo
        const betResponse = await response.json();
        
        // Adicionar esta aposta às apostas do jogador atual
        const newBet: Bet = {
          id: `local-${Date.now()}`,
          playerId: session.user.id as string,
          amount: selectedBet,
          type: betType,
          timestamp: Date.now()
        };
        
        setMyBets(prev => [...prev, newBet]);
        
        // Atualizar o saldo diretamente com o valor retornado pela API
        if (betResponse.newBalance !== undefined) {
          updateBalance(betResponse.newBalance);
        } else {
          // Fallback: atualizar com o valor local se a API não retornar o novo saldo
          updateBalance(userBalance - selectedBet);
        }
        
        // Emitir evento para o servidor Socket.IO (para informar outros jogadores)
        if (socketRef.current) {
          socketRef.current.emit('placeBet', {
            amount: selectedBet,
            type: betType
          });
        }
      } else {
        // Erro ao fazer aposta
        setIsBetting(false);
        const error = await response.json();
        alert(`Erro: ${error.message}`);
      }
    } catch (error) {
      console.error('Erro ao fazer aposta:', error);
      setIsBetting(false);
      alert('Erro ao fazer aposta. Tente novamente.');
    }
  };

  // Função para enviar mensagem de chat
  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current) return;
    
    socketRef.current.emit('chatMessage', chatInput.trim());
    setChatInput('');
  };

  // Função para formatar o tempo
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  // Função para obter o texto do status atual
  const getStatusText = () => {
    switch (roundStatus) {
      case 'betting':
        return `Apostas: ${formatTime(timeLeft)}`;
      case 'running':
        return `Rodada: ${formatTime(timeLeft)}`;
      case 'finished':
        return 'Finalizado';
      default:
        return '';
    }
  };

  // Renderização dos nomes abreviados dos jogadores
  const renderPlayerName = (playerId: string) => {
    if (!playerId) return 'Anônimo';
    
    // Se for o jogador atual, mostrar "Você"
    if (session?.user && playerId === session.user.id) {
      return 'Você';
    }
    
    return playerId.substring(0, 5) + '...';
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white p-4">
      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm">Jogadores online: {playerCount}</div>
        <div className="text-lg font-bold bg-green-600 px-4 py-1 rounded-lg">{getStatusText()}</div>
        {(!socket?.connected || isReconnecting) && (
          <button 
            onClick={reiniciarSocket}
            disabled={isReconnecting}
            className={`px-3 py-1 ${isReconnecting ? 'bg-yellow-600' : 'bg-red-600'} text-white text-sm rounded-lg`}
          >
            {isReconnecting ? 'Reconectando...' : 'Reconectar'}
          </button>
        )}
      </div>
    
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Coluna 1: Jogo e Apostas */}
        <div className="col-span-2 space-y-4">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="relative h-64 bg-gray-700 rounded-lg mb-4">
              <div
                className="absolute w-full h-1 bg-red-500 transition-all duration-300"
                style={{ top: `${currentLine}%` }}
              />
              <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-500 opacity-50" />
            </div>

            <div className="flex justify-center space-x-4 mb-4">
              <button
                onClick={() => setBetType('ABOVE')}
                disabled={roundStatus !== 'betting'}
                className={`px-6 py-2 rounded ${
                  betType === 'ABOVE' 
                    ? 'bg-green-500' 
                    : roundStatus === 'betting' ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-700 cursor-not-allowed'
                }`}
              >
                Acima
              </button>
              <button
                onClick={() => setBetType('BELOW')}
                disabled={roundStatus !== 'betting'}
                className={`px-6 py-2 rounded ${
                  betType === 'BELOW' 
                    ? 'bg-green-500' 
                    : roundStatus === 'betting' ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-700 cursor-not-allowed'
                }`}
              >
                Abaixo
              </button>
            </div>

            <div className="flex justify-center space-x-2 mb-4">
              {QUICK_BETS.map((bet) => (
                <button
                  key={bet}
                  onClick={() => setSelectedBet(bet)}
                  disabled={roundStatus !== 'betting' || bet > userBalance}
                  className={`px-4 py-2 rounded ${
                    selectedBet === bet 
                      ? 'bg-blue-500' 
                      : bet > userBalance
                        ? 'bg-gray-700 cursor-not-allowed'
                        : roundStatus === 'betting' 
                          ? 'bg-gray-600 hover:bg-gray-500' 
                          : 'bg-gray-700 cursor-not-allowed'
                  }`}
                >
                  {bet}
                </button>
              ))}
            </div>

            <button
              onClick={placeBet}
              disabled={!selectedBet || !betType || isBetting || roundStatus !== 'betting' || (selectedBet || 0) > userBalance}
              className="w-full py-3 bg-green-500 rounded-lg disabled:bg-gray-600"
            >
              {isBetting ? 'Apostando...' : 'Fazer Aposta'}
            </button>
          </div>

          {result !== null && (
            <div className="text-center text-xl font-bold p-4 bg-gray-800 rounded-lg">
              <p className="mb-2">Resultado da Rodada:</p>
              <p className={`text-2xl ${winType === 'ABOVE' ? 'text-green-500' : 'text-blue-500'}`}>
                {winType === 'ABOVE' ? 'ACIMA' : 'ABAIXO'} ({displayResult !== null ? displayResult.toFixed(1) : result.toFixed(1)})
              </p>
              
              {myBets.length > 0 && (
                <div className="mt-4">
                  <p>Suas apostas:</p>
                  {myBets.map((bet, index) => {
                    const isWinner = bet.type === winType;
                    const winAmount = isWinner ? bet.amount * WIN_MULTIPLIER : 0;
                    
                    return (
                      <div key={index} className="flex justify-between items-center mt-2 border-t border-gray-600 pt-2">
                        <span>
                          R$ {bet.amount.toFixed(2)} em {bet.type === 'ABOVE' ? 'ACIMA' : 'ABAIXO'}
                        </span>
                        <span className={isWinner ? 'text-green-500' : 'text-red-500'}>
                          {isWinner ? `+R$ ${winAmount.toFixed(2)}` : 'Perdeu'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Coluna 2: Chat e Apostas */}
        <div className="col-span-1 space-y-4">
          {/* Lista de apostas da rodada atual */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-bold mb-2 border-b border-gray-700 pb-2">Apostas Atuais</h3>
            <div className="max-h-40 overflow-y-auto">
              {bets.length > 0 ? (
                <ul className="space-y-2">
                  {bets.map((bet) => (
                    <li key={bet.id} className="flex justify-between items-center text-sm">
                      <span>{renderPlayerName(bet.playerId)}</span>
                      <span className={`font-semibold ${bet.type === 'ABOVE' ? 'text-green-500' : 'text-red-500'}`}>
                        {bet.type === 'ABOVE' ? '↑' : '↓'} R$ {bet.amount}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-center py-2">Nenhuma aposta ainda</p>
              )}
            </div>
          </div>

          {/* Chat ao vivo */}
          <div className="bg-gray-800 rounded-lg p-4 flex flex-col h-64">
            <h3 className="text-lg font-bold mb-2">Chat ao Vivo</h3>
            
            <div 
              ref={chatAreaRef}
              className="flex-grow overflow-y-auto mb-2 space-y-2 text-sm"
            >
              {chatMessages.length > 0 ? (
                chatMessages.map((msg, index) => (
                  <div key={index} className="flex gap-1">
                    <span className="font-semibold">{renderPlayerName(msg.playerId)}:</span>
                    <span className="text-gray-300">{msg.message}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic">Seja o primeiro a enviar uma mensagem!</p>
              )}
            </div>
            
            <form onSubmit={sendChatMessage} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-grow bg-gray-700 text-white px-3 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button 
                type="submit"
                disabled={!chatInput.trim()}
                className="bg-green-600 text-white px-3 py-1 rounded-lg disabled:bg-gray-700 disabled:text-gray-500"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game; 
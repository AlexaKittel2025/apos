'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useRouter } from 'next/navigation';
import { useBalance } from '@/lib/BalanceContext';
import Image from 'next/image';
import { io, Socket } from 'socket.io-client';
import ChatSupport from '@/components/ChatSupport';
import LastResults from '@/components/LastResults';
import LevelCard from '@/components/LevelCard';

// Constantes de segurança (espelhando os valores do servidor)
const MIN_BET_AMOUNT = 5;      // Aposta mínima: R$ 5,00
const MAX_BET_AMOUNT = 1000;   // Aposta máxima: R$ 1000,00
const DAILY_BET_LIMIT = 15000;  // Limite diário: R$ 15000,00
const WIN_MULTIPLIER = 1.8;    // Multiplicador de ganho: 1.8x

// Variável global para armazenar a única instância do socket
let globalSocketInstance: Socket | null = null;
// Flag para controlar a inicialização
let isInitializingSocket = false;

export default function NovaInterface() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { userBalance, updateBalance, refreshBalance } = useBalance();
  
  // Estados para controle do jogo
  const [currentLine, setCurrentLine] = useState(50);
  const [timeLeft, setTimeLeft] = useState(10);
  const [roundStatus, setRoundStatus] = useState<'betting' | 'running' | 'finished'>('betting');
  const [selectedBet, setSelectedBet] = useState<number | null>(null);
  const [betType, setBetType] = useState<'ABOVE' | 'BELOW' | null>(null);
  const [isBetting, setIsBetting] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [displayResult, setDisplayResult] = useState<number | null>(null); // Resultado para exibição
  const [bets, setBets] = useState<any[]>([]);
  const [playerCount, setPlayerCount] = useState(1);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [myBet, setMyBet] = useState<{amount: number, type: 'ABOVE' | 'BELOW', roundId?: string} | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dailyBetTotal, setDailyBetTotal] = useState<number>(() => {
    try {
      const savedTotal = localStorage.getItem('dailyBetTotal');
      if (savedTotal && !isNaN(parseFloat(savedTotal))) {
        return parseFloat(savedTotal);
      }
      return 0;
    } catch (error) {
      console.error('Erro ao recuperar total de apostas diárias:', error);
      return 0;
    }
  });
  const [dailyBetLimit, setDailyBetLimit] = useState(DAILY_BET_LIMIT); // Usar o valor constante como padrão
  const [roundId, setRoundId] = useState<string | null>(null);
  const [socketInitialized, setSocketInitialized] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  
  // Configuração dos tempos (em segundos)
  const BETTING_DURATION = 5; // 5 segundos para apostas
  const RUNNING_DURATION = 20; // 20 segundos para a rodada em execução
  
  // Simulação de apostas rápidas
  const QUICK_BETS = [5, 10, 20, 50, 100];

  // Estado para modal de recarga
  const [showChatModal, setShowChatModal] = useState(false);

  // Redirecionar se não estiver autenticado
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
    
    // Buscar o limite diário personalizado quando o usuário estiver autenticado
    if (status === 'authenticated' && session) {
      fetchDailyBetLimit();
    }
  }, [status, router, session]);
  
  // Atualizar o limite diário quando a página receber foco
  useEffect(() => {
    // Esta função será chamada quando o usuário voltar à página
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session) {
        console.log('Página visível novamente, atualizando limite diário...');
        fetchDailyBetLimit();
      }
    };
    
    // Esta função será chamada quando a janela receber foco
    const handleFocus = () => {
      if (session) {
        console.log('Janela recebeu foco, atualizando limite diário...');
        fetchDailyBetLimit();
      }
    };
    
    // Adicionar listeners para os eventos
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    // Remover listeners quando o componente for desmontado
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [session]);
  
  // Função para buscar o limite diário personalizado
  const fetchDailyBetLimit = async () => {
    try {
      const response = await fetch('/api/user/bet-limit');
      
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data.dailyBetLimit === 'number' && !isNaN(data.dailyBetLimit)) {
          setDailyBetLimit(data.dailyBetLimit);
        } else {
          // Se a resposta for inválida, mantemos o valor padrão definido no state
          console.log('Resposta da API válida, mas dailyBetLimit não é um número:', data);
        }
      } else {
        // Em caso de erro na API, usamos o valor padrão
        console.warn('Erro ao buscar limite diário, usando valor padrão:', DAILY_BET_LIMIT);
      }
    } catch (error) {
      // Em caso de exceção, também mantemos o valor padrão
      console.error('Erro ao carregar limite de apostas:', error);
    }
  };
  
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
      setTimeLeft(Math.ceil(timeLeft / 1000)); // Converter de milissegundos para segundos
    });

    socketClient.on('gameState', (state: any) => {
      console.log('Estado do jogo recebido:', state);
      setCurrentLine(state.linePosition);
      setRoundStatus(state.phase);
      setRoundId(state.roundId);
      setTimeLeft(Math.ceil(state.timeLeft / 1000)); // Converter de milissegundos para segundos
      setBets(state.bets || []);
      setPlayerCount(state.connectedPlayers || 1);
    });

    socketClient.on('roundStart', (data: any) => {
      console.log('Rodada iniciada:', data);
      setRoundStatus('running');
      setTimeLeft(Math.ceil(data.timeLeft / 1000)); // Converter de milissegundos para segundos
      setBets(data.bets || []);
      setResult(null);
    });

    socketClient.on('bettingStart', (data: any) => {
      console.log('Fase de apostas iniciada:', data);
      setRoundStatus('betting');
      setTimeLeft(Math.ceil(data.timeLeft / 1000)); // Converter de milissegundos para segundos
      setRoundId(data.roundId);
      setSelectedBet(null);
      setBetType(null);
      setIsBetting(false);
      setResult(null);
      // Não limpar myBet aqui, isso será gerenciado pelo useEffect baseado no roundId
      setBets([]);
      setErrorMessage(null);
      
      // Remover aposta do localStorage no início de uma nova rodada
      localStorage.removeItem('currentBet');
      
      // Atualizar o saldo quando uma nova rodada começa
      refreshBalance();
    });

    socketClient.on('roundEnd', (data: any) => {
      console.log('Rodada finalizada:', data);
      
      // Obter resultado e multiplicador do servidor
      setResult(data.result);
      
      // Usar o valor de displayResult enviado pelo servidor ou calcular como 100 - result
      if (data.displayResult !== undefined) {
        setDisplayResult(data.displayResult);
      } else {
        setDisplayResult(Math.round(100 - data.result));
      }
      
      setRoundStatus('finished');
      
      // Atualizar aposta com resultado
      if (myBet) {
        // Verificar se ganhou
        const isWinner = 
          (myBet.type === 'ABOVE' && data.result < 50) || 
          (myBet.type === 'BELOW' && data.result >= 50);
        
        // Salvar o resultado no localStorage, mas manter a aposta visível
        try {
          const savedBet = localStorage.getItem('currentBet');
          if (savedBet) {
            const parsedBet = JSON.parse(savedBet);
            const updatedBet = {
              ...parsedBet,
              result: data.result,
              displayResult: data.displayResult || Math.round(100 - data.result),
              isWinner: isWinner
            };
            localStorage.setItem('currentBet', JSON.stringify(updatedBet));
          }
        } catch (error) {
          console.error('Erro ao atualizar aposta com resultado:', error);
        }
        
        if (isWinner) {
          // Usar o multiplicador recebido do servidor, ou o padrão caso não receba
          const multiplier = data.multiplier || WIN_MULTIPLIER;
          const winAmount = myBet.amount * multiplier;
          updateBalance(userBalance + winAmount);
        }
      }
      
      // Atualizar o saldo quando uma rodada termina para refletir ganhos/perdas
      refreshBalance();
    });

    socketClient.on('newBet', (bet: any) => {
      console.log('Nova aposta recebida:', bet);
      setBets(prev => [...prev, bet]);
    });

    socketClient.on('chatMessage', (message: any) => {
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
  }, [refreshBalance, userBalance, updateBalance, myBet]);

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
  
  // Validação da aposta antes de enviá-la
  const validateBet = (amount: number, type: 'ABOVE' | 'BELOW') => {
    // Limpar mensagem de erro anterior
    setErrorMessage(null);
    
    // Validar valor mínimo
    if (amount < MIN_BET_AMOUNT) {
      setErrorMessage(`Valor mínimo de aposta é R$ ${MIN_BET_AMOUNT.toFixed(2)}`);
      return false;
    }
    
    // Validar valor máximo
    if (amount > MAX_BET_AMOUNT) {
      setErrorMessage(`Valor máximo de aposta é R$ ${MAX_BET_AMOUNT.toFixed(2)}`);
      return false;
    }
    
    // Validar saldo suficiente
    if (amount > userBalance) {
      setErrorMessage('Saldo insuficiente para realizar esta aposta');
      return false;
    }
    
    // Validar limite diário
    if (dailyBetTotal + amount > dailyBetLimit) {
      setErrorMessage(`Você atingiu o limite diário de apostas (R$ ${dailyBetLimit.toFixed(2)})`);
      return false;
    }
    
    return true;
  };
  
  // Função para fazer apostas
  const placeBet = async () => {
    if (!selectedBet || !betType || roundStatus !== 'betting' || !roundId) return;
    
    // Validar a aposta antes de processá-la
    if (!validateBet(selectedBet, betType)) {
      return;
    }
    
    setIsBetting(true);
    
    try {
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
        const betResponse = await response.json();
        
        // Registrar a aposta do jogador para referência e salvar no localStorage
        const myNewBet = {
          amount: selectedBet,
          type: betType
        };
        updateMyBet(myNewBet);
        
        // Atualizar o saldo com o valor retornado pela API
        if (betResponse.newBalance !== undefined) {
          updateBalance(betResponse.newBalance);
        } else {
          // Fallback: atualizar com o valor local
          updateBalance(userBalance - selectedBet);
        }
        
        // Atualizar o total de apostas diárias
        if (betResponse.dailyTotal !== undefined) {
          // Usar o valor retornado pela API, se disponível
          setDailyBetTotal(betResponse.dailyTotal);
        } else {
          // Fallback: atualizar localmente
          setDailyBetTotal(prev => prev + selectedBet);
        }
        
        // Atualizar estatísticas do usuário após aposta bem-sucedida
        try {
          // Chamada assíncrona para atualizar estatísticas sem bloquear a UI
          fetch('/api/user/bet-stats?' + new Date().getTime(), {
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          }).then(response => {
            if (response.ok) {
              return response.json();
            }
            throw new Error('Falha ao atualizar estatísticas');
          }).then(data => {
            // Atualizar o total de apostas diárias com o valor mais preciso da API
            if (data && typeof data.dailyTotal === 'number') {
              setDailyBetTotal(data.dailyTotal);
            }
          }).catch(err => {
            console.error('Erro ao processar resposta de estatísticas:', err);
          });
        } catch (statsError) {
          console.error('Erro ao atualizar estatísticas após aposta:', statsError);
          // Não bloqueamos o fluxo por erro na atualização de estatísticas
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
        const error = await response.json();
        setErrorMessage(`Erro: ${error.message}`);
      }
    } catch (error) {
      console.error('Erro ao fazer aposta:', error);
      setErrorMessage('Erro ao fazer aposta. Tente novamente.');
    } finally {
      setIsBetting(false);
    }
  };
  
  // Função para enviar mensagem de chat
  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current) return;
    
    // Enviar mensagem via Socket.IO
    socketRef.current.emit('chatMessage', chatInput.trim());
    setChatInput('');
  };

  // Componente para renderizar nome do jogador
  const renderPlayerName = (playerId: string, playerName?: string) => {
    if (session?.user?.id === playerId) {
      return "Você";
    }
    return playerName || `Jogador ${playerId.substring(0, 5)}...`;
  };
  
  // Função para salvar a aposta no localStorage
  const saveMyBetToStorage = useCallback((bet: {amount: number, type: 'ABOVE' | 'BELOW'} | null, currentRoundId: string | null) => {
    try {
      if (bet && currentRoundId) {
        // Adicionar o roundId à aposta para validação posterior
        const betWithRoundId = { ...bet, roundId: currentRoundId };
        localStorage.setItem('currentBet', JSON.stringify(betWithRoundId));
      } else {
        // Se a aposta for nula, remover do armazenamento
        localStorage.removeItem('currentBet');
      }
    } catch (error) {
      console.error('Erro ao salvar aposta no localStorage:', error);
    }
  }, []);

  // Função personalizada para atualizar a aposta atual
  const updateMyBet = useCallback((bet: {amount: number, type: 'ABOVE' | 'BELOW'} | null) => {
    setMyBet(bet);
    saveMyBetToStorage(bet, roundId);
  }, [roundId, saveMyBetToStorage]);

  // Carregar dados de aposta e resultado do localStorage no início
  useEffect(() => {
    try {
      // Verificar se há dados salvos no localStorage
      const savedBet = localStorage.getItem('currentBet');
      
      if (savedBet) {
        const parsedBet = JSON.parse(savedBet);
        
        // Se já temos um roundId, verificar se a aposta é válida para a rodada atual
        if (roundId) {
          if (parsedBet.roundId === roundId) {
            console.log('Aposta encontrada para rodada atual:', parsedBet);
            
            // Restaurar a aposta
            setMyBet({
              amount: parsedBet.amount,
              type: parsedBet.type
            });
            
            // Se temos um resultado e rodada está finalizada, exibir o resultado também
            if (parsedBet.result !== undefined && roundStatus === 'finished') {
              setResult(parsedBet.result);
              setDisplayResult(parsedBet.displayResult || Math.round(100 - parsedBet.result));
            }
          } else {
            // Aposta é de uma rodada diferente da atual
            if (roundStatus === 'betting') {
              console.log('Removendo aposta de rodada anterior');
              localStorage.removeItem('currentBet');
            }
          }
        } else {
          // Não temos roundId ainda, exibir a aposta e esperar pela atualização do jogo
          console.log('Aposta salva encontrada, aguardando atualização do jogo:', parsedBet);
          
          // Restaurar a aposta para exibição
          setMyBet({
            amount: parsedBet.amount,
            type: parsedBet.type
          });
          
          // Se temos um resultado, exibir também
          if (parsedBet.result !== undefined) {
            setResult(parsedBet.result);
            setDisplayResult(parsedBet.displayResult || Math.round(100 - parsedBet.result));
            setRoundStatus('finished'); // Presumir que estamos na fase de exibição de resultado
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados de aposta do localStorage:', error);
      localStorage.removeItem('currentBet');
    }
  }, []);

  // Limpar a aposta salva apenas quando começar uma nova rodada
  useEffect(() => {
    if (roundStatus === 'betting' && roundId !== null) {
      // Verificar se há uma aposta salva
      try {
        const savedBet = localStorage.getItem('currentBet');
        if (savedBet) {
          const parsedBet = JSON.parse(savedBet);
          
          // Se a aposta for de uma rodada anterior, removê-la
          if (parsedBet.roundId !== roundId) {
            console.log('Removendo aposta de rodada anterior');
            setMyBet(null);
            localStorage.removeItem('currentBet');
          }
        }
      } catch (error) {
        console.error('Erro ao verificar aposta salva:', error);
      }
    }
  }, [roundStatus, roundId]);
  
  // Atualizar o localStorage quando o resultado for recebido
  useEffect(() => {
    if (roundStatus === 'finished' && result !== null && myBet) {
      try {
        // Atualizar a aposta no localStorage com o resultado para exibição posterior
        const savedBet = localStorage.getItem('currentBet');
        if (savedBet) {
          const parsedBet = JSON.parse(savedBet);
          const updatedBet = {
            ...parsedBet,
            result: result,
            displayResult: displayResult,
            isWinner: (myBet.type === 'ABOVE' && result < 50) || (myBet.type === 'BELOW' && result >= 50)
          };
          localStorage.setItem('currentBet', JSON.stringify(updatedBet));
        }
      } catch (error) {
        console.error('Erro ao atualizar aposta com resultado:', error);
      }
    }
  }, [roundStatus, result, displayResult, myBet]);

  // Salvar o total de apostas diárias no localStorage sempre que mudar
  useEffect(() => {
    try {
      localStorage.setItem('dailyBetTotal', dailyBetTotal.toString());
    } catch (error) {
      console.error('Erro ao salvar total de apostas diárias:', error);
    }
  }, [dailyBetTotal]);
  
  // Função para buscar o total de apostas diárias da API
  const fetchDailyBetTotal = useCallback(async () => {
    if (!session?.user?.id) return;
    
    try {
      console.log('Carregando total de apostas diárias...');
      const response = await fetch('/api/user/bet-stats');
      
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data.dailyTotal === 'number' && !isNaN(data.dailyTotal)) {
          console.log('Total de apostas carregado:', data.dailyTotal);
          setDailyBetTotal(data.dailyTotal);
          // Atualizar o localStorage também
          localStorage.setItem('dailyBetTotal', data.dailyTotal.toString());
        }
      }
    } catch (error) {
      console.error('Erro ao carregar total de apostas diárias:', error);
    }
  }, [session]);
  
  // Buscar o total de apostas diárias da API quando o componente for montado
  useEffect(() => {
    if (status === 'authenticated' && session) {
      fetchDailyBetTotal();
    }
  }, [status, session, fetchDailyBetTotal]);
  
  // Atualizar o total de apostas diárias quando a página receber foco
  useEffect(() => {
    // Esta função será chamada quando o usuário voltar à página
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session) {
        console.log('Página visível novamente, atualizando total de apostas diárias...');
        fetchDailyBetTotal();
      }
    };
    
    // Esta função será chamada quando a janela receber foco
    const handleFocus = () => {
      if (session) {
        console.log('Janela recebeu foco, atualizando total de apostas diárias...');
        fetchDailyBetTotal();
      }
    };
    
    // Adicionar listeners para os eventos
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    // Remover listeners quando o componente for desmontado
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [session, fetchDailyBetTotal]);

  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <div className="animate-pulse">Carregando...</div>
      </div>
    );
  }
  
  if (status === 'unauthenticated' || !session) {
    return null;
  }
  
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Área principal do jogo */}
        <Card variant="bordered" className="md:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Jogo ao Vivo</CardTitle>
              <CardDescription>Faça suas apostas e acompanhe os resultados</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              {/* Status da conexão */}
              {(!socket?.connected || isReconnecting) && (
                <div className="mb-4 p-2 rounded-md bg-yellow-600 bg-opacity-20 border border-yellow-600 text-center">
                  <p className="text-yellow-500 text-sm">
                    {isReconnecting ? 'Reconectando ao servidor...' : 'Desconectado do servidor'}
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={reiniciarSocket}
                    disabled={isReconnecting}
                    className="mt-1 px-2 py-1 text-xs"
                  >
                    {isReconnecting ? 'Reconectando...' : 'Reconectar'}
                  </Button>
                </div>
              )}
              
              <div className="relative h-64 bg-[#121212] rounded-lg mb-4 overflow-hidden border border-gray-800">
                <div
                  className="absolute w-full h-1 bg-[#3bc37a] transition-all duration-300"
                  style={{ top: `${currentLine}%` }}
                />
                <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-600 opacity-50" />
                
                {result !== null && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="text-center">
                      <p className="text-lg">Resultado</p>
                      <p className={`text-2xl font-bold ${currentLine < 50 ? "text-[#3bc37a]" : "text-[#1a86c7]"}`}>
                        {currentLine < 50 ? "ACIMA" : "ABAIXO"} ({displayResult !== null ? displayResult.toFixed(1) : (100 - (result || 0)).toFixed(1)})
                      </p>
                      
                      {myBet && (
                        <p className="mt-2">
                          {(myBet.type === 'ABOVE' && currentLine < 50) || (myBet.type === 'BELOW' && currentLine >= 50) ? (
                            <span className="text-[#3bc37a]">Você ganhou R$ {(myBet.amount * WIN_MULTIPLIER).toFixed(2)}</span>
                          ) : (
                            <span className="text-red-500">Você perdeu R$ {myBet.amount.toFixed(2)}</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-center mb-4">
                <div className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-[#1a86c7] to-[#3bc37a] text-white text-lg font-medium">
                  {roundStatus === 'betting' && `Apostas: ${timeLeft}s`}
                  {roundStatus === 'running' && `Rodada em andamento: ${timeLeft}s`}
                  {roundStatus === 'finished' && 'Rodada finalizada'}
                </div>
              </div>
              
              {/* Mensagem de erro, se houver */}
              {errorMessage && (
                <div className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded-md text-red-400 text-sm">
                  {errorMessage}
                </div>
              )}
              
              <div className="flex justify-center gap-4 mb-6">
                <Button
                  variant={betType === 'ABOVE' ? 'primary' : 'secondary'}
                  disabled={roundStatus !== 'betting' || myBet !== null}
                  onClick={() => setBetType('ABOVE')}
                >
                  Acima
                </Button>
                <Button
                  variant={betType === 'BELOW' ? 'primary' : 'secondary'}
                  disabled={roundStatus !== 'betting' || myBet !== null}
                  onClick={() => setBetType('BELOW')}
                >
                  Abaixo
                </Button>
              </div>
              
              <div className="flex justify-center flex-wrap gap-2 mb-6">
                {QUICK_BETS.map((bet) => (
                  <button
                    key={bet}
                    onClick={() => setSelectedBet(bet)}
                    disabled={roundStatus !== 'betting' || bet > userBalance || myBet !== null}
                    className={`px-4 py-2 rounded-md ${
                      selectedBet === bet 
                        ? 'bg-[#3bc37a] text-white' 
                        : bet > userBalance
                          ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                          : 'bg-[#1e1e1e] text-white hover:bg-[#1a86c7] hover:bg-opacity-30'
                    }`}
                  >
                    R$ {bet}
                  </button>
                ))}
              </div>
              
              <div className="text-center text-xs text-gray-400 mb-2">
                <p>
                  Limites: Min R$ {MIN_BET_AMOUNT} • Max R$ {MAX_BET_AMOUNT} • 
                  <span 
                    className={`${dailyBetLimit !== DAILY_BET_LIMIT ? 'text-[#3bc37a] font-medium' : ''}`}
                    title={dailyBetLimit !== DAILY_BET_LIMIT ? 'Limite personalizado definido no perfil' : ''}
                  >
                    Diário R$ {dailyBetLimit.toFixed(2)}
                    {dailyBetLimit !== DAILY_BET_LIMIT && ' ✓'}
                  </span>
                </p>
                <p>
                  Total apostado hoje: R$ {dailyBetTotal.toFixed(2)} • 
                  <span onClick={() => router.push('/profile')} className="text-[#1a86c7] cursor-pointer hover:underline">
                    Ajustar Limite
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="primary"
              fullWidth
              disabled={!selectedBet || !betType || isBetting || roundStatus !== 'betting' || (selectedBet || 0) > userBalance || myBet !== null}
              onClick={placeBet}
            >
              {isBetting ? 'Processando...' : myBet ? 'Aposta Realizada' : 'Fazer Aposta'}
            </Button>
          </CardFooter>
          
          {/* Últimos Resultados */}
          <div className="px-4 pb-6 pt-2">
            <LastResults />
          </div>
        </Card>
        
        {/* Área lateral - Informações e chat */}
        <div className="space-y-8">
          {/* Cartão de informações financeiras */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Seu Saldo</CardTitle>
              <CardDescription>Informações da sua conta</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <p className="text-sm text-gray-400 mb-1">Saldo Disponível</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-[#1a86c7] to-[#3bc37a] bg-clip-text text-transparent">
                  R$ {userBalance.toFixed(2)}
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-wrap justify-between gap-2">
              <Button variant="primary" onClick={() => setShowChatModal(true)}>
                Recarregar
              </Button>
              <Button variant="secondary" onClick={() => router.push('/profile')}>
                Ver Perfil
              </Button>
            </CardFooter>
          </Card>
          
          {/* Componente de Nível */}
          <LevelCard compact />
          
          {/* Apostas */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Apostas Atuais</CardTitle>
              <CardDescription>Sua aposta na rodada atual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-40 overflow-y-auto">
                {myBet ? (
                  <div className="py-4 flex justify-between items-center">
                    <span className="font-medium">Sua aposta</span>
                    <div className={`inline-flex items-center ${myBet.type === 'ABOVE' ? 'text-[#3bc37a]' : 'text-[#1a86c7]'}`}>
                      {myBet.type === 'ABOVE' ? '↑ ACIMA' : '↓ ABAIXO'} 
                      <span className="ml-2 font-medium">R$ {myBet.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  bets.some(bet => bet.playerId === session?.user?.id || bet.userId === session?.user?.id) ? (
                    // Encontrar e exibir a aposta do usuário atual se estiver nos bets
                    bets.filter(bet => bet.playerId === session?.user?.id || bet.userId === session?.user?.id).map((bet) => (
                      <div key={bet.id} className="py-4 flex justify-between items-center">
                        <span className="font-medium">Sua aposta</span>
                        <div className={`inline-flex items-center ${bet.type === 'ABOVE' ? 'text-[#3bc37a]' : 'text-[#1a86c7]'}`}>
                          {bet.type === 'ABOVE' ? '↑ ACIMA' : '↓ ABAIXO'} 
                          <span className="ml-2 font-medium">R$ {bet.amount.toFixed(2)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-6">Você ainda não apostou nesta rodada</p>
                  )
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Chat */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Chat de Suporte</CardTitle>
              <CardDescription>Entre em contato com nosso suporte</CardDescription>
            </CardHeader>
            <CardContent>
              <ChatSupport 
                isAdmin={false}
                height="300px"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Chat para Recarga */}
      <div
        className={`fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70 transition-all duration-200 ${showChatModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setShowChatModal(false)}
      >
        <div
          className="bg-[#121212] rounded-lg shadow-xl max-w-4xl w-full border border-gray-800"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <h3 className="text-lg font-medium">Chat de Suporte - Realizar Depósito</h3>
            <button
              onClick={() => setShowChatModal(false)}
              className="text-gray-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="p-6">
            <ChatSupport 
              isAdmin={false} 
              title="Chat de Suporte - Realizar Depósito"
              height="400px"
              autoFocus={true}
            />
            <div className="mt-6 text-sm text-gray-400">
              <p>Entre em contato com nosso suporte para receber instruções de depósito e enviar comprovantes.</p>
              <p className="mt-2">Nosso atendimento está disponível das 8h às 22h todos os dias.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
import { io, Socket } from 'socket.io-client';

// Variável singleton para o socket
let socket: Socket | null = null;
let isInitializing = false;
let eventListeners: Record<string, Function[]> = {};

// Opções para o socket
const socketOptions = {
  reconnectionAttempts: 10,       // Aumentar número de tentativas de reconexão
  reconnectionDelay: 3000,        // Esperar mais tempo entre reconexões (ms)
  reconnectionDelayMax: 10000,    // Aumentar tempo máximo entre tentativas (ms)
  timeout: 30000,                 // Aumentar timeout da conexão (ms)
  transports: ['websocket'],      // Usar apenas WebSocket para evitar polling
  forceNew: false,                // Não forçar criação de nova conexão
  autoConnect: true,              // Conectar automaticamente
  reconnection: true              // Habilitar reconexão automática
};

// Inicializa o servidor Socket.IO e cria a conexão
export const initializeSocket = async (): Promise<Socket> => {
  if (socket && socket.connected) {
    console.log('Reutilizando socket existente');
    return socket;
  }
  
  if (isInitializing) {
    return new Promise((resolve) => {
      // Esperar até que o socket seja inicializado
      const checkInterval = setInterval(() => {
        if (socket && !isInitializing) {
          clearInterval(checkInterval);
          resolve(socket);
        }
      }, 100);
    });
  }
  
  try {
    isInitializing = true;
    console.log('Inicializando servidor Socket.IO...');
    
    // Inicializar o servidor Socket.IO
    await fetch('/api/socket');
    
    console.log('Criando nova conexão Socket.IO...');
    const newSocket = io(socketOptions);
    
    // Configurar eventos básicos
    newSocket.on('connect', () => {
      console.log('Conectado ao servidor Socket.IO:', newSocket.id);
      triggerEvent('connect', newSocket.id);
    });
    
    newSocket.on('disconnect', () => {
      console.log('Desconectado do servidor Socket.IO');
      triggerEvent('disconnect');
    });
    
    newSocket.on('connect_error', (error) => {
      console.error('Erro na conexão Socket.IO:', error);
      triggerEvent('error', error);
    });
    
    // Definir o socket como singleton
    socket = newSocket;
    isInitializing = false;
    
    return socket;
  } catch (error) {
    console.error('Erro ao inicializar Socket.IO:', error);
    isInitializing = false;
    throw error;
  }
};

// Adicionar um event listener
export const addEventListener = (event: string, callback: Function): void => {
  if (!eventListeners[event]) {
    eventListeners[event] = [];
  }
  eventListeners[event].push(callback);
  
  // Se o socket já existir, adicionar o listener diretamente
  if (socket) {
    socket.on(event, (...args) => callback(...args));
  }
};

// Remover um event listener
export const removeEventListener = (event: string, callback: Function): void => {
  if (eventListeners[event]) {
    eventListeners[event] = eventListeners[event].filter(cb => cb !== callback);
  }
};

// Disparar evento para todos os listeners
const triggerEvent = (event: string, ...args: any[]): void => {
  if (eventListeners[event]) {
    eventListeners[event].forEach(callback => callback(...args));
  }
};

// Obter o socket atual
export const getSocket = (): Socket | null => {
  return socket;
};

// Fechar o socket
export const closeSocket = (): void => {
  if (socket) {
    console.log('Fechando conexão Socket.IO...');
    socket.disconnect();
    socket = null;
    eventListeners = {};
  }
};

// Enviar um evento para o servidor
export const emitEvent = (event: string, ...args: any[]): void => {
  if (socket) {
    socket.emit(event, ...args);
  } else {
    console.error('Socket não está inicializado ainda');
  }
}; 
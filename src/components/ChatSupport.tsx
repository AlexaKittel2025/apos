'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';

// Interface para mensagens
interface ChatMessage {
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

// Interface para as props do componente
interface ChatSupportProps {
  isAdmin?: boolean;
  selectedUserId?: string;
  onUserChange?: (userId: string) => void;
  title?: string;
  height?: string;
  autoFocus?: boolean;
}

export default function ChatSupport({
  isAdmin = false,
  selectedUserId,
  onUserChange,
  title = 'Chat de Suporte',
  height = '400px',
  autoFocus = false
}: ChatSupportProps) {
  // Estados para mensagens e entrada de texto
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatUsers, setChatUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Estado para controlar requisições simultâneas
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Sessão do usuário
  const { data: session } = useSession();
  
  // Buscar mensagens
  const fetchMessages = async () => {
    if (!session?.user?.id) return;
    
    try {
      setIsUpdating(true);
      
      // Se for admin, buscar mensagens do usuário selecionado
      const url = isAdmin && selectedUserId
        ? `/api/chat/messages?userId=${selectedUserId}`
        : '/api/chat/messages';
      
      const response = await fetch(url);
      
      if (response.ok) {
        const messages = await response.json();
        
        // Armazenar a posição anterior para verificar se novas mensagens foram adicionadas
        const previousLength = chatMessages.length;
        
        setChatMessages(messages);
        
        // Rolar para o final apenas se houver mensagens
        if (messages.length > 0) {
          setTimeout(() => {
            const container = document.getElementById('chat-messages-container');
            if (container) {
              container.scrollTop = container.scrollHeight;
            }
          }, 100);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Buscar usuários (apenas para admin)
  const fetchUsers = async () => {
    if (!isAdmin || !session?.user?.id) return;
    
    try {
      const response = await fetch('/api/chat/users');
      if (response.ok) {
        const users = await response.json();
        setChatUsers(users);
        
        // Selecionar automaticamente o primeiro usuário se não houver nenhum selecionado
        if (users.length > 0 && !selectedUserId && onUserChange) {
          onUserChange(users[0].id);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  };
  
  // Efeito para inicialização
  useEffect(() => {
    if (session?.user?.id) {
      // Buscar mensagens inicialmente
      fetchMessages();
      
      // Se for admin, buscar usuários
      if (isAdmin) {
        fetchUsers();
      }
    }
  }, [session?.user?.id, isAdmin, selectedUserId]);
  
  // Efeito para polling de mensagens
  useEffect(() => {
    if (!session?.user?.id) return;
    
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible' && !isUpdating) {
        fetchMessages();
      }
    }, 15000);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isUpdating) {
        fetchMessages();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session?.user?.id, isAdmin, selectedUserId, isUpdating]);
  
  // Função para enviar mensagem
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !session?.user?.id) return;
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: message,
          // Se for admin, enviar para o usuário selecionado
          ...(isAdmin && selectedUserId && { recipientId: selectedUserId }),
        }),
      });
      
      if (response.ok) {
        setMessage('');
        
        // Buscar mensagens sem usar fetchMessages para evitar dupla rolagem
        const currentMessages = [...chatMessages];
        
        const messagesResponse = await fetch(isAdmin && selectedUserId
          ? `/api/chat/messages?userId=${selectedUserId}`
          : '/api/chat/messages');
          
        if (messagesResponse.ok) {
          const messages = await messagesResponse.json();
          setChatMessages(messages);
          
          // Rolar para o final apenas se houver mensagens
          if (messages.length > 0) {
            setTimeout(() => {
              const container = document.getElementById('chat-messages-container');
              if (container) {
                container.scrollTop = container.scrollHeight;
              }
            }, 100);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Função para upload de imagem
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !session?.user?.id) return;
    
    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('file', files[0]);
      
      const response = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const fileInfo = await response.json();
        
        // Enviar mensagem com a imagem
        const messageResponse = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: `[IMAGEM: ${fileInfo.originalName}](${fileInfo.url})`,
            isImage: true,
            fileInfo: fileInfo,
            // Se for admin, enviar para o usuário selecionado
            ...(isAdmin && selectedUserId && { recipientId: selectedUserId }),
          }),
        });
        
        if (messageResponse.ok) {
          // Buscar mensagens para atualizar com uma flag para não rolar automaticamente
          const currentMessages = [...chatMessages];
          
          const response = await fetch(isAdmin && selectedUserId
            ? `/api/chat/messages?userId=${selectedUserId}`
            : '/api/chat/messages');
            
          if (response.ok) {
            const messages = await response.json();
            setChatMessages(messages);
            
            // Rolar para o final apenas se houver mensagens
            if (messages.length > 0) {
              setTimeout(() => {
                const container = document.getElementById('chat-messages-container');
                if (container) {
                  container.scrollTop = container.scrollHeight;
                }
              }, 100);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
    } finally {
      setLoading(false);
      // Limpar o input de arquivo
      if (e.target) {
        e.target.value = '';
      }
    }
  };
  
  // Função para lidar com quebra de linha
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter envia a mensagem
    if (e.key === 'Enter' && e.ctrlKey) {
      sendMessage(e as any);
      return;
    }
    
    // Enter sem Ctrl só adiciona quebra de linha se for um textarea
    if (e.key === 'Enter' && !e.ctrlKey) {
      e.preventDefault();
      sendMessage(e as any);
    }
  };
  
  // Função para renderizar mensagens
  const MessageDisplay = ({ msg }: { msg: ChatMessage }) => {
    if (msg.isImage && msg.fileInfo) {
      return (
        <div>
          <div className="cursor-pointer" onClick={() => window.open(msg.fileInfo!.url, '_blank')}>
            <img 
              src={msg.fileInfo.url} 
              alt={msg.fileInfo.originalName || "Imagem compartilhada"} 
              className="max-w-full rounded hover:opacity-90 transition-opacity border border-gray-700"
              style={{ maxHeight: '120px', maxWidth: '200px' }}
            />
          </div>
          <span className="text-xs text-gray-400 mt-1 block">
            {msg.fileInfo.originalName} (clique para ampliar)
          </span>
        </div>
      );
    } else if (msg.isImage) {
      // Tentar extrair a URL da imagem do texto
      const imageUrl = msg.text.match(/\(([^)]+)\)/)?.[1];
      const imageName = msg.text.match(/\[IMAGEM: ([^\]]+)\]/)?.[1] || 'Imagem compartilhada';
      
      if (imageUrl) {
        return (
          <div>
            <div className="cursor-pointer" onClick={() => window.open(imageUrl, '_blank')}>
              <img 
                src={imageUrl}
                alt={imageName}
                className="max-w-full rounded hover:opacity-90 transition-opacity border border-gray-700"
                style={{ maxHeight: '120px', maxWidth: '200px' }}
              />
            </div>
            <span className="text-xs text-gray-400 mt-1 block">
              {imageName} (clique para ampliar)
            </span>
          </div>
        );
      }
    }
    
    // Caso padrão: renderizar o texto com quebras de linha
    return <p className="text-sm whitespace-pre-wrap">{msg.text}</p>;
  };
  
  // Componente para seleção de usuário (apenas para admin)
  const UserSelector = () => {
    if (!isAdmin) return null;
    
    return (
      <div className="mb-4 bg-[#1a1a1a] rounded-lg p-3 border border-gray-800">
        <h3 className="text-sm font-medium mb-2 text-gray-300">Usuários</h3>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {chatUsers.map((user) => (
            <button
              key={user.id}
              className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                selectedUserId === user.id
                  ? 'bg-gradient-to-r from-[#1a86c7] to-[#3bc37a]'
                  : 'bg-[#222222] hover:bg-[#2a2a2a]'
              }`}
              onClick={() => onUserChange && onUserChange(user.id)}
            >
              <div className="flex justify-between items-center">
                <span>{user.name || user.email}</span>
                {user.hasNewMessages && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    Novo
                  </span>
                )}
              </div>
            </button>
          ))}
          
          {chatUsers.length === 0 && (
            <div className="text-sm text-gray-400 p-2">Nenhum usuário disponível</div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="bg-[#121212] rounded-lg p-4 border border-gray-800 flex flex-col">
      <div className="flex flex-col sm:flex-row gap-3 flex-1">
        {/* Área de seleção de usuário (apenas para admin) */}
        {isAdmin && <div className="sm:w-1/3"><UserSelector /></div>}
        
        {/* Área de mensagens e input */}
        <div className={`flex-1 flex flex-col ${isAdmin ? 'sm:w-2/3' : 'w-full'}`}>
          {/* Área de mensagens */}
          <div 
            id="chat-messages-container"
            className="bg-[#1a1a1a] rounded-lg p-3 border border-gray-800 mb-3 overflow-y-auto"
            style={{ height }}
          >
            {chatMessages.length > 0 ? (
              <div className="space-y-3">
                {chatMessages.map((msg, index) => (
                  <div 
                    key={msg.id || index} 
                    className={`flex ${msg.sender === (isAdmin ? 'ADMIN' : 'USER') ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.sender === (isAdmin ? 'ADMIN' : 'USER')
                          ? 'bg-gradient-to-r from-[#1a86c7] to-[#3bc37a] text-white'
                          : msg.sender === 'SYSTEM'
                            ? 'bg-[#d97706] text-white'
                            : 'bg-[#2a2a2a] text-gray-100'
                      } ${msg.isFinal ? 'border-2 border-yellow-400' : ''}`}
                    >
                      <MessageDisplay msg={msg} />
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs opacity-70">
                          {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                        <p className="text-xs opacity-70 ml-2">
                          {msg.userName}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-400 text-sm">
                  {isAdmin 
                    ? 'Selecione um usuário para iniciar uma conversa'
                    : 'Nenhuma mensagem ainda. Inicie uma conversa com nosso suporte.'}
                </p>
              </div>
            )}
          </div>
          
          {/* Área de entrada de mensagem */}
          <form onSubmit={sendMessage} className="flex flex-col space-y-2">
            <div className="flex space-x-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua mensagem... (Enter para enviar)"
                rows={3}
                className="flex-1 bg-[#1a1a1a] border border-gray-800 rounded-lg p-2 text-white resize-none focus:outline-none focus:ring-1 focus:ring-[#3bc37a]"
                disabled={loading || (isAdmin && !selectedUserId)}
                autoFocus={autoFocus}
              />
              <div className="flex flex-col space-y-2">
                <Button 
                  type="submit" 
                  disabled={loading || message.trim() === '' || (isAdmin && !selectedUserId)}
                  className="px-3 py-2 bg-gradient-to-r from-[#1a86c7] to-[#3bc37a] text-white rounded-md hover:opacity-90 disabled:opacity-50"
                >
                  Enviar
                </Button>
                
                <label className="px-3 py-2 bg-[#7c3aed] text-white rounded-md cursor-pointer text-center hover:bg-opacity-90 disabled:opacity-50">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={loading || (isAdmin && !selectedUserId)}
                    className="hidden"
                  />
                  Imagem
                </label>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Use Enter para enviar. Envie comprovantes de pagamento como imagens para confirmar depósitos.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
} 
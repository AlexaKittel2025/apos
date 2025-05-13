import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

// Armazenamento temporário de chats finalizados
let closedChats: {
  userId: string;
  closedBy: string;
  closedAt: Date;
  reason: string;
}[] = [];

// Importar a referência para as mensagens de chat (em produção, isto viria do banco de dados)
// Na implementação temporária, precisamos acessar o mesmo array de mensagens
import chatMessagesModule from './messages-store';
const { chatMessages } = chatMessagesModule;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  // POST para finalizar um chat
  if (req.method === 'POST') {
    try {
      const { userId, reason } = req.body;

      if (!userId) {
        return res.status(400).json({ message: 'ID do usuário é obrigatório' });
      }

      console.log(`POST /api/chat/close - Finalizando chat - User: ${userId}, By: ${session.user.id}`);

      // Verificar se é admin ou o próprio usuário
      const isAdmin = session.user.role === 'ADMIN';
      const isSameUser = session.user.id === userId;

      if (!isAdmin && !isSameUser) {
        return res.status(403).json({ message: 'Você não tem permissão para finalizar este chat' });
      }

      // Verificar se o chat já está finalizado
      const alreadyClosed = closedChats.some(chat => chat.userId === userId);
      if (alreadyClosed) {
        return res.status(400).json({ message: 'Este chat já está finalizado' });
      }

      // Registrar o chat como finalizado
      const closedChat = {
        userId,
        closedBy: session.user.id,
        closedAt: new Date(),
        reason: reason || 'Chat finalizado pelo ' + (isAdmin ? 'administrador' : 'usuário')
      };

      closedChats.push(closedChat);

      // Criar mensagem final
      const finalMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        text: `Chat finalizado: ${closedChat.reason}`,
        sender: 'SYSTEM',
        userId: 'system',
        userName: 'Sistema',
        recipientId: userId, // Mensagem específica para este chat
        timestamp: new Date(),
        read: false,
        isFinal: true,
        isImage: false,
        fileInfo: null
      };

      // Adicionar mensagem ao histórico
      if (Array.isArray(chatMessages)) {
        chatMessages.push(finalMessage);
        console.log(`Mensagem de finalização adicionada ao histórico: ${finalMessage.id}`);
      } else {
        console.error('Array de mensagens não disponível para adicionar mensagem de finalização');
      }
      
      return res.status(200).json({ 
        success: true, 
        message: 'Chat finalizado com sucesso',
        finalMessage
      });
    } catch (error) {
      console.error('Erro ao finalizar chat:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  // GET para verificar se um chat está finalizado
  if (req.method === 'GET') {
    try {
      const { userId } = req.query;

      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ message: 'ID do usuário é obrigatório' });
      }

      // Verificar se o chat está na lista de finalizados
      const isClosed = closedChats.some(chat => chat.userId === userId);
      
      // Limpar chats finalizados há mais de 24h
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);
      
      closedChats = closedChats.filter(chat => chat.closedAt > oneDayAgo);

      return res.status(200).json({ 
        isClosed,
        closedDetails: isClosed 
          ? closedChats.find(chat => chat.userId === userId)
          : null
      });
    } catch (error) {
      console.error('Erro ao verificar status do chat:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ message: 'Método não permitido' });
} 
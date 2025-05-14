import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { redeemReward } from '@/lib/levelSystem';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar a sessão do usuário
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || !session.user?.id) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  const userId = session.user.id;
  
  // Apenas aceitar requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    // Obter o ID da recompensa do corpo da requisição
    const { rewardId } = req.body;
    
    if (!rewardId) {
      return res.status(400).json({ error: 'ID da recompensa é obrigatório' });
    }
    
    // Resgatar a recompensa
    const result = await redeemReward(userId, rewardId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    // Obter saldo atualizado
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        balance: true,
        loyaltyPoints: true
      }
    });
    
    // Retornar o resultado
    return res.status(200).json({
      success: true,
      message: result.message,
      reward: result.reward,
      updatedBalance: user?.balance || 0,
      updatedPoints: user?.loyaltyPoints || 0
    });
  } catch (error) {
    console.error('Erro ao resgatar recompensa:', error);
    return res.status(500).json({ error: 'Erro ao processar o resgate da recompensa' });
  }
} 
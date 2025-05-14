import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { initializeLevelSystem } from '@/lib/levelSystem';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Verificar se o usuário é administrador
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user?.id || session.user.role !== 'ADMIN') {
      return res.status(401).json({ error: 'Não autorizado. Apenas administradores podem executar esta ação.' });
    }
    
    // Inicializar o sistema de níveis
    await initializeLevelSystem();
    
    return res.status(200).json({ success: true, message: 'Sistema de níveis inicializado com sucesso!' });
  } catch (error) {
    console.error('Erro ao inicializar sistema de níveis:', error);
    return res.status(500).json({ error: 'Erro ao inicializar sistema de níveis' });
  }
} 
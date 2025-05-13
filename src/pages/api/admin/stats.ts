import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  console.log('Sessão do usuário:', session ? 'Autenticado' : 'Não autenticado');
  console.log('Papel do usuário:', session?.user?.role);

  if (!session || session.user.role !== 'ADMIN') {
    return res.status(401).json({ message: 'Não autorizado. Apenas administradores podem acessar.' });
  }

  if (req.method === 'GET') {
    try {
      console.log('Buscando estatísticas do jogo...');
      const [totalBets, totalAmount, currentRound] = await Promise.all([
        prisma.bet.count(),
        prisma.bet.aggregate({
          _sum: {
            amount: true,
          },
        }),
        prisma.round.findFirst({
          where: {
            endTime: {
              gt: new Date(),
            },
          },
          orderBy: {
            startTime: 'desc',
          },
        }),
      ]);

      const houseProfit = await prisma.round.aggregate({
        _sum: {
          houseProfit: true,
        },
      });

      console.log('Estatísticas encontradas:', {
        totalBets,
        totalAmount: totalAmount._sum.amount || 0,
        houseProfit: houseProfit._sum.houseProfit || 0,
      });

      return res.status(200).json({
        totalBets,
        totalAmount: totalAmount._sum.amount || 0,
        houseProfit: houseProfit._sum.houseProfit || 0,
        currentRound,
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ message: 'Método não permitido' });
} 
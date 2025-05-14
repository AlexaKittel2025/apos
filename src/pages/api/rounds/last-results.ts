import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Obter sessão do usuário
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Não autorizado. Faça login primeiro.' });
  }

  if (req.method === 'GET') {
    try {
      // Buscar as últimas 10 rodadas finalizadas
      const lastRounds = await prisma.round.findMany({
        where: {
          status: 'FINISHED'
        },
        orderBy: {
          endTime: 'desc'
        },
        take: 10,
        include: {
          bets: {
            where: {
              userId: session.user.id
            }
          }
        }
      });

      // Processar os resultados para enviar ao frontend
      const processedResults = lastRounds.map(round => {
        const rawResult = round.result || 50;
        const displayResult = Math.round(100 - rawResult); // Valor de exibição
        
        // Verificar se o usuário apostou nesta rodada
        const userBet = round.bets.length > 0 ? round.bets[0] : null;
        
        // Calcular se o usuário ganhou a aposta
        let won = false;
        let profit = 0;
        
        if (userBet) {
          won = (userBet.type === 'ABOVE' && rawResult < 50) || 
                (userBet.type === 'BELOW' && rawResult >= 50);
          
          // Multiplicador fixo de 1.8x
          profit = won ? userBet.amount * 1.8 : 0;
        }
        
        return {
          id: round.id,
          result: rawResult,
          displayResult,
          timestamp: round.endTime.toISOString(),
          userBet: userBet ? {
            amount: userBet.amount,
            type: userBet.type,
            won,
            profit
          } : null
        };
      });

      return res.status(200).json({ results: processedResults });
    } catch (error) {
      console.error('Erro ao buscar últimos resultados:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ message: 'Método não permitido' });
} 
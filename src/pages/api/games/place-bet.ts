import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { updateUserBalance } from '@/lib/user-utils';
import { 
  MIN_BET_AMOUNT, 
  MAX_BET_AMOUNT, 
  DEFAULT_DAILY_BET_LIMIT,
  BetStatus,
  RoundStatus  
} from '@/lib/game-constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    // Verificar autenticação
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }
    
    const { amount, gameType, roundId } = req.body;
    
    console.log('Dados da aposta recebidos:', { amount, gameType, roundId, userId: session.user.id });
    
    // Validar os parâmetros da requisição
    if (!amount || typeof amount !== 'number') {
      return res.status(400).json({ message: 'Valor de aposta inválido' });
    }
    
    if (!gameType || !['multiplicador', 'crash'].includes(gameType)) {
      return res.status(400).json({ message: 'Tipo de jogo inválido' });
    }
    
    if (!roundId) {
      return res.status(400).json({ message: 'ID da rodada inválido' });
    }
    
    // Validar valor da aposta
    if (amount < MIN_BET_AMOUNT) {
      return res.status(400).json({ message: `Valor mínimo de aposta é R$ ${MIN_BET_AMOUNT}` });
    }
    
    if (amount > MAX_BET_AMOUNT) {
      return res.status(400).json({ message: `Valor máximo de aposta é R$ ${MAX_BET_AMOUNT}` });
    }
    
    // Obter o usuário
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Verificar saldo
    if (user.balance < amount) {
      return res.status(400).json({ message: 'Saldo insuficiente' });
    }
    
    // Verificar limite diário
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dailyBets = await prisma.bet.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: today,
        },
      },
    });
    
    const dailyTotal = dailyBets.reduce((sum, bet) => sum + bet.amount, 0);
    
    // Buscar o limite personalizado do usuário, se existir
    // @ts-ignore - O modelo userSettings existe no schema mas não no tipo PrismaClient
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    });
    
    const userDailyLimit = userSettings?.dailyBetLimit || DEFAULT_DAILY_BET_LIMIT;
    
    if (dailyTotal + amount > userDailyLimit) {
      return res.status(400).json({ 
        message: `Você atingiu o limite diário de apostas (R$ ${userDailyLimit.toFixed(2)})` 
      });
    }

    // Verificar se o usuário já apostou nessa rodada
    const existingBet = await prisma.bet.findFirst({
      where: {
        userId: user.id,
        roundId: roundId,
      },
    });
    
    if (existingBet) {
      return res.status(400).json({ message: 'Você já apostou nesta rodada' });
    }
    
    let gameRoundExists = false;
    let roundExists = false;
    
    // Verificar se a rodada já existe no modelo Round (OBRIGATÓRIO para a aposta)
    try {
      console.log('Verificando se a rodada existe no modelo Round...');
      const existingRound = await prisma.round.findUnique({
        where: { id: roundId },
      });
      
      if (existingRound) {
        console.log('Rodada encontrada no modelo Round:', existingRound.id);
        roundExists = true;
      } else {
        // Criar a rodada no modelo Round (necessário devido à relação com Bet)
        console.log('Criando nova rodada no modelo Round...');
        await prisma.round.create({
          data: {
            id: roundId,
            result: 1.0, // Valor temporário
            startTime: new Date(),
            endTime: new Date(Date.now() + 60000), // +1 minuto
            status: 'BETTING',
          },
        });
        console.log('Nova rodada criada com sucesso no modelo Round:', roundId);
        roundExists = true;
      }
    } catch (error) {
      console.error('Erro ao verificar/criar rodada no modelo Round:', error);
      return res.status(500).json({ 
        message: 'Erro ao criar rodada de jogo necessária',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
    
    // Se a rodada não foi criada no Round, não podemos prosseguir
    if (!roundExists) {
      return res.status(500).json({ 
        message: 'Não foi possível criar a rodada necessária para registrar a aposta'
      });
    }
    
    // Para o Multiplicador, também tentamos criar no GameRound
    if (gameType === 'multiplicador') {
      try {
        // @ts-ignore - O modelo gameRound existe no schema mas não no tipo PrismaClient
        const gameRound = await prisma.gameRound.findUnique({
          where: { id: roundId },
        });
        
        if (gameRound) {
          gameRoundExists = true;
          console.log('Rodada encontrada no modelo GameRound:', gameRound.id);
        } else {
          // Se não existir, criar uma nova rodada no GameRound
          console.log('Criando nova rodada no modelo GameRound...');
          // @ts-ignore - O modelo gameRound existe no schema mas não no tipo PrismaClient
          await prisma.gameRound.create({
            data: {
              id: roundId,
              gameType: 'multiplicador',
              startTime: new Date(),
              endTime: new Date(Date.now() + 30000), // +30 segundos
              status: 'BETTING',
              result: 1.0, // Valor temporário inicial
            },
          });
          gameRoundExists = true;
          console.log('Nova rodada do GameRound criada com sucesso:', roundId);
        }
      } catch (error) {
        console.error('Erro ao buscar/criar GameRound:', error);
        // Não falhar se não conseguir criar a rodada no GameRound, já que temos o Round
      }
    }
    
    // Atualizar o saldo da casa para o Multiplicador
    if (gameType === 'multiplicador') {
      try {
        // @ts-ignore - O modelo houseBalance existe no schema mas não no tipo PrismaClient
        const houseBalance = await prisma.houseBalance.findFirst({
          where: { gameType: gameType },
        });
        
        if (!houseBalance) {
          // Criar registro inicial se não existir
          // @ts-ignore - O modelo houseBalance existe no schema mas não no tipo PrismaClient
          await prisma.houseBalance.create({
            data: {
              gameType: gameType,
              balance: 100000 + amount, // Valor inicial + aposta
              totalBets: 1,
              totalBetAmount: amount,
            },
          });
        } else {
          // Atualizar saldo existente
          // @ts-ignore - O modelo houseBalance existe no schema mas não no tipo PrismaClient
          await prisma.houseBalance.update({
            where: { id: houseBalance.id },
            data: {
              balance: houseBalance.balance + amount,
              totalBets: houseBalance.totalBets + 1,
              totalBetAmount: houseBalance.totalBetAmount + amount,
            },
          });
        }
      } catch (error) {
        console.error('Erro ao atualizar HouseBalance:', error);
        // Não falhar se não conseguir atualizar o saldo da casa
      }
    }
    
    // Usar transação para garantir consistência entre aposta e atualização de saldo
    console.log('Registrando aposta e atualizando saldo usando transação');
    let bet, newBalance;
    try {
      // Executar todas as operações em uma única transação
      const result = await prisma.$transaction(async (tx) => {
        // 1. Criar a aposta
        const newBet = await tx.bet.create({
          data: {
            userId: user.id,
            gameType: gameType,
            roundId: roundId,
            amount: amount,
            status: BetStatus.PENDING, // Enum importado de game-constants
          },
        });
        
        // 2. Atualizar saldo do usuário
        const userToUpdate = await tx.user.findUnique({
          where: { id: user.id },
          select: { balance: true }
        });
        
        if (!userToUpdate) {
          throw new Error('Usuário não encontrado durante a transação');
        }
        
        // Aplicar a dedução com proteção para saldo negativo
        const updatedBalance = Math.max(0, userToUpdate.balance - amount);
        
        // Atualizar o saldo
        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: { 
            balance: updatedBalance,
            totalBets: { increment: amount } // Atualizar valor total apostado
          },
          select: { balance: true }
        });
        
        // 3. Registrar a transação para auditoria
        await tx.transaction.create({
          data: {
            userId: user.id,
            amount: -amount, // Valor negativo pois é uma aposta
            type: 'WITHDRAWAL',
            status: 'COMPLETED',
            details: JSON.stringify({
              description: 'Aposta em jogo',
              gameType: gameType,
              roundId: roundId,
              betId: newBet.id
            })
          }
        });
        
        return { bet: newBet, newBalance: updatedUser.balance };
      });
      
      // Atribuir resultados da transação
      bet = result.bet;
      newBalance = result.newBalance;
      
      console.log('Transação concluída com sucesso');
    } catch (txError) {
      console.error('Erro na transação:', txError);
      throw new Error('Falha ao registrar aposta: ' + 
        (txError instanceof Error ? txError.message : 'Erro desconhecido'));
    }
    
    // Retornar sucesso
    return res.status(200).json({ 
      success: true, 
      bet: bet,
      newBalance: newBalance,
      dailyTotal: dailyTotal + amount
    });
    
  } catch (error) {
    console.error('Erro ao processar aposta:', error);
    
    // Fornecer mais detalhes sobre o erro
    let errorMessage = 'Erro interno do servidor';
    let errorDetails = null;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack;
    }
    
    // Log detalhado para depuração no lado do servidor
    console.error('Detalhes do erro:', {
      message: errorMessage,
      stack: errorDetails,
      time: new Date().toISOString()
    });
    
    return res.status(500).json({ 
      message: errorMessage,
      error: errorDetails
    });
  }
} 
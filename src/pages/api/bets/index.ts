import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../auth/[...nextauth]';

// Constantes de segurança
const BETTING_PHASE_DURATION = 10000; // 10 segundos para apostas
const MIN_BET_AMOUNT = 5;             // Aposta mínima: R$ 5,00
const MAX_BET_AMOUNT = 1000;          // Aposta máxima: R$ 1000,00
const DAILY_BET_LIMIT = 5000;         // Limite diário: R$ 5000,00

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Garantir que temos um tratamento de erros global
  try {
    // Obter sessão usando getServerSession em vez de getSession
    const session = await getServerSession(req, res, authOptions);

    console.log('API de apostas - Sessão do usuário:', session ? 'Autenticado' : 'Não autenticado');

    if (!session || !session.user?.id) {
      return res.status(401).json({ message: 'Não autorizado. Faça login primeiro.' });
    }

    if (req.method === 'POST') {
      try {
        console.log('Solicitação de aposta recebida:', req.body);
        const { amount, type, roundId } = req.body;

        // Validação básica dos dados
        if (!amount || !type) {
          return res.status(400).json({ message: 'Dados incompletos. Informe valor e tipo da aposta.' });
        }

        // Validação de tipo de aposta
        if (type !== 'ABOVE' && type !== 'BELOW') {
          return res.status(400).json({ message: 'Tipo de aposta inválido. Use ABOVE ou BELOW.' });
        }

        // Validação de valor usando parseFloat para garantir número
        const betAmount = parseFloat(amount);
        
        // Verificar se é um número válido
        if (isNaN(betAmount) || betAmount <= 0) {
          return res.status(400).json({ message: 'Valor de aposta inválido.' });
        }
        
        // Verificar limite mínimo
        if (betAmount < MIN_BET_AMOUNT) {
          return res.status(400).json({ 
            message: `Valor mínimo de aposta é R$ ${MIN_BET_AMOUNT.toFixed(2)}.`,
            minBet: MIN_BET_AMOUNT
          });
        }
        
        // Verificar limite máximo
        if (betAmount > MAX_BET_AMOUNT) {
          return res.status(400).json({ 
            message: `Valor máximo de aposta é R$ ${MAX_BET_AMOUNT.toFixed(2)}.`,
            maxBet: MAX_BET_AMOUNT
          });
        }

        console.log('Buscando usuário:', session.user.id);
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
        });

        if (!user) {
          return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        console.log('Saldo do usuário:', user.balance);
        // Verificação rigorosa de saldo com margem de segurança
        if (user.balance < betAmount || user.balance - betAmount < 0) {
          return res.status(400).json({ 
            message: 'Saldo insuficiente para apostar este valor',
            currentBalance: user.balance
          });
        }

        // Verificar limite diário de apostas
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        
        const dailyBets = await prisma.bet.findMany({
          where: {
            userId: user.id,
            createdAt: {
              gte: startOfDay,
              lte: endOfDay
            }
          },
          select: {
            amount: true
          }
        });
        
        const totalDailyBets = dailyBets.reduce((sum, bet) => sum + bet.amount, 0) + betAmount;
        
        if (totalDailyBets > DAILY_BET_LIMIT) {
          return res.status(400).json({ 
            message: `Você atingiu o limite diário de apostas (R$ ${DAILY_BET_LIMIT.toFixed(2)})`,
            dailyLimit: DAILY_BET_LIMIT,
            currentDailyTotal: totalDailyBets - betAmount
          });
        }

        // Buscar a rodada atual ou usar o ID fornecido
        console.log('Buscando rodada:', roundId || 'atual');
        const currentRound = roundId 
          ? await prisma.round.findUnique({ where: { id: roundId } })
          : await prisma.round.findFirst({
              where: {
                endTime: {
                  gt: new Date(),
                },
              },
              orderBy: {
                startTime: 'desc',
              },
            });

        if (!currentRound) {
          return res.status(400).json({ message: 'Não há rodada em andamento' });
        }

        // Verificar se estamos na fase de apostas
        const now = new Date();
        const bettingEndTime = new Date(currentRound.startTime.getTime() + BETTING_PHASE_DURATION);

        console.log('Fase atual:', now > bettingEndTime ? 'RUNNING' : 'BETTING');
        if (now > bettingEndTime) {
          return res.status(400).json({ 
            message: 'Tempo de apostas encerrado para esta rodada',
            phase: 'RUNNING'
          });
        }

        // Verificar se o usuário já apostou nesta rodada
        console.log('Verificando apostas existentes...');
        const existingBet = await prisma.bet.findFirst({
          where: {
            userId: user.id,
            roundId: currentRound.id
          }
        });

        if (existingBet) {
          return res.status(400).json({ 
            message: 'Você já fez uma aposta nesta rodada',
            existingBet: {
              amount: existingBet.amount,
              type: existingBet.type,
              createdAt: existingBet.createdAt
            }
          });
        }

        // Em vez de usar transações, vamos implementar verificações sequenciais robustas
        console.log('Criando nova aposta e atualizando saldo...');
        
        // 1. Verificar novamente o saldo (dupla verificação)
        const freshUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { balance: true }
        });
        
        if (!freshUser || freshUser.balance < betAmount) {
          return res.status(400).json({
            message: 'Saldo insuficiente verificado na verificação final',
            currentBalance: freshUser?.balance || 0
          });
        }
        
        // 2. Verificar novamente que não há aposta duplicada
        const freshExistingBet = await prisma.bet.findFirst({
          where: {
            userId: user.id,
            roundId: currentRound.id
          }
        });
        
        if (freshExistingBet) {
          return res.status(400).json({
            message: 'Aposta duplicada detectada na verificação final',
            existingBet: {
              amount: freshExistingBet.amount,
              type: freshExistingBet.type,
              createdAt: freshExistingBet.createdAt
            }
          });
        }
        
        // 3. Criar a aposta
        const bet = await prisma.bet.create({
          data: {
            amount: betAmount,
            type,
            userId: user.id,
            roundId: currentRound.id,
          },
        });
        
        // 4. Atualizar o saldo do usuário
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            balance: {
              decrement: betAmount,
            },
          },
          select: {
            balance: true
          }
        });

        console.log('Aposta realizada com sucesso:', bet.id);
        
        // Incluir informações adicionais na resposta
        return res.status(201).json({
          id: bet.id,
          amount: bet.amount,
          type: bet.type,
          createdAt: bet.createdAt,
          newBalance: updatedUser.balance,
          limits: {
            min: MIN_BET_AMOUNT,
            max: MAX_BET_AMOUNT,
            daily: DAILY_BET_LIMIT
          }
        });
      } catch (error) {
        console.error('Erro ao criar aposta:', error);
        
        // Tratamento específico para erros conhecidos
        if (error instanceof Error) {
          return res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
        }
        return res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }

    if (req.method === 'GET') {
      try {
        console.log('Buscando apostas do usuário:', session.user.id);
        const bets = await prisma.bet.findMany({
          where: {
            userId: session.user.id,
          },
          include: {
            round: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        });

        return res.status(200).json(bets);
      } catch (error) {
        console.error('Erro ao buscar apostas:', error);
        if (error instanceof Error) {
          return res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
        }
        return res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }

    return res.status(405).json({ message: 'Método não permitido' });
  } catch (globalError) {
    console.error('Erro global na API de apostas:', globalError);
    if (globalError instanceof Error) {
      return res.status(500).json({ 
        message: 'Erro interno do servidor', 
        error: globalError.message,
        stack: process.env.NODE_ENV === 'development' ? globalError.stack : undefined
      });
    }
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
} 
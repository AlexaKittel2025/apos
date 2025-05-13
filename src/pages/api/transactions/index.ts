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

  if (!session) {
    return res.status(401).json({ message: 'Não autorizado. Faça login primeiro.' });
  }

  if (req.method === 'POST') {
    try {
      console.log('Solicitação de transação recebida:', req.body);
      const { amount, type } = req.body;

      if (!amount || !type) {
        return res.status(400).json({ message: 'Dados incompletos. Informe valor e tipo da transação.' });
      }

      console.log('Buscando usuário:', session.user.id);
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }

      if (type === 'WITHDRAWAL' && user.balance < amount) {
        return res.status(400).json({ message: 'Saldo insuficiente para este saque' });
      }

      console.log('Criando transação...');
      const transaction = await prisma.transaction.create({
        data: {
          amount,
          type,
          userId: user.id,
        },
      });

      console.log('Atualizando saldo do usuário...');
      if (type === 'DEPOSIT') {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            balance: {
              increment: amount,
            },
          },
        });
      } else if (type === 'WITHDRAWAL') {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            balance: {
              decrement: amount,
            },
          },
        });
      }

      console.log('Transação concluída com sucesso:', transaction.id);
      return res.status(201).json(transaction);
    } catch (error) {
      console.error('Erro ao criar transação:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  if (req.method === 'GET') {
    try {
      console.log('Buscando transações do usuário:', session.user.id);
      const transactions = await prisma.transaction.findMany({
        where: {
          userId: session.user.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      });

      return res.status(200).json(transactions);
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ message: 'Método não permitido' });
} 
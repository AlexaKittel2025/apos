import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user?.id) {
    return res.status(401).json({ message: 'Não autorizado. Faça login primeiro.' });
  }

  // Aceitar somente método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { name } = req.body;
    
    // Validar dados
    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
      return res.status(400).json({ message: 'O nome deve ter pelo menos 2 caracteres' });
    }

    // Se o nome não for fornecido
    if (name === undefined) {
      return res.status(400).json({ message: 'Nenhum dado válido para atualização' });
    }

    console.log(`Atualizando nome do usuário ${session.user.id}:`, name);

    // Atualizar apenas o nome do usuário no banco de dados
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { name },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    // Retornar os campos phone e address como nulos (ou vazios) para compatibilidade com o frontend
    return res.status(200).json({
      ...updatedUser,
      phone: null,
      address: null
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
} 
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

// Armazenamento temporário de dados de perfil por usuário
const userProfiles: Record<string, any> = {};

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
    const { name, phone, address } = req.body;
    
    // Validar dados
    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
      return res.status(400).json({ message: 'O nome deve ter pelo menos 2 caracteres' });
    }

    // Armazenar dados temporariamente (memória volátil)
    if (!userProfiles[session.user.id]) {
      userProfiles[session.user.id] = {};
    }
    
    // Atualizar os dados do perfil temporário
    if (name !== undefined) userProfiles[session.user.id].name = name;
    if (phone !== undefined) userProfiles[session.user.id].phone = phone;
    if (address !== undefined) userProfiles[session.user.id].address = address;

    console.log(`Perfil temporário atualizado para ${session.user.id}:`, userProfiles[session.user.id]);

    // Retornar o perfil atualizado
    return res.status(200).json({
      id: session.user.id,
      email: session.user.email,
      name: userProfiles[session.user.id].name || session.user.name,
      phone: userProfiles[session.user.id].phone || '',
      address: userProfiles[session.user.id].address || ''
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil temporário:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
} 
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Não usar esta API em produção!
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'API não encontrada' });
  }

  if (req.method === 'POST') {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios' });
      }

      // Buscar usuário no banco de dados
      console.log('Buscando usuário com email:', email);
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        console.log('Usuário não encontrado');
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }

      console.log('Usuário encontrado:', {
        id: user.id,
        email: user.email,
        role: user.role,
        passwordLength: user.password.length
      });

      // Verificar senha
      console.log('Verificando senha...');
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('Senha válida?', isPasswordValid);

      if (!isPasswordValid) {
        console.log('Senha inválida');
        return res.status(401).json({ message: 'Senha inválida' });
      }

      // Autenticação bem-sucedida
      return res.status(200).json({
        message: 'Autenticação bem-sucedida',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('ERRO DE AUTENTICAÇÃO:', error);
      return res.status(500).json({ 
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return res.status(405).json({ message: 'Método não permitido' });
} 
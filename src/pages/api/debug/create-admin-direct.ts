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
      // Criar usuário administrador fixo
      const name = 'Financeiro';
      const email = 'financeiro@pedirsanto.com';
      const password = 'sosederbelE@1';

      // Verificar se já existe
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(200).json({ 
          message: 'Usuário já existe',
          user: {
            id: existingUser.id,
            name: existingUser.name,
            email: existingUser.email,
            role: existingUser.role
          }
        });
      }

      // Gerar hash da senha
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log('Hash da senha gerado:', { 
        email, 
        passwordOriginal: password,
        passwordHash: hashedPassword,
        hashLength: hashedPassword.length
      });

      // Criar usuário administrador
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'ADMIN',
        },
      });

      console.log('Usuário administrador criado com sucesso (direto):', {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        passwordLength: user.password.length
      });
      
      // Testar autenticação com o usuário recém-criado
      console.log('Testando autenticação com o usuário recém-criado...');
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('Autenticação teste bem-sucedida?', isPasswordValid);
      
      return res.status(201).json({
        message: 'Usuário administrador criado com sucesso',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('ERRO AO CRIAR USUÁRIO ADMIN DIRETO:', error);
      return res.status(500).json({ 
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return res.status(405).json({ message: 'Método não permitido' });
} 
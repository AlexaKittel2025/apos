import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { User } from 'next-auth';
import { prisma } from '@/lib/prisma';

interface ExtendedUser extends User {
  id: string;
  role: string;
  phone?: string | null;
  address?: string | null;
}

// Estender a sessão do NextAuth para incluir nossas propriedades personalizadas
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      phone?: string | null;
      address?: string | null;
    }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        try {
          console.log('========== TENTATIVA DE LOGIN ==========');
          console.log('Credenciais recebidas:', credentials?.email);
          
          if (!credentials?.email || !credentials?.password) {
            console.error('Email ou senha não fornecidos');
            return null;
          }

          console.log('Buscando usuário no banco de dados');
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          console.log('Usuário encontrado?', !!user);
          if (!user) {
            console.error('Usuário não encontrado');
            return null;
          }

          console.log('Informações do usuário:', { 
            id: user.id, 
            email: user.email, 
            role: user.role, 
            passwordLength: user.password?.length || 0 
          });
          
          console.log('Verificando senha');
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          console.log('Senha válida?', isPasswordValid);
          if (!isPasswordValid) {
            console.error('Senha inválida');
            return null;
          }

          console.log('Login bem-sucedido:', user.id);
          console.log('Retornando usuário para o NextAuth:', { 
            id: user.id, 
            email: user.email, 
            name: user.name, 
            role: user.role 
          });
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            phone: user.phone,
            address: user.address
          } as ExtendedUser;
        } catch (error) {
          console.error('ERRO DURANTE AUTENTICAÇÃO:', error);
          return null;
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || 'green-game-secret-key',
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'jwt-secret-key-for-green-game',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        console.log('Criando JWT para usuário:', user.email);
        token.id = (user as ExtendedUser).id;
        token.role = (user as ExtendedUser).role;
        token.phone = (user as ExtendedUser).phone;
        token.address = (user as ExtendedUser).address;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        console.log('Criando sessão para token:', token);
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.phone = token.phone as string | null;
        session.user.address = token.address as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  debug: true,
};

export default NextAuth(authOptions); 
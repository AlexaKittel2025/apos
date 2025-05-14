import { PrismaClient } from '@prisma/client';

// Padrão de singleton para evitar múltiplas conexões
declare global {
  var prisma: PrismaClient | undefined;
}

// Configuração otimizada do Prisma com pool de conexões
export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Configurações para otimização de performance
  // Estas configurações serão aplicadas a todas as queries
  __internal: {
    query: {
      // Número máximo de conexões simultâneas (ajuste baseado no seu banco de dados)
      connectionLimit: 10,
    },
  },
});

// Prevenir múltiplas instâncias durante hot reloading no desenvolvimento
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

// Função auxiliar para transações
export const prismaTransaction = async <T>(
  fn: (prisma: PrismaClient) => Promise<T>
): Promise<T> => {
  try {
    return await prisma.$transaction(async (tx) => {
      return await fn(tx as unknown as PrismaClient);
    });
  } catch (error) {
    console.error('Erro na transação:', error);
    throw error;
  }
}; 
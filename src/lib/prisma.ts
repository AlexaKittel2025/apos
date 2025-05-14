import { PrismaClient } from '@prisma/client';

// Padrão de singleton para evitar múltiplas conexões
declare global {
  var prisma: PrismaClient | undefined;
}

// Verificar se a variável de ambiente DATABASE_URL está definida
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL não está definido no ambiente');
}

// Configuração otimizada do Prisma com pool de conexões
export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: databaseUrl,
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
  fn: (prisma: Omit<PrismaClient, '$transaction'>) => Promise<T>
): Promise<T> => {
  try {
    // Usar a funcionalidade de transação do Prisma
    return await prisma.$transaction(async (tx) => {
      return await fn(tx);
    });
  } catch (error) {
    console.error('Erro na transação:', error);
    throw error;
  }
}; 
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

// Configuração do Prisma com configurações compatíveis
export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Prevenir múltiplas instâncias durante hot reloading no desenvolvimento
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

// Função auxiliar para transações
export const prismaTransaction = async <T>(
  fn: (prisma: PrismaClient) => Promise<T>
): Promise<T> => {
  try {
    // Executar operações no mesmo cliente para simular transações
    return await fn(prisma);
  } catch (error) {
    console.error('Erro na transação:', error);
    throw error;
  }
}; 
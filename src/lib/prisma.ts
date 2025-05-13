import { PrismaClient } from '@prisma/client';

// Declarando o tipo global para o PrismaClient
declare global {
  var prisma: PrismaClient | undefined;
}

// Evita múltiplas instâncias do Prisma Client em desenvolvimento devido ao Hot Reloading
export const prisma = global.prisma || new PrismaClient();

// No ambiente de desenvolvimento, salva a instância no objeto global
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
} 
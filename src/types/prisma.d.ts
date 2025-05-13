// Este arquivo complementa as definições de tipo do Prisma
declare module '@prisma/client' {
  export class PrismaClient {
    constructor(options?: { log?: Array<string> });
    user: {
      findUnique(args: any): Promise<any>;
      findMany(args: any): Promise<any[]>;
      findFirst(args: any): Promise<any>;
      create(args: any): Promise<any>;
      update(args: any): Promise<any>;
      delete(args: any): Promise<any>;
      count(args?: any): Promise<number>;
    };
    bet: {
      findUnique(args: any): Promise<any>;
      findMany(args: any): Promise<any[]>;
      findFirst(args: any): Promise<any>;
      create(args: any): Promise<any>;
      update(args: any): Promise<any>;
      delete(args: any): Promise<any>;
      count(args?: any): Promise<number>;
      aggregate(args: any): Promise<any>;
    };
    round: {
      findUnique(args: any): Promise<any>;
      findMany(args: any): Promise<any[]>;
      findFirst(args: any): Promise<any>;
      create(args: any): Promise<any>;
      update(args: any): Promise<any>;
      delete(args: any): Promise<any>;
      aggregate(args: any): Promise<any>;
    };
    transaction: {
      findUnique(args: any): Promise<any>;
      findMany(args: any): Promise<any[]>;
      findFirst(args: any): Promise<any>;
      create(args: any): Promise<any>;
      update(args: any): Promise<any>;
      delete(args: any): Promise<any>;
    };
  }
} 
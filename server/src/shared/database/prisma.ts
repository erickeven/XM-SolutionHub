import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../generated/prisma/client.js";

export function createPrismaClient(databaseUrl: string): PrismaClient {
  const adapter = new PrismaMariaDb(databaseUrl);
  return new PrismaClient({ adapter });
}

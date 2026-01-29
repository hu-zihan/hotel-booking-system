import "dotenv/config";
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaMariaDb({
  host: process.env.DB_HOST || "localhost", // ⭐ docker 内用 mysql
  port: process.env.DB_PORT || 23306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+08:00"
});
console.log("✅ Prisma MariaDB adapter configured:", {
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD ,
  user: process.env.DB_USER,
});
const prisma = new PrismaClient({ adapter });

export { prisma }
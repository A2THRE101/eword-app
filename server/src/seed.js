import "dotenv/config";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const login = normalizeLogin(process.env.DEMO_LOGIN || "murad");
const password = process.env.DEMO_PASSWORD || "1234";
const name = process.env.DEMO_NAME || "Мурад";

const passwordHash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
});

await prisma.user.upsert({
  where: { login },
  create: {
    login,
    name,
    passwordHash,
  },
  update: {
    name,
    passwordHash,
  },
});

console.log(`Seeded demo user: ${login}`);
await prisma.$disconnect();

function normalizeLogin(value) {
  return value.trim().toLowerCase();
}

import "dotenv/config";
import argon2 from "argon2";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import morgan from "morgan";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();
const app = express();
const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be set and contain at least 32 characters.");
}

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json({ limit: "32kb" }));
app.use(morgan("tiny"));

const credentialsSchema = z.object({
  login: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(4).max(128),
});

const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(1).max(80),
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "eword-auth-backend" });
});

app.post("/auth/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const login = normalizeLogin(input.login);
    const existingUser = await prisma.user.findUnique({ where: { login } });

    if (existingUser) {
      return res.status(409).json({ error: "LOGIN_ALREADY_EXISTS" });
    }

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        login,
        name: input.name,
        passwordHash,
      },
      select: userSelect,
    });

    res.status(201).json({ token: signToken(user), user });
  } catch (error) {
    next(error);
  }
});

app.post("/auth/login", async (req, res, next) => {
  try {
    const input = credentialsSchema.parse(req.body);
    const login = normalizeLogin(input.login);
    const userWithPassword = await prisma.user.findUnique({ where: { login } });

    if (!userWithPassword) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }

    const passwordOk = await argon2.verify(userWithPassword.passwordHash, input.password);
    if (!passwordOk) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }

    const user = toPublicUser(userWithPassword);
    res.json({ token: signToken(user), user });
  } catch (error) {
    next(error);
  }
});

app.get("/auth/me", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: userSelect,
    });

    if (!user) {
      return res.status(401).json({ error: "SESSION_EXPIRED" });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: "VALIDATION_ERROR", details: error.flatten() });
  }

  console.error(error);
  res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
});

app.listen(port, () => {
  console.log(`Eword auth backend is listening on http://localhost:${port}`);
});

function authenticate(req, res, next) {
  const token = readBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ error: "MISSING_TOKEN" });
  }

  try {
    req.auth = jwt.verify(token, jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: "INVALID_TOKEN" });
  }
}

function readBearerToken(header) {
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

function signToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      login: user.login,
    },
    jwtSecret,
    { expiresIn: "7d" },
  );
}

function normalizeLogin(value) {
  return value.trim().toLowerCase();
}

function hashPassword(password) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

const userSelect = {
  id: true,
  login: true,
  name: true,
  createdAt: true,
};

function toPublicUser(user) {
  return {
    id: user.id,
    login: user.login,
    name: user.name,
    createdAt: user.createdAt,
  };
}

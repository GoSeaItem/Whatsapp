import { Router } from "express";
import { Prisma } from "@prisma/client";
import type { AuthResponse, LoginRequest, RegisterRequest } from "@wa-ai/shared";
import {
  buildClearSessionCookie,
  buildSessionCookie,
  createRequireAuth,
  createSessionToken,
  getSessionExpiry,
  getSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword
} from "./auth.js";
import { prisma } from "./db.js";

type AuthDb = typeof prisma;

export function createAuthRouter(db: AuthDb = prisma) {
  const router = Router();
  const requireAuth = createRequireAuth(db);

  router.post("/register", async (req, res, next) => {
    try {
      const body = req.body as RegisterRequest;
      const errors = validateRegisterPayload(body);
      if (errors.length > 0) {
        res.status(400).json({ message: "Validation failed", errors });
        return;
      }

      const user = await db.user.create({
        data: {
          email: normalizeEmail(body.email),
          name: cleanString(body.name),
          passwordHash: hashPassword(body.password)
        },
        select: { id: true, email: true, name: true }
      });

      const token = createSessionToken();
      await db.authSession.create({
        data: {
          userId: user.id,
          tokenHash: hashSessionToken(token),
          expiresAt: getSessionExpiry()
        }
      });

      res.setHeader("Set-Cookie", buildSessionCookie(token));
      res.status(201).json({ user } satisfies AuthResponse);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        res.status(409).json({ message: "Email already registered" });
        return;
      }
      next(error);
    }
  });

  router.post("/login", async (req, res, next) => {
    try {
      const body = req.body as LoginRequest;
      const errors = validateLoginPayload(body);
      if (errors.length > 0) {
        res.status(400).json({ message: "Validation failed", errors });
        return;
      }

      const user = await db.user.findUnique({
        where: { email: normalizeEmail(body.email) },
        select: { id: true, email: true, name: true, passwordHash: true }
      });

      if (!user || !verifyPassword(body.password, user.passwordHash)) {
        res.status(401).json({ message: "Invalid email or password" });
        return;
      }

      const token = createSessionToken();
      await db.authSession.create({
        data: {
          userId: user.id,
          tokenHash: hashSessionToken(token),
          expiresAt: getSessionExpiry()
        }
      });

      res.setHeader("Set-Cookie", buildSessionCookie(token));
      res.json({ user: { id: user.id, email: user.email, name: user.name } } satisfies AuthResponse);
    } catch (error) {
      next(error);
    }
  });

  router.post("/logout", async (req, res, next) => {
    try {
      const token = getSessionToken(req);
      if (token) {
        await db.authSession.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
      }
      res.setHeader("Set-Cookie", buildClearSessionCookie());
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.get("/me", requireAuth, (req, res) => {
    res.json({ user: req.user! } satisfies AuthResponse);
  });

  return router;
}

export const authRouter = createAuthRouter();

export function validateLoginPayload(input: Partial<LoginRequest>) {
  const errors: Array<{ field: string; message: string }> = [];
  if (!isValidEmail(input.email)) errors.push({ field: "email", message: "Valid email is required" });
  if (!cleanString(input.password)) errors.push({ field: "password", message: "Password is required" });
  return errors;
}

export function validateRegisterPayload(input: Partial<RegisterRequest>) {
  const errors = validateLoginPayload(input);
  if (!cleanString(input.name)) errors.push({ field: "name", message: "Name is required" });
  if (cleanString(input.password).length > 0 && cleanString(input.password).length < 8) {
    errors.push({ field: "password", message: "Password must be at least 8 characters" });
  }
  return errors;
}

function isValidEmail(value: unknown) {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeEmail(value: unknown) {
  return cleanString(value).toLowerCase();
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

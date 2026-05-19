import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "./db.js";

export const SESSION_COOKIE_NAME = "wa_ai_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const PASSWORD_KEY_LENGTH = 64;

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

type SessionLookupDb = {
  authSession: {
    findUnique(args: {
      where: { tokenHash: string };
      include: { user: true };
    }): Promise<{
      id: string;
      expiresAt: Date;
      user: { id: string; email: string; name: string };
    } | null>;
  };
};

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, hash] = storedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !hash) return false;

  const candidate = scryptSync(password, salt, PASSWORD_KEY_LENGTH);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function getSessionExpiry(now = new Date()) {
  return new Date(now.getTime() + SESSION_TTL_MS);
}

export function buildSessionCookie(token: string, env: NodeJS.ProcessEnv = process.env) {
  const { sameSite, secure, domain } = getSessionCookieOptions(env);
  return [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
    domain ? `Domain=${domain}` : "",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    secure ? "Secure" : ""
  ].filter(Boolean).join("; ");
}

export function buildClearSessionCookie(env: NodeJS.ProcessEnv = process.env) {
  const { sameSite, secure, domain } = getSessionCookieOptions(env);
  return [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
    domain ? `Domain=${domain}` : "",
    "Max-Age=0",
    secure ? "Secure" : ""
  ].filter(Boolean).join("; ");
}

export function getSessionCookieOptions(env: NodeJS.ProcessEnv = process.env) {
  const sameSite = normalizeSameSite(
    env.COOKIE_SAME_SITE ||
      env.SESSION_COOKIE_SAMESITE ||
      (env.NODE_ENV === "production" || env.CHROME_EXTENSION_ORIGIN ? "None" : "Lax")
  );
  const secure =
    env.COOKIE_SECURE === "true" ||
    env.SESSION_COOKIE_SECURE === "true" ||
    (env.COOKIE_SECURE !== "false" &&
      env.SESSION_COOKIE_SECURE !== "false" &&
      (env.NODE_ENV === "production" || sameSite === "None"));
  const domain = env.COOKIE_DOMAIN?.trim() || undefined;
  return { sameSite, secure, domain };
}

function normalizeSameSite(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === "none") return "None";
  if (normalized === "strict") return "Strict";
  return "Lax";
}

export function getSessionToken(req: Request) {
  const cookieHeader = req.headers.cookie || "";
  return parseCookies(cookieHeader)[SESSION_COOKIE_NAME] || "";
}

export function parseCookies(cookieHeader: string) {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((cookies, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) return cookies;
      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

export function createRequireAuth(db: SessionLookupDb = prisma) {
  return async function requireAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const token = getSessionToken(req);
      if (!token) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      const session = await db.authSession.findUnique({
        where: { tokenHash: hashSessionToken(token) },
        include: { user: true }
      });

      if (!session || session.expiresAt.getTime() <= Date.now()) {
        res.status(401).json({ message: "Session expired, please login again" });
        return;
      }

      req.user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requireAuth = createRequireAuth();

export function createOptionalAuth(db: SessionLookupDb = prisma) {
  return async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
    try {
      const token = getSessionToken(req);
      if (!token) {
        next();
        return;
      }

      const session = await db.authSession.findUnique({
        where: { tokenHash: hashSessionToken(token) },
        include: { user: true }
      });

      if (session && session.expiresAt.getTime() > Date.now()) {
        req.user = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name
        };
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const optionalAuth = createOptionalAuth();

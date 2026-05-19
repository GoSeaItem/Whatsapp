import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  buildClearSessionCookie,
  buildSessionCookie,
  createRequireAuth,
  createSessionToken,
  getSessionExpiry,
  hashPassword,
  hashSessionToken,
  SESSION_COOKIE_NAME,
  verifyPassword
} from "./auth.js";
import { validateLoginPayload, validateRegisterPayload } from "./auth-api.js";

describe("auth utilities and protected API middleware", () => {
  it("hashes and verifies passwords without storing plaintext", () => {
    const hash = hashPassword("TestPassword123!");

    expect(hash).toMatch(/^scrypt:/);
    expect(hash).not.toContain("TestPassword123!");
    expect(verifyPassword("TestPassword123!", hash)).toBe(true);
    expect(verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("validates login and register payloads with clear field errors", () => {
    expect(validateLoginPayload({ email: "bad", password: "" })).toEqual([
      { field: "email", message: "Valid email is required" },
      { field: "password", message: "Password is required" }
    ]);

    expect(validateRegisterPayload({ email: "user@example.com", password: "short", name: "" })).toEqual([
      { field: "name", message: "Name is required" },
      { field: "password", message: "Password must be at least 8 characters" }
    ]);
  });

  it("allows requests with a valid session cookie and attaches the current user", async () => {
    const token = createSessionToken();
    const app = express();
    const requireAuth = createRequireAuth({
      authSession: {
        async findUnique(args) {
          expect(args.where.tokenHash).toBe(hashSessionToken(token));
          return {
            id: "session-1",
            expiresAt: getSessionExpiry(),
            user: { id: "user-1", email: "sales@example.com", name: "Sales A" }
          };
        }
      }
    });

    app.get("/protected", requireAuth, (req, res) => {
      res.json({ user: req.user });
    });

    const response = await request(app)
      .get("/protected")
      .set("Cookie", `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`)
      .expect(200);

    expect(response.body.user).toEqual({ id: "user-1", email: "sales@example.com", name: "Sales A" });
  });

  it("rejects missing or expired sessions", async () => {
    const app = express();
    const requireAuth = createRequireAuth({
      authSession: {
        async findUnique() {
          return {
            id: "session-1",
            expiresAt: new Date(Date.now() - 1000),
            user: { id: "user-1", email: "sales@example.com", name: "Sales A" }
          };
        }
      }
    });

    app.get("/protected", requireAuth, (_req, res) => res.json({ ok: true }));

    await request(app).get("/protected").expect(401, { message: "Authentication required" });

    await request(app)
      .get("/protected")
      .set("Cookie", `${SESSION_COOKIE_NAME}=expired-token`)
      .expect(401, { message: "Session expired, please login again" });
  });

  it("builds secure http-only session cookies", () => {
    expect(buildSessionCookie("abc", { NODE_ENV: "development" })).toContain("HttpOnly");
    expect(buildSessionCookie("abc", { NODE_ENV: "development" })).toContain("SameSite=Lax");
    expect(buildSessionCookie("abc", { NODE_ENV: "production" })).toContain("Secure");
    expect(buildSessionCookie("abc", { NODE_ENV: "production" })).toContain("SameSite=None");
    expect(buildSessionCookie("abc", { NODE_ENV: "development", CHROME_EXTENSION_ORIGIN: "chrome-extension://abc" })).toContain("SameSite=None");
    expect(buildSessionCookie("abc", { NODE_ENV: "development", CHROME_EXTENSION_ORIGIN: "chrome-extension://abc" })).toContain("Secure");
    expect(buildSessionCookie("abc", { NODE_ENV: "production", COOKIE_SECURE: "false", COOKIE_SAME_SITE: "Lax", COOKIE_DOMAIN: ".example.com" })).toContain("Domain=.example.com");
    expect(buildSessionCookie("abc", { NODE_ENV: "production", COOKIE_SECURE: "false", COOKIE_SAME_SITE: "Lax", COOKIE_DOMAIN: ".example.com" })).not.toContain("Secure");
    expect(buildClearSessionCookie()).toContain("Max-Age=0");
  });
});


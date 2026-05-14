/**
 * Taximeter API routes
 *
 * POST /api/taxi/register            — register or re-register a driver
 * POST /api/taxi/verify-device       — verify device binding + return status
 * GET  /api/taxi/admin/totp/setup    — generate TOTP secret + QR (first-time)
 * POST /api/taxi/admin/totp/verify   — verify TOTP token (returns signed session)
 * GET  /api/taxi/users               — list all users (requires admin token)
 * POST /api/taxi/users/:id/activate  — activate user (requires admin token)
 * DELETE /api/taxi/users/:id         — delete user (requires admin token)
 */
import { Router } from "express";
import { generate as totpGenerate, verify as totpVerify, generateSecret, generateURI } from "otplib";
import QRCode from "qrcode";
import { eq, or } from "drizzle-orm";
import { db, taxiUsers, adminTotp } from "@workspace/db";
import crypto from "node:crypto";

const router = Router();

// ── Simple admin session token (HMAC-signed, no JWT dependency) ─────────────
const ADMIN_SESSION_SECRET =
  process.env["SESSION_SECRET"] ?? "taximeter-dev-secret-change-in-prod";

function signAdminToken(): string {
  const payload = `admin:${Date.now()}`;
  const sig = crypto
    .createHmac("sha256", ADMIN_SESSION_SECRET)
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const lastDot = decoded.lastIndexOf(".");
    const payload = decoded.slice(0, lastDot);
    const sig = decoded.slice(lastDot + 1);
    const expected = crypto
      .createHmac("sha256", ADMIN_SESSION_SECRET)
      .update(payload)
      .digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return false;
    }
    // Token valid for 12 hours
    const ts = Number(payload.split(":")[1]);
    return Date.now() - ts < 12 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function requireAdmin(req: any, res: any, next: any) {
  const token = (req.headers["x-admin-token"] as string) ?? "";
  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// ── Israeli ID validation (Luhn-like checksum) ───────────────────────────────
function validateIsraeliId(id: string): boolean {
  if (!/^\d{9}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(id[i]!, 10) * (i % 2 === 0 ? 1 : 2);
    if (digit > 9) digit -= 9;
    sum += digit;
  }
  return sum % 10 === 0;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const TRIAL_DAYS = 7;

function trialExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + TRIAL_DAYS);
  return d;
}

function isTrialActive(user: { status: string; expiryDate: Date | null }): boolean {
  if (user.status !== "pending") return false;
  if (!user.expiryDate) return false;
  return user.expiryDate > new Date();
}

// ── Driver registration ──────────────────────────────────────────────────────
router.post("/taxi/register", async (req, res) => {
  const { name, phone, israelId, deviceId } = req.body as {
    name?: string;
    phone?: string;
    israelId?: string;
    deviceId?: string;
  };

  if (!name || !phone) {
    res.status(400).json({ error: "name and phone are required" });
    return;
  }
  if (!israelId) {
    res.status(400).json({ error: "israelId is required" });
    return;
  }

  // Validate Israeli ID format + checksum
  const cleanId = israelId.trim().padStart(9, "0");
  if (!validateIsraeliId(cleanId)) {
    res.status(400).json({ error: "invalid_id", message: "תעודת הזהות אינה תקינה" });
    return;
  }

  try {
    // Check if this Israeli ID already has a trial/account
    const existingById = await db
      .select()
      .from(taxiUsers)
      .where(eq(taxiUsers.israelId, cleanId))
      .limit(1);

    if (existingById.length > 0) {
      const existingUser = existingById[0]!;
      // If the ID already has an account, block a new trial regardless of phone
      if (existingUser.phone !== phone.trim()) {
        res.status(409).json({
          error: "id_already_registered",
          message: "תעודת זהות זו כבר רשומה במערכת. לא ניתן לקבל ניסיון נוסף.",
        });
        return;
      }
    }

    // Check by phone
    const existing = await db
      .select()
      .from(taxiUsers)
      .where(eq(taxiUsers.phone, phone.trim()))
      .limit(1);

    if (existing.length > 0) {
      const user = existing[0]!;
      const updates: Record<string, unknown> = { updatedAt: new Date() };

      if (!user.deviceId && deviceId) updates.deviceId = deviceId;
      if (!user.israelId) updates.israelId = cleanId;
      if (user.status === "pending" && !user.expiryDate) {
        updates.expiryDate = trialExpiry();
      }

      if (Object.keys(updates).length > 1) {
        await db
          .update(taxiUsers)
          .set(updates)
          .where(eq(taxiUsers.id, user.id));
      }

      res.json({ id: user.id, status: user.status, existing: true });
      return;
    }

    // New user — start 7-day free trial immediately
    const [user] = await db
      .insert(taxiUsers)
      .values({
        name: name.trim(),
        phone: phone.trim(),
        israelId: cleanId,
        deviceId: deviceId ?? null,
        status: "pending",
        expiryDate: trialExpiry(),
      })
      .returning();

    res.status(201).json({ id: user!.id, status: user!.status, existing: false });
  } catch (err) {
    req.log.error({ err }, "register error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Device verification (called on every app launch) ─────────────────────────
router.post("/taxi/verify-device", async (req, res) => {
  const { phone, deviceId } = req.body as {
    phone?: string;
    deviceId?: string;
  };
  if (!phone || !deviceId) {
    res.status(400).json({ error: "phone and deviceId are required" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(taxiUsers)
      .where(eq(taxiUsers.phone, phone.trim()))
      .limit(1);

    if (rows.length === 0) {
      res.json({ status: "not_found", active: false });
      return;
    }

    const user = rows[0]!;

    // Device binding check
    if (user.deviceId && user.deviceId !== deviceId) {
      res.json({ status: "device_mismatch", active: false });
      return;
    }

    // Bind device if not yet bound, and backfill missing trial expiry
    const bindUpdates: Record<string, unknown> = {};
    if (!user.deviceId) bindUpdates.deviceId = deviceId;
    if (user.status === "pending" && !user.expiryDate) {
      bindUpdates.expiryDate = trialExpiry();
    }
    if (Object.keys(bindUpdates).length > 0) {
      bindUpdates.updatedAt = new Date();
      await db
        .update(taxiUsers)
        .set(bindUpdates)
        .where(eq(taxiUsers.id, user.id));
      if (bindUpdates.expiryDate) user.expiryDate = bindUpdates.expiryDate as Date;
    }

    // Expiry check — works for both "active" (paid) and "pending" (trial)
    let status = user.status;
    const now = new Date();
    if ((status === "active" || status === "pending") && user.expiryDate && user.expiryDate < now) {
      await db
        .update(taxiUsers)
        .set({ status: "expired", updatedAt: now })
        .where(eq(taxiUsers.id, user.id));
      status = "expired";
    }

    // Trial users with a valid (future) expiry date are fully active
    const trialActive = isTrialActive({ status, expiryDate: user.expiryDate });

    res.json({
      status,
      active: status === "active" || trialActive,
      expiryDate: user.expiryDate?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "verify-device error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin TOTP setup (GET — generate secret + QR) ───────────────────────────
router.get("/taxi/admin/totp/setup", async (req, res) => {
  try {
    const rows = await db.select().from(adminTotp).limit(1);

    let secret: string;
    if (rows.length > 0 && rows[0]!.enabled) {
      // Already set up — return secret so the UI can display it for manual entry
      res.json({ alreadySetup: true, secret: rows[0]!.secret });
      return;
    } else if (rows.length > 0) {
      secret = rows[0]!.secret;
    } else {
      secret = generateSecret();
      await db.insert(adminTotp).values({ secret, enabled: false });
    }

    const otpauth = generateURI({ label: "Admin", issuer: "Taximeter-Pro", secret });
    const qrDataUrl = await QRCode.toDataURL(otpauth);

    res.json({ secret, qrDataUrl, alreadySetup: false });
  } catch (err) {
    req.log.error({ err }, "totp/setup error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin TOTP verify (POST — exchange 6-digit code for session token) ───────
router.post("/taxi/admin/totp/verify", async (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token) {
    res.status(400).json({ error: "token is required" });
    return;
  }
  try {
    const rows = await db.select().from(adminTotp).limit(1);
    if (rows.length === 0) {
      res.status(404).json({ error: "TOTP not configured" });
      return;
    }

    const row = rows[0]!;
    const valid = totpVerify({ token, secret: row.secret });
    if (!valid) {
      res.status(401).json({ error: "Invalid code" });
      return;
    }

    // Mark as enabled on first successful verify
    if (!row.enabled) {
      await db.update(adminTotp).set({ enabled: true }).where(eq(adminTotp.id, row.id));
    }

    res.json({ sessionToken: signAdminToken() });
  } catch (err) {
    req.log.error({ err }, "totp/verify error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: list users ────────────────────────────────────────────────────────
router.get("/taxi/users", requireAdmin, async (req, res) => {
  try {
    const users = await db
      .select({
        id: taxiUsers.id,
        name: taxiUsers.name,
        phone: taxiUsers.phone,
        israelId: taxiUsers.israelId,
        status: taxiUsers.status,
        expiryDate: taxiUsers.expiryDate,
        registeredAt: taxiUsers.registeredAt,
        hasDevice: taxiUsers.deviceId,
      })
      .from(taxiUsers)
      .orderBy(taxiUsers.registeredAt);
    res.json(users.map((u) => ({ ...u, hasDevice: !!u.hasDevice })));
  } catch (err) {
    req.log.error({ err }, "list users error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: activate user ─────────────────────────────────────────────────────
router.post("/taxi/users/:id/activate", requireAdmin, async (req, res) => {
  const { id } = req.params as { id: string };
  const { months } = req.body as { months?: number };
  if (!months || months < 1) {
    res.status(400).json({ error: "months >= 1 required" });
    return;
  }
  try {
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + months);
    await db
      .update(taxiUsers)
      .set({ status: "active", expiryDate: expiry, updatedAt: new Date() })
      .where(eq(taxiUsers.id, id));
    res.json({ ok: true, expiryDate: expiry.toISOString() });
  } catch (err) {
    req.log.error({ err }, "activate user error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: reset device binding ───────────────────────────────────────────────
router.post("/taxi/users/:id/reset-device", requireAdmin, async (req, res) => {
  const { id } = req.params as { id: string };
  try {
    await db
      .update(taxiUsers)
      .set({ deviceId: null, updatedAt: new Date() })
      .where(eq(taxiUsers.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "reset-device error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: delete user ────────────────────────────────────────────────────────
router.delete("/taxi/users/:id", requireAdmin, async (req, res) => {
  const { id } = req.params as { id: string };
  try {
    await db.delete(taxiUsers).where(eq(taxiUsers.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "delete user error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

import express from "express";
import path from "path";
import fs from "fs";
import { createHash } from "crypto";
import Database from "better-sqlite3";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Farhad2020";
const VALID_GIFTS = new Set(["blow-dry", "beard-fade", "credit-99k"]);

// ---------------------------------------------------------------------------
// Security: derive a stable session token from the admin password.
// The plaintext password is NEVER returned in any API response.
// Client stores this token in localStorage and sends it as x-admin-password.
// ---------------------------------------------------------------------------
const ADMIN_TOKEN = createHash("sha256")
  .update(DEFAULT_ADMIN_PASSWORD + ":star-style-admin")
  .digest("hex");

app.use(express.json());

// ---------------------------------------------------------------------------
// Database Setup
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "clients.db");
const LEGACY_JSON = path.join(DATA_DIR, "clients.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_FILE);

// WAL mode: better concurrent read/write performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id               TEXT PRIMARY KEY,
    fullName         TEXT NOT NULL,
    mobile           TEXT NOT NULL,
    normalizedMobile TEXT NOT NULL UNIQUE,
    gift             TEXT NOT NULL,
    trackingCode     TEXT NOT NULL UNIQUE,
    createdAt        TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'registered'
  )
`);

// ---------------------------------------------------------------------------
// One-time migration: JSON → SQLite
// ---------------------------------------------------------------------------

(function migrateFromJson() {
  if (!fs.existsSync(LEGACY_JSON)) return;

  try {
    const raw = fs.readFileSync(LEGACY_JSON, "utf-8");
    const records: Client[] = JSON.parse(raw);
    if (!Array.isArray(records) || records.length === 0) return;

    const insert = db.prepare(`
      INSERT OR IGNORE INTO clients
        (id, fullName, mobile, normalizedMobile, gift, trackingCode, createdAt, status)
      VALUES
        (@id, @fullName, @mobile, @normalizedMobile, @gift, @trackingCode, @createdAt, @status)
    `);

    const migrateAll = db.transaction((rows: Client[]) => {
      let migrated = 0;
      for (const row of rows) {
        const result = insert.run(row);
        if (result.changes > 0) migrated++;
      }
      return migrated;
    });

    const count = migrateAll(records);
    if (count > 0) {
      console.log(
        `✓ Migrated ${count} record(s) from clients.json → clients.db`,
      );
    }
  } catch (err) {
    console.error("JSON migration error (non-fatal):", (err as Error).message);
  }
})();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Client {
  id: string;
  fullName: string;
  mobile: string;
  normalizedMobile: string;
  gift: string;
  trackingCode: string;
  createdAt: string;
  status: "registered" | "visited" | "reward-claimed";
}

// ---------------------------------------------------------------------------
// DB helpers — all use Prepared Statements (no SQL injection risk)
// ---------------------------------------------------------------------------

const stmtGetAll = db.prepare<[], Client>(
  "SELECT * FROM clients ORDER BY createdAt DESC",
);

const stmtFindByMobile = db.prepare<[string], Client>(
  "SELECT * FROM clients WHERE normalizedMobile = ?",
);

const stmtFindByCode = db.prepare<[string], { id: string }>(
  "SELECT id FROM clients WHERE trackingCode = ?",
);

const stmtInsert = db.prepare(`
  INSERT INTO clients
    (id, fullName, mobile, normalizedMobile, gift, trackingCode, createdAt, status)
  VALUES
    (@id, @fullName, @mobile, @normalizedMobile, @gift, @trackingCode, @createdAt, @status)
`);

const stmtUpdateStatus = db.prepare(
  "UPDATE clients SET status = @status WHERE id = @id",
);

const stmtFindById = db.prepare<[string], Client>(
  "SELECT * FROM clients WHERE id = ?",
);

// ---------------------------------------------------------------------------
// Atomic registration transaction
// ---------------------------------------------------------------------------

const registerTransaction = db.transaction((newClient: Client) => {
  const dup = stmtFindByMobile.get(newClient.normalizedMobile);
  if (dup)
    throw Object.assign(new Error("DUPLICATE_MOBILE"), {
      code: "DUPLICATE_MOBILE",
    });

  stmtInsert.run(newClient);
  return newClient;
});

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

function persianToEnglishDigits(str: string): string {
  const persianDigits = [
    /۰/g,
    /۱/g,
    /۲/g,
    /۳/g,
    /۴/g,
    /۵/g,
    /۶/g,
    /۷/g,
    /۸/g,
    /۹/g,
  ];
  const arabicChars = [
    /٠/g,
    /١/g,
    /٢/g,
    /٣/g,
    /٤/g,
    /٥/g,
    /٦/g,
    /٧/g,
    /٨/g,
    /٩/g,
  ];
  let result = str;
  for (let i = 0; i < 10; i++)
    result = result.replace(persianDigits[i], i.toString());
  for (let i = 0; i < 10; i++)
    result = result.replace(arabicChars[i], i.toString());
  return result;
}

function normalizeMobile(mobile: string): string {
  let cleaned = persianToEnglishDigits(mobile).replace(/\D/g, "");
  if (cleaned.startsWith("0098")) cleaned = "0" + cleaned.slice(4);
  else if (cleaned.startsWith("98") && cleaned.length > 10)
    cleaned = "0" + cleaned.slice(2);
  if (cleaned.length === 10 && cleaned.startsWith("9")) cleaned = "0" + cleaned;
  return cleaned;
}

function isValidIranMobile(mobile: string): boolean {
  return /^09\d{9}$/.test(normalizeMobile(mobile));
}

function generateTrackingCode(): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `ST-${randomNum}`;
}

function generateUniqueTrackingCode(): string {
  let code: string;
  let attempts = 0;
  do {
    if (++attempts > 200)
      throw new Error("Could not generate unique tracking code");
    code = generateTrackingCode();
  } while (stmtFindByCode.get(code));
  return code;
}

// ---------------------------------------------------------------------------
// Middleware: Body Guard
// Prevents crash when req.body is missing or non-object
// ---------------------------------------------------------------------------

function requireBody(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({ error: "درخواست نامعتبر است." });
  }
  next();
}

// ---------------------------------------------------------------------------
// Rate Limiters
// ---------------------------------------------------------------------------

const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "تعداد تلاش‌های ورود بیش از حد مجاز است. یک دقیقه صبر کنید.",
  },
});

const adminActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30, // generous for admin updating multiple clients
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "تعداد درخواست‌ها بیش از حد مجاز است. یک دقیقه صبر کنید." },
});

// ---------------------------------------------------------------------------
// Admin Authorization Middleware
// Only accepts token via header — query string intentionally removed
// ---------------------------------------------------------------------------

const authorizeAdmin = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const token = req.headers["x-admin-password"] as string | undefined;
  if (token && token === ADMIN_TOKEN) {
    next();
  } else {
    res.status(403).json({ error: "عدم دسترسی مجاز" });
  }
};

// ---------------------------------------------------------------------------
// Express API Routes
// ---------------------------------------------------------------------------

// Admin Login
// Security: returns ADMIN_TOKEN (hash), NOT the plaintext password
app.post("/api/admin/login", loginLimiter, requireBody, (req, res) => {
  const { password } = req.body;
  if (typeof password !== "string" || !password) {
    return res
      .status(400)
      .json({ success: false, error: "رمز عبور الزامی است." });
  }
  if (password === DEFAULT_ADMIN_PASSWORD) {
    res.json({ success: true, token: ADMIN_TOKEN });
  } else {
    res
      .status(401)
      .json({ success: false, error: "رمز عبور مدیریت نادرست است" });
  }
});

// Customer Registration
app.post("/api/register", requireBody, (req, res) => {
  const { fullName, mobile, gift } = req.body;

  // --- fullName validation ---
  if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
    return res
      .status(400)
      .json({ error: "لطفاً نام و نام خانوادگی خود را وارد کنید" });
  }
  const trimmedName = fullName.trim();
  if (trimmedName.length < 2) {
    return res.status(400).json({ error: "نام باید حداقل ۲ کاراکتر باشد" });
  }
  if (trimmedName.length > 100) {
    return res
      .status(400)
      .json({ error: "نام نمی‌تواند بیشتر از ۱۰۰ کاراکتر باشد" });
  }

  // --- mobile validation ---
  if (!mobile || typeof mobile !== "string" || !mobile.trim()) {
    return res
      .status(400)
      .json({ error: "لطفاً شماره موبایل خود را وارد کنید" });
  }
  if (!isValidIranMobile(mobile)) {
    return res.status(400).json({
      error: "فرمت شماره موبایل نامعتبر است. نمونه صحیح: 09123456789",
    });
  }

  // --- gift validation ---
  if (!gift || typeof gift !== "string" || !VALID_GIFTS.has(gift)) {
    return res.status(400).json({ error: "هدیه انتخابی نامعتبر است" });
  }

  const normalized = normalizeMobile(mobile);

  let trackingCode: string;
  try {
    trackingCode = generateUniqueTrackingCode();
  } catch {
    return res
      .status(500)
      .json({ error: "خطای داخلی سرور. لطفاً دوباره تلاش کنید." });
  }

  const newClient: Client = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fullName: trimmedName,
    mobile: mobile.trim(),
    normalizedMobile: normalized,
    gift,
    trackingCode,
    createdAt: new Date().toISOString(),
    status: "registered",
  };

  try {
    registerTransaction(newClient);
    res.json({ success: true, client: newClient });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === "DUPLICATE_MOBILE") {
      return res
        .status(400)
        .json({ error: "این شماره موبایل قبلاً ثبت شده است." });
    }
    const msg = (err as Error).message ?? "";
    if (msg.includes("clients.normalizedMobile")) {
      return res
        .status(400)
        .json({ error: "این شماره موبایل قبلاً ثبت شده است." });
    }
    if (msg.includes("clients.trackingCode")) {
      return res
        .status(500)
        .json({ error: "خطای داخلی سرور. لطفاً دوباره تلاش کنید." });
    }
    console.error("Registration error:", (err as Error).message);
    res.status(500).json({ error: "خطای داخلی سرور. لطفاً دوباره تلاش کنید." });
  }
});

// Get Clients List (Admin)
app.get("/api/clients", authorizeAdmin, (req, res) => {
  try {
    const clients = stmtGetAll.all();
    res.json({ success: true, clients });
  } catch (err) {
    console.error("Fetch clients error:", (err as Error).message);
    res.status(500).json({ error: "خطای داخلی سرور." });
  }
});

// Update Status (Admin)
app.post(
  "/api/clients/:id/status",
  adminActionLimiter,
  authorizeAdmin,
  requireBody,
  (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!["registered", "visited", "reward-claimed"].includes(status)) {
      return res.status(400).json({ error: "وضعیت انتخابی نامعتبر است" });
    }

    try {
      const client = stmtFindById.get(id);
      if (!client) {
        return res.status(404).json({ error: "کاربر یافت نشد" });
      }
      stmtUpdateStatus.run({ status, id });
      res.json({ success: true, client: { ...client, status } });
    } catch (err) {
      console.error("Update status error:", (err as Error).message);
      res.status(500).json({ error: "خطای داخلی سرور." });
    }
  },
);

// ---------------------------------------------------------------------------
// Global Express error handler — catches any unhandled throw in routes
// ---------------------------------------------------------------------------

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Unhandled route error:", err.message);
    res.status(500).json({ error: "خطای داخلی سرور." });
  },
);

// ---------------------------------------------------------------------------
// Process-level exception handlers — prevent Node from crashing
// ---------------------------------------------------------------------------

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err.message);
});

process.on("unhandledRejection", (reason) => {
  console.error(
    "Unhandled rejection:",
    reason instanceof Error ? reason.message : String(reason),
  );
});

// ---------------------------------------------------------------------------
// Daily Backup
// ---------------------------------------------------------------------------

const BACKUP_DIR = path.join(DATA_DIR, "backups");
const BACKUP_RETAIN_DAYS = 7;

async function runBackup() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const date = new Date().toISOString().slice(0, 10);
    const dest = path.join(BACKUP_DIR, `clients-${date}.db`);

    await db.backup(dest);
    console.log(`✓ Backup saved: ${dest}`);

    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("clients-") && f.endsWith(".db"))
      .sort();

    const toDelete = files.slice(
      0,
      Math.max(0, files.length - BACKUP_RETAIN_DAYS),
    );
    for (const f of toDelete) {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
      console.log(`✓ Old backup removed: ${f}`);
    }
  } catch (err) {
    console.error("Backup failed (non-fatal):", (err as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Frontend serving
// ---------------------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, host: HOST },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);

    setTimeout(() => {
      runBackup();
      setInterval(runBackup, 24 * 60 * 60 * 1000);
    }, 60 * 1000);
  });
}

startServer();

import express from "express";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Farhad2020";
const VALID_GIFTS = new Set(["blow-dry", "beard-fade", "credit-99k"]);

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
    console.error("JSON migration error (non-fatal):", err);
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
// DB helpers
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
// Prevents duplicate mobile AND duplicate tracking code under concurrency.
// ---------------------------------------------------------------------------

const registerTransaction = db.transaction((newClient: Client) => {
  // Double-check inside the transaction (UNIQUE constraint is the final guard)
  const dup = stmtFindByMobile.get(newClient.normalizedMobile);
  if (dup)
    throw Object.assign(new Error("DUPLICATE_MOBILE"), {
      code: "DUPLICATE_MOBILE",
    });

  stmtInsert.run(newClient);
  return newClient;
});

// ---------------------------------------------------------------------------
// Utility functions (unchanged from original)
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

/** Generates a tracking code guaranteed to be unique in the DB. */
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
// Express API Routes  (paths and responses are IDENTICAL to original)
// ---------------------------------------------------------------------------

// Admin Login
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if (password === DEFAULT_ADMIN_PASSWORD) {
    res.json({ success: true, token: DEFAULT_ADMIN_PASSWORD });
  } else {
    res
      .status(401)
      .json({ success: false, error: "رمز عبور مدیریت نادرست است" });
  }
});

// Admin Authorization Middleware
const authorizeAdmin = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const token =
    (req.headers["x-admin-password"] as string) ||
    (req.query.password as string);
  if (token === DEFAULT_ADMIN_PASSWORD) {
    next();
  } else {
    res.status(403).json({ error: "عدم دسترسی مجاز" });
  }
};

// Customer Registration
app.post("/api/register", (req, res) => {
  const { fullName, mobile, gift } = req.body;

  if (!fullName || !fullName.trim()) {
    return res
      .status(400)
      .json({ error: "لطفاً نام و نام خانوادگی خود را وارد کنید" });
  }
  if (!mobile || !mobile.trim()) {
    return res
      .status(400)
      .json({ error: "لطفاً شماره موبایل خود را وارد کنید" });
  }
  if (!isValidIranMobile(mobile)) {
    return res.status(400).json({
      error: "فرمت شماره موبایل نامعتبر است. نمونه صحیح: 09123456789",
    });
  }
  if (!VALID_GIFTS.has(gift)) {
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
    fullName: fullName.trim(),
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
    // SQLite UNIQUE constraint violation (belt-and-suspenders)
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
    console.error("Registration error:", err);
    res.status(500).json({ error: "خطای داخلی سرور. لطفاً دوباره تلاش کنید." });
  }
});

// Get Clients List (Admin)
app.get("/api/clients", authorizeAdmin, (req, res) => {
  const clients = stmtGetAll.all();
  res.json({ success: true, clients });
});

// Update Status (Admin)
app.post("/api/clients/:id/status", authorizeAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["registered", "visited", "reward-claimed"].includes(status)) {
    return res.status(400).json({ error: "وضعیت انتخابی نامعتبر است" });
  }

  const client = stmtFindById.get(id);
  if (!client) {
    return res.status(404).json({ error: "کاربر یافت نشد" });
  }

  stmtUpdateStatus.run({ status, id });
  res.json({ success: true, client: { ...client, status } });
});

// ---------------------------------------------------------------------------
// Frontend serving (unchanged)
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}

startServer();

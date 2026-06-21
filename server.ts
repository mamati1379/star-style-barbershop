import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const DEFAULT_ADMIN_PASSWORD = "Farhad2020";
const VALID_GIFTS = new Set(["blow-dry", "beard-fade", "credit-99k"]);

app.use(express.json());

// Initialize Local JSON Database
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "clients.json");

function initDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

initDb();

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

// Read and write operations
function getClients(): Client[] {
  try {
    initDb();
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database:", error);
    return [];
  }
}

function saveClients(clients: Client[]) {
  try {
    initDb();
    fs.writeFileSync(DATA_FILE, JSON.stringify(clients, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing to database:", error);
  }
}

// Mobile normalization helpers
function persianToEnglishDigits(str: string): string {
  const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicChars = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(persianDigits[i], i.toString());
  }
  for (let i = 0; i < 10; i++) {
    result = result.replace(arabicChars[i], i.toString());
  }
  return result;
}

function normalizeMobile(mobile: string): string {
  let cleaned = persianToEnglishDigits(mobile).replace(/\D/g, ""); // Remove non-digits
  
  if (cleaned.startsWith("0098")) {
    cleaned = "0" + cleaned.slice(4);
  } else if (cleaned.startsWith("98") && cleaned.length > 10) {
    cleaned = "0" + cleaned.slice(2);
  }
  
  if (cleaned.length === 10 && cleaned.startsWith("9")) {
    cleaned = "0" + cleaned;
  }
  
  return cleaned;
}

// Validate Iranian mobile structure
function isValidIranMobile(mobile: string): boolean {
  const clean = normalizeMobile(mobile);
  return /^09\d{9}$/.test(clean);
}

// Generate an authentic uppercase VIP tracking code
function generateTrackingCode(): string {
  // e.g. BRB-4927 or STAR-4389
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `ST-${randomNum}`;
}

// Express API Routes

// Admin Login
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  const masterPassword = DEFAULT_ADMIN_PASSWORD;
  
  if (password === masterPassword) {
    res.json({ success: true, token: masterPassword });
  } else {
    res.status(401).json({ success: false, error: "رمز عبور مدیریت نادرست است" });
  }
});

// Admin Authorization Middleware
const authorizeAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers["x-admin-password"] as string || req.query.password as string;
  const masterPassword = DEFAULT_ADMIN_PASSWORD;
  
  if (token === masterPassword) {
    next();
  } else {
    res.status(403).json({ error: "عدم دسترسی مجاز" });
  }
};

// Customer Registration
app.post("/api/register", (req, res) => {
  const { fullName, mobile, gift } = req.body;

  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ error: "لطفاً نام و نام خانوادگی خود را وارد کنید" });
  }

  if (!mobile || !mobile.trim()) {
    return res.status(400).json({ error: "لطفاً شماره موبایل خود را وارد کنید" });
  }

  if (!isValidIranMobile(mobile)) {
    return res.status(400).json({ error: "فرمت شماره موبایل نامعتبر است. نمونه صحیح: 09123456789" });
  }

  if (!VALID_GIFTS.has(gift)) {
    return res.status(400).json({ error: "هدیه انتخابی نامعتبر است" });
  }

  const normalized = normalizeMobile(mobile);
  const clients = getClients();

  // Check uniqueness of normalized mobile number
  const isDuplicate = clients.some(c => c.normalizedMobile === normalized);
  if (isDuplicate) {
    return res.status(400).json({ error: "این شماره موبایل قبلاً ثبت شده است." });
  }

  // Generate unique tracking code
  let trackingCode = generateTrackingCode();
  while (clients.some(c => c.trackingCode === trackingCode)) {
    trackingCode = generateTrackingCode();
  }

  const newClient: Client = {
    id: Date.now().toString(),
    fullName: fullName.trim(),
    mobile: mobile.trim(),
    normalizedMobile: normalized,
    gift,
    trackingCode,
    createdAt: new Date().toISOString(),
    status: "registered"
  };

  clients.push(newClient);
  saveClients(clients);

  res.json({ success: true, client: newClient });
});

// Get Clients List (Admin)
app.get("/api/clients", authorizeAdmin, (req, res) => {
  const clients = getClients();
  // Sort from newest to oldest
  const sortedClients = [...clients].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ success: true, clients: sortedClients });
});

// Update Status (Admin)
app.post("/api/clients/:id/status", authorizeAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["registered", "visited", "reward-claimed"].includes(status)) {
    return res.status(400).json({ error: "وضعیت انتخابی نامعتبر است" });
  }

  const clients = getClients();
  const index = clients.findIndex(c => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "کاربر یافت نشد" });
  }

  clients[index].status = status;
  saveClients(clients);

  res.json({ success: true, client: clients[index] });
});

// Serve frontend build or mount Vite dev middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        host: HOST,
      },
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

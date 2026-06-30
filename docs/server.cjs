var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = Number(process.env.PORT || 3e3);
var HOST = process.env.HOST || "0.0.0.0";
var DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Farhad2020";
var VALID_GIFTS = /* @__PURE__ */ new Set(["blow-dry", "beard-fade", "credit-99k"]);
app.use(import_express.default.json());
var DATA_DIR = import_path.default.join(process.cwd(), "data");
var DATA_FILE = import_path.default.join(DATA_DIR, "clients.json");
function initDb() {
  if (!import_fs.default.existsSync(DATA_DIR)) {
    import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!import_fs.default.existsSync(DATA_FILE)) {
    import_fs.default.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}
initDb();
function getClients() {
  try {
    initDb();
    const data = import_fs.default.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database:", error);
    return [];
  }
}
function saveClients(clients) {
  try {
    initDb();
    import_fs.default.writeFileSync(DATA_FILE, JSON.stringify(clients, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing to database:", error);
  }
}
function persianToEnglishDigits(str) {
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
    /۹/g
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
    /٩/g
  ];
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(persianDigits[i], i.toString());
  }
  for (let i = 0; i < 10; i++) {
    result = result.replace(arabicChars[i], i.toString());
  }
  return result;
}
function normalizeMobile(mobile) {
  let cleaned = persianToEnglishDigits(mobile).replace(/\D/g, "");
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
function isValidIranMobile(mobile) {
  const clean = normalizeMobile(mobile);
  return /^09\d{9}$/.test(clean);
}
function generateTrackingCode() {
  const randomNum = Math.floor(1e3 + Math.random() * 9e3);
  return `ST-${randomNum}`;
}
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  const masterPassword = DEFAULT_ADMIN_PASSWORD;
  if (password === masterPassword) {
    res.json({ success: true, token: masterPassword });
  } else {
    res.status(401).json({ success: false, error: "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0646\u0627\u062F\u0631\u0633\u062A \u0627\u0633\u062A" });
  }
});
var authorizeAdmin = (req, res, next) => {
  const token = req.headers["x-admin-password"] || req.query.password;
  const masterPassword = DEFAULT_ADMIN_PASSWORD;
  if (token === masterPassword) {
    next();
  } else {
    res.status(403).json({ error: "\u0639\u062F\u0645 \u062F\u0633\u062A\u0631\u0633\u06CC \u0645\u062C\u0627\u0632" });
  }
};
app.post("/api/register", (req, res) => {
  const { fullName, mobile, gift } = req.body;
  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ error: "\u0644\u0637\u0641\u0627\u064B \u0646\u0627\u0645 \u0648 \u0646\u0627\u0645 \u062E\u0627\u0646\u0648\u0627\u062F\u06AF\u06CC \u062E\u0648\u062F \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F" });
  }
  if (!mobile || !mobile.trim()) {
    return res.status(400).json({ error: "\u0644\u0637\u0641\u0627\u064B \u0634\u0645\u0627\u0631\u0647 \u0645\u0648\u0628\u0627\u06CC\u0644 \u062E\u0648\u062F \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F" });
  }
  if (!isValidIranMobile(mobile)) {
    return res.status(400).json({
      error: "\u0641\u0631\u0645\u062A \u0634\u0645\u0627\u0631\u0647 \u0645\u0648\u0628\u0627\u06CC\u0644 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A. \u0646\u0645\u0648\u0646\u0647 \u0635\u062D\u06CC\u062D: 09123456789"
    });
  }
  if (!VALID_GIFTS.has(gift)) {
    return res.status(400).json({ error: "\u0647\u062F\u06CC\u0647 \u0627\u0646\u062A\u062E\u0627\u0628\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A" });
  }
  const normalized = normalizeMobile(mobile);
  const clients = getClients();
  const isDuplicate = clients.some((c) => c.normalizedMobile === normalized);
  if (isDuplicate) {
    return res.status(400).json({ error: "\u0627\u06CC\u0646 \u0634\u0645\u0627\u0631\u0647 \u0645\u0648\u0628\u0627\u06CC\u0644 \u0642\u0628\u0644\u0627\u064B \u062B\u0628\u062A \u0634\u062F\u0647 \u0627\u0633\u062A." });
  }
  let trackingCode = generateTrackingCode();
  while (clients.some((c) => c.trackingCode === trackingCode)) {
    trackingCode = generateTrackingCode();
  }
  const newClient = {
    id: Date.now().toString(),
    fullName: fullName.trim(),
    mobile: mobile.trim(),
    normalizedMobile: normalized,
    gift,
    trackingCode,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    status: "registered"
  };
  clients.push(newClient);
  saveClients(clients);
  res.json({ success: true, client: newClient });
});
app.get("/api/clients", authorizeAdmin, (req, res) => {
  const clients = getClients();
  const sortedClients = [...clients].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json({ success: true, clients: sortedClients });
});
app.post("/api/clients/:id/status", authorizeAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!["registered", "visited", "reward-claimed"].includes(status)) {
    return res.status(400).json({ error: "\u0648\u0636\u0639\u06CC\u062A \u0627\u0646\u062A\u062E\u0627\u0628\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A" });
  }
  const clients = getClients();
  const index = clients.findIndex((c) => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "\u06A9\u0627\u0631\u0628\u0631 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F" });
  }
  clients[index].status = status;
  saveClients(clients);
  res.json({ success: true, client: clients[index] });
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: {
        middlewareMode: true,
        hmr: false,
        host: HOST
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map

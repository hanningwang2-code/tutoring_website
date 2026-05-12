const crypto = require("node:crypto");
const path = require("node:path");
const express = require("express");
const Database = require("better-sqlite3");
require("dotenv").config();

const app = express();
const port = Number(process.env.PORT) || 3000;
const adminPassword = process.env.ADMIN_PASSWORD || "dev-admin-password";
const sessionSecret = process.env.SESSION_SECRET || "dev-session-secret";
const publicDir = path.join(__dirname, "public");
const dbPath = path.join(__dirname, "data", "bookings.sqlite");

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    who_needs_tutoring TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    start_timing TEXT NOT NULL,
    start_date TEXT,
    address TEXT NOT NULL,
    focus_area TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const insertBooking = db.prepare(`
  INSERT INTO bookings (
    who_needs_tutoring,
    grade_level,
    start_timing,
    start_date,
    address,
    focus_area,
    contact_name,
    email,
    phone
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const selectBookings = db.prepare(`
  SELECT
    id,
    who_needs_tutoring AS whoNeedsTutoring,
    grade_level AS gradeLevel,
    start_timing AS startTiming,
    start_date AS startDate,
    address,
    focus_area AS focusArea,
    contact_name AS contactName,
    email,
    phone,
    created_at AS createdAt
  FROM bookings
  ORDER BY datetime(created_at) DESC, id DESC
`);

function parseCookies(cookieHeader) {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce((cookies, item) => {
    const [key, ...rest] = item.trim().split("=");
    if (!key) {
      return cookies;
    }

    cookies[key] = decodeURIComponent(rest.join("="));
    return cookies;
  }, {});
}

function signSessionValue(value) {
  const signature = crypto.createHmac("sha256", sessionSecret).update(value).digest("hex");
  return `${value}.${signature}`;
}

function isValidSession(cookieValue) {
  if (!cookieValue) {
    return false;
  }

  const lastDotIndex = cookieValue.lastIndexOf(".");
  if (lastDotIndex === -1) {
    return false;
  }

  const value = cookieValue.slice(0, lastDotIndex);
  const signature = cookieValue.slice(lastDotIndex + 1);
  const expectedSignature = crypto.createHmac("sha256", sessionSecret).update(value).digest("hex");

  if (signature.length !== expectedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

function requireAdmin(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  if (!isValidSession(cookies.admin_session)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

app.use(express.json());
app.use(express.static(publicDir));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/bookings", (req, res) => {
  const {
    whoNeedsTutoring,
    gradeLevel,
    startTiming,
    startDate,
    address,
    focusArea,
    contactName,
    email,
    phone,
  } = req.body || {};

  const requiredFields = [
    whoNeedsTutoring,
    gradeLevel,
    startTiming,
    address,
    focusArea,
    contactName,
    email,
    phone,
  ];

  if (requiredFields.some((value) => typeof value !== "string" || !value.trim())) {
    return res.status(400).json({ error: "Please complete all required booking fields." });
  }

  const result = insertBooking.run(
    whoNeedsTutoring.trim(),
    gradeLevel.trim(),
    startTiming.trim(),
    typeof startDate === "string" ? startDate.trim() : "",
    address.trim(),
    focusArea.trim(),
    contactName.trim(),
    email.trim(),
    phone.trim()
  );

  res.status(201).json({
    bookingId: `BK-${String(result.lastInsertRowid).padStart(3, "0")}`,
    message: "Booking request saved successfully.",
  });
});

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};

  if (typeof password !== "string" || password !== adminPassword) {
    return res.status(401).json({ error: "Incorrect password." });
  }

  const payload = `admin:${Date.now()}`;
  const signedValue = signSessionValue(payload);

  res.setHeader(
    "Set-Cookie",
    `admin_session=${encodeURIComponent(signedValue)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=28800`
  );

  res.json({ ok: true });
});

app.post("/api/admin/logout", (_req, res) => {
  res.setHeader(
    "Set-Cookie",
    "admin_session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0"
  );
  res.json({ ok: true });
});

app.get("/api/admin/bookings", requireAdmin, (_req, res) => {
  res.json({ bookings: selectBookings.all() });
});

app.listen(port, () => {
  console.log(`Tutoring booking app running at http://localhost:${port}`);
});

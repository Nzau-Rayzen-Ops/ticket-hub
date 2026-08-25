const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "tickets.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

/* =========================
   TICKETS TABLE
========================= */

db.exec(`
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id TEXT UNIQUE NOT NULL,

  event_id TEXT NOT NULL,
  event_title TEXT NOT NULL,

  ticket_type TEXT NOT NULL,
  price INTEGER NOT NULL,
  quantity INTEGER NOT NULL,

  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,

  payment_status TEXT NOT NULL DEFAULT 'PENDING',
  ticket_status TEXT NOT NULL DEFAULT 'VALID',

  deleted_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`);

/* =========================
   TICKET MIGRATIONS
========================= */

function getTicketColumns() {
  return db
    .prepare("PRAGMA table_info(tickets)")
    .all()
    .map((column) => column.name);
}

function addTicketColumn(name, definition) {
  const columns = getTicketColumns();

  if (!columns.includes(name)) {
    db.exec(`
      ALTER TABLE tickets
      ADD COLUMN ${name} ${definition}
    `);

    console.log(`✅ Added '${name}' column to tickets table.`);
  }
}

addTicketColumn(
  "deleted_at",
  "DATETIME DEFAULT NULL"
);

addTicketColumn(
  "idempotency_key",
  "TEXT"
);

/*
  SECURITY:
  Random secret represented by QR code.
  Only its SHA-256 hash is stored.
*/
addTicketColumn(
  "qr_token_hash",
  "TEXT"
);

/*
  SHA-256 hash of the 6-digit event-day code.
*/
addTicketColumn(
  "verification_code_hash",
  "TEXT"
);

/*
  When the verification code expires.
*/
addTicketColumn(
  "verification_code_expires_at",
  "DATETIME DEFAULT NULL"
);

/*
  Prevent repeated code generation/email sending.
*/
addTicketColumn(
  "verification_code_sent_at",
  "DATETIME DEFAULT NULL"
);

/*
  Brute-force protection.
*/
addTicketColumn(
  "verification_attempts",
  "INTEGER NOT NULL DEFAULT 0"
);

/*
  When the QR/code verification process was completed.
*/
addTicketColumn(
  "verified_at",
  "DATETIME DEFAULT NULL"
);

/* =========================
   INDEXES
========================= */

db.exec(`
CREATE UNIQUE INDEX IF NOT EXISTS
idx_tickets_qr_token_hash
ON tickets(qr_token_hash)
WHERE qr_token_hash IS NOT NULL
`);

db.exec(`
CREATE INDEX IF NOT EXISTS
idx_tickets_verification_code
ON tickets(verification_code_hash)
`);

db.exec(`
CREATE INDEX IF NOT EXISTS
idx_tickets_event_id
ON tickets(event_id)
`);

/* =========================
   EVENTS TABLE
========================= */

db.exec(`
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  title TEXT NOT NULL,
  description TEXT,

  date TEXT NOT NULL,
  time TEXT NOT NULL,
  venue TEXT NOT NULL,

  price INTEGER NOT NULL DEFAULT 0,
  capacity INTEGER NOT NULL DEFAULT 0,

  image TEXT,

  status TEXT NOT NULL DEFAULT 'ACTIVE',

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  total_tickets INTEGER NOT NULL DEFAULT 0,
  available_tickets INTEGER NOT NULL DEFAULT 0,

  single_price INTEGER NOT NULL DEFAULT 0,
  couple_price INTEGER DEFAULT NULL,
  group3_price INTEGER DEFAULT NULL,

  early_bird_enabled INTEGER NOT NULL DEFAULT 0,
  early_bird_single_price INTEGER DEFAULT NULL,
  early_bird_expiry DATETIME DEFAULT NULL
)
`);

/* =========================
   EVENT MIGRATIONS
========================= */

const eventColumns = db
  .prepare("PRAGMA table_info(events)")
  .all()
  .map((column) => column.name);

const addEventColumn = (name, definition) => {
  if (!eventColumns.includes(name)) {
    db.exec(`
      ALTER TABLE events
      ADD COLUMN ${name} ${definition}
    `);

    console.log(`✅ Added '${name}' column to events table.`);
  }
};

addEventColumn(
  "single_price",
  "INTEGER NOT NULL DEFAULT 0"
);

addEventColumn(
  "couple_price",
  "INTEGER DEFAULT NULL"
);

addEventColumn(
  "group3_price",
  "INTEGER DEFAULT NULL"
);

addEventColumn(
  "early_bird_enabled",
  "INTEGER NOT NULL DEFAULT 0"
);

addEventColumn(
  "early_bird_single_price",
  "INTEGER DEFAULT NULL"
);

addEventColumn(
  "early_bird_expiry",
  "DATETIME DEFAULT NULL"
);

/* =========================
   MPESA TRANSACTIONS
========================= */

db.exec(`
CREATE TABLE IF NOT EXISTS mpesa_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  checkout_request_id TEXT NOT NULL UNIQUE,
  merchant_request_id TEXT NOT NULL,

  phone_number TEXT NOT NULL,

  amount REAL NOT NULL,

  account_reference TEXT NOT NULL,

  status TEXT NOT NULL,

  transaction_id TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`);

console.log("✅ M-Pesa transactions table ready.");

console.log("✅ Database initialized successfully.");
console.log("📁 Database path:", dbPath);

module.exports = db;
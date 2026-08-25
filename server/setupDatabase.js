// server/setupDatabase.js
const db = require("./database");

console.log("Setting up database tables...");

// Create mpesa_transactions table
db.prepare(`
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
`).run();

console.log("✅ mpesa_transactions table created successfully!");

// Also check if your tickets table has the idempotency_key column
try {
  const test = db.prepare("SELECT idempotency_key FROM tickets LIMIT 1").get();
  console.log("✅ tickets table already has idempotency_key column");
} catch (error) {
  console.log("⚠️ Adding idempotency_key to tickets table...");
  db.prepare(`
    ALTER TABLE tickets ADD COLUMN idempotency_key TEXT
  `).run();
  console.log("✅ idempotency_key column added to tickets table!");
}

console.log("✅ Database setup complete!");
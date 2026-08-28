const pool = require("../config/db");

async function createTables() {
  let client;

  try {
    console.log("🔄 Starting PostgreSQL database setup...");

    client = await pool.connect();

    await client.query("BEGIN");

    // ============================================================
    // EVENTS
    // ============================================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        date DATE,
        time VARCHAR(50),
        venue VARCHAR(255),
        price NUMERIC(12,2) DEFAULT 0,
        capacity INTEGER DEFAULT 0,
        image TEXT,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_tickets INTEGER DEFAULT 0,
        available_tickets INTEGER DEFAULT 0,
        single_price NUMERIC(12,2),
        couple_price NUMERIC(12,2),
        group3_price NUMERIC(12,2),
        early_bird_enabled BOOLEAN DEFAULT FALSE,
        early_bird_single_price NUMERIC(12,2),
        early_bird_expiry TIMESTAMP
      );
    `);

    // ============================================================
    // TICKETS
    // ============================================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        ticket_id VARCHAR(255) UNIQUE NOT NULL,
        event_id INTEGER,
        event_title VARCHAR(255),
        ticket_type VARCHAR(100),
        price NUMERIC(12,2) DEFAULT 0,
        quantity INTEGER DEFAULT 1,
        customer_name VARCHAR(255),
        customer_email VARCHAR(255),
        customer_phone VARCHAR(50),
        payment_status VARCHAR(50) DEFAULT 'PENDING',
        ticket_status VARCHAR(50) DEFAULT 'VALID',
        deleted_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        idempotency_key VARCHAR(255),
        qr_token_hash VARCHAR(255),
        verification_code_hash VARCHAR(255),
        verification_code_expires_at TIMESTAMP NULL,
        verification_code_sent_at TIMESTAMP NULL,
        verification_attempts INTEGER DEFAULT 0,
        verified_at TIMESTAMP NULL
      );
    `);

    // ============================================================
    // M-PESA TRANSACTIONS
    // ============================================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS mpesa_transactions (
        id SERIAL PRIMARY KEY,
        checkout_request_id VARCHAR(255) UNIQUE NOT NULL,
        merchant_request_id VARCHAR(255),
        phone_number VARCHAR(50),
        amount NUMERIC(12,2) NOT NULL,
        account_reference VARCHAR(255),
        status VARCHAR(50) DEFAULT 'PENDING',
        transaction_id VARCHAR(255),
        result_code VARCHAR(50),
        result_desc TEXT,
        transaction_desc VARCHAR(255),
        event_id INTEGER,
        idempotency_key VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // ADD MISSING COLUMNS
    // ============================================================

    await client.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS description TEXT;
    `);

    await client.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS total_tickets INTEGER DEFAULT 0;
    `);

    await client.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS available_tickets INTEGER DEFAULT 0;
    `);

    await client.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS single_price NUMERIC(12,2);
    `);

    await client.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS couple_price NUMERIC(12,2);
    `);

    await client.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS group3_price NUMERIC(12,2);
    `);

    await client.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS early_bird_enabled BOOLEAN DEFAULT FALSE;
    `);

    await client.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS early_bird_single_price NUMERIC(12,2);
    `);

    await client.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS early_bird_expiry TIMESTAMP;
    `);

    await client.query(`
      ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);
    `);

    await client.query(`
      ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS qr_token_hash VARCHAR(255);
    `);

    await client.query(`
      ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS verification_code_hash VARCHAR(255);
    `);

    await client.query(`
      ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMP NULL;
    `);

    await client.query(`
      ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS verification_code_sent_at TIMESTAMP NULL;
    `);

    await client.query(`
      ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 0;
    `);

    await client.query(`
      ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP NULL;
    `);

    // ============================================================
    // M-PESA MISSING COLUMNS
    // ============================================================

    await client.query(`
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS merchant_request_id VARCHAR(255);
    `);

    await client.query(`
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);
    `);

    await client.query(`
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS account_reference VARCHAR(255);
    `);

    await client.query(`
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS result_code VARCHAR(50);
    `);

    await client.query(`
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS result_desc TEXT;
    `);

    await client.query(`
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS transaction_desc VARCHAR(255);
    `);

    await client.query(`
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS event_id INTEGER;
    `);

    await client.query(`
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);
    `);

    await client.query(`
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP
      DEFAULT CURRENT_TIMESTAMP;
    `);

    // ============================================================
    // INDEXES
    // ============================================================

    await client.query(`
      CREATE INDEX IF NOT EXISTS
      idx_tickets_event
      ON tickets(event_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS
      idx_tickets_payment_status
      ON tickets(payment_status);
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
      idx_tickets_qr_token_hash
      ON tickets(qr_token_hash)
      WHERE qr_token_hash IS NOT NULL;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS
      idx_tickets_verification_code
      ON tickets(verification_code_hash);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS
      idx_mpesa_status
      ON mpesa_transactions(status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS
      idx_mpesa_event
      ON mpesa_transactions(event_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS
      idx_mpesa_checkout_request
      ON mpesa_transactions(checkout_request_id);
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
      idx_mpesa_idempotency_key
      ON mpesa_transactions(idempotency_key)
      WHERE idempotency_key IS NOT NULL;
    `);

    // ============================================================
    // VERIFY REQUIRED M-PESA COLUMN
    // ============================================================

    const check = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'mpesa_transactions'
      AND column_name = 'transaction_desc';
    `);

    if (check.rows.length === 0) {
      throw new Error(
        "transaction_desc column was NOT created."
      );
    }

    console.log("✅ transaction_desc column verified.");

    // ============================================================
    // COMMIT
    // ============================================================

    await client.query("COMMIT");

    console.log("✅ PostgreSQL tables created successfully.");
    console.log("✅ Events table ready.");
    console.log("✅ Tickets table ready.");
    console.log("✅ M-Pesa transactions table ready.");
    console.log("✅ Verification columns ready.");
    console.log("🎉 Database setup complete!");

  } catch (error) {

    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError.message);
      }
    }

    console.error("❌ PostgreSQL database setup failed:");
    console.error(error);

    throw error;

  } finally {

    if (client) {
      client.release();
    }
  }
}

module.exports = createTables;

// server/scripts/create-tables.js

const pool = require("../config/db");

async function createTables() {
  const client = await pool.connect();

  try {
    console.log(
      "🔄 Starting PostgreSQL database setup..."
    );

    await client.query("BEGIN");

    /* =========================
       EVENTS TABLE
    ========================= */

    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,

        title VARCHAR(255) NOT NULL,

        description TEXT,

        date DATE,

        time VARCHAR(50),

        venue VARCHAR(255),

        price NUMERIC(12, 2) DEFAULT 0,

        capacity INTEGER DEFAULT 0,

        image TEXT,

        status VARCHAR(50) DEFAULT 'ACTIVE',

        total_tickets INTEGER DEFAULT 0,

        available_tickets INTEGER DEFAULT 0,

        single_price NUMERIC(12, 2),

        couple_price NUMERIC(12, 2),

        group3_price NUMERIC(12, 2),

        early_bird_enabled BOOLEAN DEFAULT FALSE,

        early_bird_single_price NUMERIC(12, 2),

        early_bird_expiry TIMESTAMP,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    /* =========================
       TICKETS TABLE
    ========================= */

    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,

        ticket_id VARCHAR(255) UNIQUE NOT NULL,

        event_id INTEGER,

        event_title VARCHAR(255),

        ticket_type VARCHAR(100),

        price NUMERIC(12, 2) DEFAULT 0,

        quantity INTEGER DEFAULT 1,

        customer_name VARCHAR(255),

        customer_email VARCHAR(255),

        customer_phone VARCHAR(50),

        payment_status VARCHAR(50)
          DEFAULT 'PENDING',

        ticket_status VARCHAR(50)
          DEFAULT 'VALID',

        deleted_at TIMESTAMP NULL,

        created_at TIMESTAMP
          DEFAULT CURRENT_TIMESTAMP
      );
    `);

    /* =========================
       M-PESA TRANSACTIONS
    ========================= */

    await client.query(`
      CREATE TABLE IF NOT EXISTS mpesa_transactions (
        id SERIAL PRIMARY KEY,

        checkout_request_id VARCHAR(255)
          UNIQUE NOT NULL,

        merchant_request_id VARCHAR(255),

        phone_number VARCHAR(50),

        amount NUMERIC(12, 2) NOT NULL,

        account_reference VARCHAR(255),

        transaction_id VARCHAR(255),

        result_code VARCHAR(50),

        result_desc TEXT,

        status VARCHAR(50)
          DEFAULT 'PENDING',

        event_id INTEGER,

        idempotency_key VARCHAR(255)
          UNIQUE,

        created_at TIMESTAMP
          DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP
          DEFAULT CURRENT_TIMESTAMP
      );
    `);

    /* =========================
       ADD M-PESA COLUMNS
       FOR EXISTING DATABASES
    ========================= */

    await client.query(`
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS
      result_code VARCHAR(50);
    `);

    await client.query(`
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS
      result_desc TEXT;
    `);

    await client.query(`
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS
      transaction_id VARCHAR(255);
    `);

    await client.query(`
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS
      event_id INTEGER;
    `);

    await client.query(`
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS
      idempotency_key VARCHAR(255);
    `);

    await client.query(`
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS
      created_at TIMESTAMP
      DEFAULT CURRENT_TIMESTAMP;
    `);

    await client.query(`
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS
      updated_at TIMESTAMP
      DEFAULT CURRENT_TIMESTAMP;
    `);

    /* =========================
       INDEXES
    ========================= */

    await client.query(`
      CREATE INDEX IF NOT EXISTS
      idx_mpesa_checkout_request
      ON mpesa_transactions(checkout_request_id);
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
      idx_tickets_event
      ON tickets(event_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS
      idx_tickets_payment_status
      ON tickets(payment_status);
    `);

    await client.query("COMMIT");

    console.log(
      "✅ PostgreSQL tables created successfully."
    );

    console.log(
      "✅ M-Pesa transactions table ready."
    );

  } catch (error) {

    await client.query("ROLLBACK");

    console.error(
      "❌ Database setup failed:",
      error
    );

    process.exitCode = 1;

  } finally {

    client.release();

    await pool.end();
  }
}

createTables();
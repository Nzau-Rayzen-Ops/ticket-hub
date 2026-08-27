// server/scripts/create-mpesa-table.js

const pool = require("../config/db");

async function createMpesaTable() {
  try {
    console.log("Creating mpesa_transactions table...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS mpesa_transactions (
        id SERIAL PRIMARY KEY,

        checkout_request_id VARCHAR(100) UNIQUE NOT NULL,

        merchant_request_id VARCHAR(100),

        transaction_id VARCHAR(100),

        phone_number VARCHAR(20) NOT NULL,

        amount NUMERIC(12, 2) NOT NULL,

        account_reference VARCHAR(100) NOT NULL,

        transaction_desc VARCHAR(255),

        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

        result_code VARCHAR(50),

        result_desc TEXT,

        event_id INTEGER,

        idempotency_key VARCHAR(255) UNIQUE,

        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS
      idx_mpesa_checkout_request
      ON mpesa_transactions(checkout_request_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS
      idx_mpesa_phone
      ON mpesa_transactions(phone_number);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS
      idx_mpesa_status
      ON mpesa_transactions(status);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS
      idx_mpesa_event
      ON mpesa_transactions(event_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS
      idx_mpesa_created
      ON mpesa_transactions(created_at);
    `);

    console.log(
      "✅ mpesa_transactions table is ready."
    );

  } catch (error) {
    console.error(
      "❌ Failed to create M-Pesa table:",
      error
    );

    process.exitCode = 1;

  } finally {
    await pool.end();
  }
}

createMpesaTable();
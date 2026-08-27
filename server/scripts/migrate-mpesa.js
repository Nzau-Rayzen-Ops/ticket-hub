const pool =
  require("../config/db");

async function migrate() {

  console.log(
    "========================================"
  );

  console.log(
    "M-Pesa PostgreSQL migration"
  );

  console.log(
    "========================================"
  );

  const client =
    await pool.connect();

  try {

    await client.query(
      "BEGIN"
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS mpesa_transactions (

        id SERIAL PRIMARY KEY,

        checkout_request_id TEXT
          NOT NULL
          UNIQUE,

        merchant_request_id TEXT
          NOT NULL,

        phone_number TEXT
          NOT NULL,

        amount NUMERIC(12, 2)
          NOT NULL,

        account_reference TEXT
          NOT NULL,

        status TEXT
          NOT NULL
          DEFAULT 'PENDING',

        transaction_id TEXT,

        created_at TIMESTAMP
          DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP
          DEFAULT CURRENT_TIMESTAMP,

        event_id INTEGER,

        idempotency_key TEXT,

        result_code VARCHAR(50),

        result_desc TEXT,

        transaction_desc VARCHAR(255)
      );
    `);

    /*
      Add columns individually so this script
      can safely be run again.
    */

    await client.query(`
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS event_id INTEGER;
    `);

    await client.query(`
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
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

    /*
      Useful indexes.
    */

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
      idx_mpesa_event_id
      ON mpesa_transactions(event_id);
    `);

    /*
      PostgreSQL allows multiple NULL values
      in a normal UNIQUE constraint, which is
      fine for idempotency.

      We only want duplicate non-null keys
      rejected.
    */

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
      idx_mpesa_idempotency_key
      ON mpesa_transactions(idempotency_key)
      WHERE idempotency_key IS NOT NULL;
    `);

    await client.query(
      "COMMIT"
    );

    console.log(
      "✅ mpesa_transactions table checked/created."
    );

    console.log(
      "✅ M-Pesa indexes checked/created."
    );

    console.log(
      "========================================"
    );

    console.log(
      "✅ M-Pesa migration completed"
    );

    console.log(
      "========================================"
    );

  } catch (error) {

    await client.query(
      "ROLLBACK"
    );

    console.error(
      "❌ M-Pesa migration failed:",
      error
    );

    process.exitCode = 1;

  } finally {

    client.release();

    await pool.end();
  }
}

migrate();
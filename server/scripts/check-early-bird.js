require("dotenv").config({ path: "server/.env" });

const pool = require("../config/db");

async function run() {
  try {
    await pool.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS early_bird_expiry TIMESTAMP
    `);

    const result = await pool.query(`
      SELECT
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_name = 'events'
      AND column_name IN (
        'early_bird_enabled',
        'early_bird_single_price',
        'early_bird_expiry'
      )
      ORDER BY column_name
    `);

    console.table(result.rows);

  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

run();


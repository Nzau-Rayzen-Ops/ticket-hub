const pool = require("../config/db");

async function checkTable() {
  try {
    const result = await pool.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'mpesa_transactions'
      ORDER BY ordinal_position
    `);

    console.log("");
    console.log("========================================");
    console.log("mpesa_transactions schema");
    console.log("========================================");

    console.table(result.rows);

  } catch (error) {

    console.error(
      "❌ Failed to inspect M-Pesa table:"
    );

    console.error(error);

    process.exitCode = 1;

  } finally {

    await pool.end();

  }
}

checkTable();